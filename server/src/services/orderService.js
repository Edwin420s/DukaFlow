import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { calculateAuthoritativeTotals } from './pricingService.js';
import { reserveStock, releaseStockReservation } from './stockService.js';
import { createNotification } from './notificationService.js';
import { logAudit } from './auditService.js';
import { AppError } from '../shared/errors.js';

function generateOrderNumber() {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${rand}`;
}

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'rejected'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'dispatched', 'completed', 'cancelled'],
  ready_for_pickup: ['completed', 'cancelled'],
  dispatched: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: []
};

export async function createOrder({
  customerType = 'guest',
  customerId = null,
  customerName,
  customerEmail = '',
  customerPhone,
  fulfilmentType,
  deliveryAddress = {},
  items,
  couponCode = '',
  paymentMethod,
  notes = '',
  actor = null,
  req = null
}) {
  if (!items || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400, 'EMPTY_CART');
  }

  if (!customerName || !customerPhone) {
    throw new AppError('Customer name and phone number are required', 400, 'MISSING_CUSTOMER_INFO');
  }

  if (fulfilmentType === 'delivery' && !deliveryAddress.street) {
    throw new AppError('Delivery street address is required for doorstep delivery', 400, 'MISSING_ADDRESS');
  }

  // 1. Authoritative server calculation of prices, stock checks, tax, coupons, delivery
  const totals = await calculateAuthoritativeTotals({
    items,
    couponCode,
    fulfilmentType,
    deliveryZoneName: deliveryAddress.zone || ''
  });

  // 2. Reserve stock atomically for all items
  const reservedItems = [];
  try {
    for (const item of totals.items) {
      await reserveStock(item.productId, item.quantity);
      reservedItems.push(item);
    }
  } catch (err) {
    // If any item reservation fails, rollback all previous reservations
    for (const resItem of reservedItems) {
      await releaseStockReservation(resItem.productId, resItem.quantity);
    }
    throw err;
  }

  // 3. Increment coupon usage if used
  if (totals.appliedCoupon) {
    totals.appliedCoupon.usageCount = (totals.appliedCoupon.usageCount || 0) + 1;
    await totals.appliedCoupon.save();
  }

  // 4. Create Order document
  const orderNumber = generateOrderNumber();
  const order = await Order.create({
    orderNumber,
    customerType,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    fulfilmentType,
    deliveryAddress: {
      street: deliveryAddress.street || '',
      city: deliveryAddress.city || 'Nairobi',
      zone: deliveryAddress.zone || '',
      instructions: deliveryAddress.instructions || ''
    },
    items: totals.items,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    couponCode: totals.couponCode,
    taxTotal: totals.taxTotal,
    deliveryFee: totals.deliveryFee,
    grandTotal: totals.grandTotal,
    orderStatus: 'pending',
    fulfilmentStatus: 'unfulfilled',
    paymentStatus: 'unpaid',
    paymentMethod,
    notes,
    timeline: [
      {
        status: 'Order Placed',
        note: `Order created via ${customerType} checkout. Fulfilment: ${fulfilmentType}. Payment: ${paymentMethod}.`,
        actor: actor?.name || customerName
      }
    ]
  });

  // 5. Update or create Customer CRM profile
  try {
    let customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      customer = await Customer.create({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: deliveryAddress.street || '',
        totalOrders: 1,
        totalSpend: totals.grandTotal
      });
    } else {
      customer.totalOrders += 1;
      customer.totalSpend += totals.grandTotal;
      if (!customer.email && customerEmail) customer.email = customerEmail;
      await customer.save();
    }
  } catch (custErr) {
    console.warn('Customer profile sync warning:', custErr.message);
  }

  // 6. Notifications & Audit
  await createNotification({
    title: 'New Order Received',
    message: `Order ${orderNumber} placed for KES ${(totals.grandTotal / 100).toFixed(2)} (${fulfilmentType}).`,
    type: 'order',
    severity: 'info',
    link: `/orders`
  });

  await logAudit({
    req,
    action: 'order.created',
    entityType: 'Order',
    entityId: order._id,
    after: { orderNumber, grandTotal: totals.grandTotal, itemsCount: totals.items.length },
    actor
  });

  return order;
}

export async function transitionOrderStatus({ orderId, newStatus, note = '', actor = null, req = null }) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  const currentStatus = order.orderStatus;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition order status from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'None'}`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  order.orderStatus = newStatus;

  // Sync fulfilment status where appropriate
  if (newStatus === 'preparing') {
    order.fulfilmentStatus = 'packing';
  } else if (newStatus === 'ready_for_pickup') {
    order.fulfilmentStatus = 'ready';
  } else if (newStatus === 'dispatched') {
    order.fulfilmentStatus = 'dispatched';
  } else if (newStatus === 'completed') {
    order.fulfilmentStatus = order.fulfilmentType === 'delivery' ? 'delivered' : 'collected';
  }

  // Handle cancellation: return stock
  if (newStatus === 'cancelled') {
    if (order.paymentStatus === 'paid') {
      // Stock was committed: restore onHand and record movement
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const prev = product.onHand;
          product.onHand += item.quantity;
          await product.save();
          await StockMovement.create({
            productId: product._id,
            productName: product.name,
            sku: product.sku,
            change: item.quantity,
            previousOnHand: prev,
            newOnHand: product.onHand,
            reason: 'order_cancel',
            referenceType: 'order',
            referenceId: order.orderNumber,
            notes: `Restored stock on order cancellation: ${note}`,
            actorId: actor?._id,
            actorName: actor?.name || 'Staff'
          });
        }
      }
    } else {
      // Stock was only reserved: release reservations
      for (const item of order.items) {
        await releaseStockReservation(item.productId, item.quantity);
      }
    }
  }

  order.timeline.push({
    status: `Status changed to ${newStatus}`,
    note: note || `Order updated by ${actor?.name || 'Staff'}`,
    actor: actor?.name || 'Staff'
  });

  await order.save();

  await logAudit({
    req,
    action: 'order.status_transition',
    entityType: 'Order',
    entityId: order._id,
    before: { orderStatus: currentStatus },
    after: { orderStatus: newStatus, note },
    actor
  });

  return order;
}
