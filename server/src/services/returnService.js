import { Return } from '../models/Return.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { processRefund } from './paymentService.js';
import { logAudit } from './auditService.js';
import { AppError } from '../shared/errors.js';

function generateReturnNumber() {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RET-${dateStr}-${rand}`;
}

export async function createReturnRequest({ orderId, items, notes = '', actor = null, req = null }) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  if (order.orderStatus !== 'completed') {
    throw new AppError('Returns can only be requested for completed orders', 400, 'ORDER_NOT_COMPLETED');
  }

  if (!items || items.length === 0) {
    throw new AppError('Must specify at least one item to return', 400, 'NO_ITEMS');
  }

  // Validate items against order items
  const orderItemMap = new Map(order.items.map((i) => [i.productId.toString(), i]));
  const returnItems = [];
  let calculatedRefund = 0;

  for (const item of items) {
    const orderItem = orderItemMap.get(String(item.productId));
    if (!orderItem) {
      throw new AppError(`Item ${item.productId} was not part of this order`, 400, 'ITEM_NOT_IN_ORDER');
    }
    if (item.quantity <= 0 || item.quantity > orderItem.quantity) {
      throw new AppError(`Invalid return quantity for ${orderItem.productName}`, 400, 'INVALID_QUANTITY');
    }

    const itemTotal = orderItem.unitPrice * item.quantity;
    calculatedRefund += itemTotal;

    returnItems.push({
      productId: orderItem.productId,
      sku: orderItem.sku,
      productName: orderItem.productName,
      quantity: item.quantity,
      unitPrice: orderItem.unitPrice,
      reason: item.reason || 'customer_request',
      disposition: 'pending_inspection',
      dispositionNotes: ''
    });
  }

  const returnNumber = generateReturnNumber();
  const ret = await Return.create({
    returnNumber,
    orderId: order._id,
    orderNumber: order.orderNumber,
    items: returnItems,
    totalRefundAmount: calculatedRefund,
    status: 'requested',
    notes
  });

  await logAudit({
    req,
    action: 'return.created',
    entityType: 'Return',
    entityId: ret._id,
    after: { returnNumber, orderNumber: order.orderNumber, totalRefundAmount: calculatedRefund },
    actor
  });

  return ret;
}

export async function processReturnInspection({
  returnId,
  itemDispositions, // array of { itemId, disposition, dispositionNotes }
  issueRefund = false,
  notes = '',
  actor = null,
  req = null
}) {
  const ret = await Return.findById(returnId);
  if (!ret) throw new AppError('Return request not found', 404, 'NOT_FOUND');

  if (ret.status === 'completed' || ret.status === 'rejected') {
    throw new AppError(`Return is already ${ret.status}`, 400, 'ALREADY_PROCESSED');
  }

  const order = await Order.findById(ret.orderId);

  // Apply dispositions to return items
  for (const disp of itemDispositions) {
    const item = ret.items.id(disp.itemId);
    if (!item) continue;

    item.disposition = disp.disposition;
    item.dispositionNotes = disp.dispositionNotes || '';

    // If restock permitted, safely return quantity to available inventory and log movement!
    if (disp.disposition === 'restock') {
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
          reason: 'return_restock',
          referenceType: 'return',
          referenceId: ret.returnNumber,
          notes: `Restocked inspected item from Return ${ret.returnNumber}`,
          actorId: actor?._id,
          actorName: actor?.name || 'Inspector'
        });
      }
    } else if (disp.disposition === 'damaged_writeoff') {
      // Record write-off movement for accounting
      await StockMovement.create({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        change: 0,
        previousOnHand: 0,
        newOnHand: 0,
        reason: 'damaged',
        referenceType: 'return',
        referenceId: ret.returnNumber,
        notes: `Damaged item written off from Return ${ret.returnNumber}: ${disp.dispositionNotes || ''}`,
        actorId: actor?._id,
        actorName: actor?.name || 'Inspector'
      });
    }
  }

  ret.status = 'completed';
  ret.notes = notes || ret.notes;
  ret.inspectedBy = {
    id: actor?._id,
    name: actor?.name || 'Staff'
  };
  await ret.save();

  // If refund requested and order was paid with an associated payment
  if (issueRefund && order && order.paymentId && ret.totalRefundAmount > 0) {
    try {
      await processRefund({
        paymentId: order.paymentId,
        refundAmount: ret.totalRefundAmount,
        reason: `Return ${ret.returnNumber} processed`,
        actor,
        req
      });
    } catch (refErr) {
      console.warn('Refund execution warning:', refErr.message);
    }
  }

  await logAudit({
    req,
    action: 'return.inspected_completed',
    entityType: 'Return',
    entityId: ret._id,
    after: { returnNumber: ret.returnNumber, status: 'completed' },
    actor
  });

  return ret;
}
