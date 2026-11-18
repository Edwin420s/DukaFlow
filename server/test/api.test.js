import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Coupon } from '../src/models/Coupon.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { StockMovement } from '../src/models/StockMovement.js';
import { Return } from '../src/models/Return.js';
import { hashPassword, generateAccessToken, comparePassword } from '../src/services/authService.js';
import { reserveStock, releaseStockReservation, commitStockReservation, adjustStock } from '../src/services/stockService.js';
import { calculateAuthoritativeTotals } from '../src/services/pricingService.js';
import { createOrder, transitionOrderStatus } from '../src/services/orderService.js';
import { recordCashPayment, processSimulatedPayment, handleMpesaCallback, processRefund } from '../src/services/paymentService.js';
import { createReturnRequest, processReturnInspection } from '../src/services/returnService.js';

test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await disconnectDatabase();
});

test('1. Authentication & Password Security', async (t) => {
  await t.test('hashes and securely verifies passwords', async () => {
    const raw = 'SecretPassword123!';
    const hash = await hashPassword(raw);
    assert.ok(hash !== raw);
    assert.equal(await comparePassword(raw, hash), true);
    assert.equal(await comparePassword('WrongPassword', hash), false);
  });

  await t.test('generates valid access tokens with user claims', async () => {
    const mockUser = {
      _id: '507f191e810c19729de860ea',
      email: 'test@dukaflow.co.ke',
      role: 'owner',
      name: 'Owner Admin',
      permissions: ['*']
    };
    const token = await generateAccessToken(mockUser);
    assert.ok(typeof token === 'string' && token.length > 20);
  });
});

test('2. Inventory Domain Invariants & Stock Service', async (t) => {
  let product;

  t.beforeEach(async () => {
    let cat = await Category.findOne({ slug: 'test-cat' });
    if (!cat) {
      cat = await Category.create({ name: 'Test Cat', slug: 'test-cat' });
    }

    await Product.deleteMany({ sku: 'TEST-SKU-001' });
    product = await Product.create({
      name: 'Test Packet 1kg',
      slug: 'test-packet-1kg',
      sku: 'TEST-SKU-001',
      categoryId: cat._id,
      categoryName: cat.name,
      costPrice: 8000,
      sellingPrice: 10000,
      onHand: 10,
      reserved: 0,
      lowStockThreshold: 3
    });
  });

  await t.test('Available stock equals onHand minus reserved', async () => {
    assert.equal(product.available, 10);
    assert.equal(product.isLowStock, false);

    product.reserved = 8;
    assert.equal(product.available, 2);
    assert.equal(product.isLowStock, true);
  });

  await t.test('Atomically reserves stock and prevents overselling', async () => {
    // Reserve 6 units
    const updated = await reserveStock(product._id, 6);
    assert.equal(updated.reserved, 6);
    assert.equal(updated.available, 4);

    // Attempting to reserve 5 more when only 4 available must fail
    await assert.rejects(
      async () => {
        await reserveStock(product._id, 5);
      },
      { code: 'INSUFFICIENT_STOCK' }
    );
  });

  await t.test('Committing stock reservation creates immutable movement ledger', async () => {
    await reserveStock(product._id, 3);
    await commitStockReservation({
      productId: product._id,
      quantity: 3,
      orderNumber: 'ORD-TEST-01'
    });

    const refreshed = await Product.findById(product._id);
    assert.equal(refreshed.onHand, 7);
    assert.equal(refreshed.reserved, 0);

    const movement = await StockMovement.findOne({ referenceId: 'ORD-TEST-01' });
    assert.ok(movement);
    assert.equal(movement.change, -3);
    assert.equal(movement.previousOnHand, 10);
    assert.equal(movement.newOnHand, 7);
    assert.equal(movement.reason, 'order_sale');
  });

  await t.test('Manual stock adjustment requires reason and records movement', async () => {
    await adjustStock({
      productId: product._id,
      newOnHand: 15,
      reason: 'count_correction',
      notes: 'Physical count verified'
    });

    const refreshed = await Product.findById(product._id);
    assert.equal(refreshed.onHand, 15);

    const movement = await StockMovement.findOne({ productId: product._id, reason: 'count_correction' });
    assert.ok(movement);
    assert.equal(movement.change, 5);
  });
});

test('3. Authoritative Pricing, Taxes & Coupon Engine', async (t) => {
  let prod1, prod2, coupon;

  t.beforeEach(async () => {
    let cat = await Category.findOne({ slug: 'test-cat' });
    if (!cat) cat = await Category.create({ name: 'Test Cat', slug: 'test-cat' });

    await Product.deleteMany({ sku: { $in: ['P1', 'P2'] } });
    prod1 = await Product.create({
      name: 'Flour 2kg',
      slug: 'flour-2kg',
      sku: 'P1',
      categoryId: cat._id,
      costPrice: 15000,
      sellingPrice: 20000, // KES 200
      taxCategory: 'zero_rated',
      taxRate: 0,
      onHand: 20
    });

    prod2 = await Product.create({
      name: 'Tea Bags 100s',
      slug: 'tea-bags-100s',
      sku: 'P2',
      categoryId: cat._id,
      costPrice: 20000,
      sellingPrice: 30000, // KES 300
      taxCategory: 'standard',
      taxRate: 16,
      onHand: 20
    });

    await Coupon.deleteMany({ code: 'TEST10' });
    coupon = await Coupon.create({
      code: 'TEST10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 40000, // min KES 400
      isActive: true
    });
  });

  await t.test('Calculates authoritative subtotal, coupon discount, tax, and delivery', async () => {
    // 2 x Flour (40,000) + 1 x Tea (30,000) = Subtotal 70,000 cents (KES 700)
    const result = await calculateAuthoritativeTotals({
      items: [
        { productId: prod1._id.toString(), quantity: 2 },
        { productId: prod2._id.toString(), quantity: 1 }
      ],
      couponCode: 'TEST10',
      fulfilmentType: 'pickup'
    });

    assert.equal(result.subtotal, 70000);
    // 10% of 70,000 = 7,000 discount
    assert.equal(result.discountTotal, 7000);
    assert.equal(result.couponCode, 'TEST10');
    assert.equal(result.deliveryFee, 0);
    // Tea is standard 16% taxable: 30,000 minus proportional discount (3,000) = 27,000 * 16% = 4,320
    assert.equal(result.taxTotal, 4320);
    // Grand Total: (70,000 - 7,000) + 4,320 + 0 = 67,320 cents (KES 673.20)
    assert.equal(result.grandTotal, 67320);
  });

  await t.test('Rejects invalid or expired coupon codes', async () => {
    await assert.rejects(
      async () => {
        await calculateAuthoritativeTotals({
          items: [{ productId: prod1._id.toString(), quantity: 1 }],
          couponCode: 'NONEXISTENT'
        });
      },
      { code: 'INVALID_COUPON' }
    );
  });
});

test('4. Order Lifecycle & State Transitions', async (t) => {
  let prod, order;

  t.beforeEach(async () => {
    let cat = await Category.findOne({ slug: 'test-cat' });
    if (!cat) cat = await Category.create({ name: 'Test Cat', slug: 'test-cat' });

    await Product.deleteMany({ sku: 'ORDER-P1' });
    prod = await Product.create({
      name: 'Cooking Oil 1L',
      slug: 'cooking-oil-1l',
      sku: 'ORDER-P1',
      categoryId: cat._id,
      costPrice: 25000,
      sellingPrice: 30000,
      onHand: 10,
      reserved: 0
    });

    order = await createOrder({
      customerName: 'Juma Mwangi',
      customerPhone: '0712345678',
      fulfilmentType: 'pickup',
      items: [{ productId: prod._id.toString(), quantity: 2 }],
      paymentMethod: 'cash'
    });
  });

  await t.test('Order creation atomically reserves stock', async () => {
    assert.ok(order.orderNumber.startsWith('ORD-'));
    assert.equal(order.orderStatus, 'pending');
    assert.equal(order.grandTotal, 69600); // 60,000 + 16% VAT (9,600)

    const refreshedProd = await Product.findById(prod._id);
    assert.equal(refreshedProd.reserved, 2);
    assert.equal(refreshedProd.available, 8);
  });

  await t.test('Permitted lifecycle status transitions succeed', async () => {
    const confirmed = await transitionOrderStatus({
      orderId: order._id,
      newStatus: 'confirmed',
      note: 'Order confirmed by cashier'
    });
    assert.equal(confirmed.orderStatus, 'confirmed');

    const preparing = await transitionOrderStatus({
      orderId: order._id,
      newStatus: 'preparing'
    });
    assert.equal(preparing.orderStatus, 'preparing');
    assert.equal(preparing.fulfilmentStatus, 'packing');
  });

  await t.test('Disallowed status transitions are rejected', async () => {
    // Cannot skip straight from pending to completed
    await assert.rejects(
      async () => {
        await transitionOrderStatus({
          orderId: order._id,
          newStatus: 'completed'
        });
      },
      { code: 'INVALID_STATUS_TRANSITION' }
    );
  });

  await t.test('Order cancellation releases stock reservation', async () => {
    await transitionOrderStatus({
      orderId: order._id,
      newStatus: 'cancelled',
      note: 'Customer changed mind'
    });

    const refreshedProd = await Product.findById(prod._id);
    assert.equal(refreshedProd.reserved, 0);
    assert.equal(refreshedProd.available, 10);
  });
});

test('5. Payment Processing & M-Pesa Idempotency', async (t) => {
  let prod, order;

  t.beforeEach(async () => {
    let cat = await Category.findOne({ slug: 'test-cat' });
    if (!cat) cat = await Category.create({ name: 'Test Cat', slug: 'test-cat' });

    await Product.deleteMany({ sku: 'PAY-P1' });
    await Order.deleteMany({ customerPhone: '0722334455' });
    prod = await Product.create({
      name: 'Milk 500ml',
      slug: 'milk-500ml',
      sku: 'PAY-P1',
      categoryId: cat._id,
      costPrice: 5000,
      sellingPrice: 6000,
      onHand: 15,
      reserved: 0
    });

    order = await createOrder({
      customerName: 'Amina Ali',
      customerPhone: '0722334455',
      fulfilmentType: 'pickup',
      items: [{ productId: prod._id.toString(), quantity: 3 }],
      paymentMethod: 'cash'
    });
  });

  await t.test('Cash payment records payment and calculates change correctly', async () => {
    // Grand total: 3 x 6000 = 18,000 + 16% VAT (2,880) = 20,880 cents
    // Tender 25,000 cents (KES 250)
    const result = await recordCashPayment({
      orderId: order._id,
      tenderedAmount: 25000,
      cashier: { _id: '507f191e810c19729de860ea', name: 'Cashier Test' }
    });

    assert.equal(result.payment.status, 'paid');
    assert.equal(result.changeAmount, 25000 - order.grandTotal);
    assert.equal(result.order.paymentStatus, 'paid');

    // Stock committed: onHand decremented from 15 to 12
    const refreshedProd = await Product.findById(prod._id);
    assert.equal(refreshedProd.onHand, 12);
    assert.equal(refreshedProd.reserved, 0);
  });

  await t.test('M-Pesa callback is strictly idempotent', async () => {
    const checkoutRequestId = `ws_TEST_${Date.now()}`;
    const payment = await Payment.create({
      paymentNumber: `PAY-TEST-${Date.now()}`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.grandTotal,
      currency: 'KES',
      method: 'mpesa',
      status: 'pending',
      mpesaDetails: {
        checkoutRequestId,
        phoneNumber: '254722334455'
      }
    });

    const callbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MR_TEST',
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: order.grandTotal / 100 },
              { Name: 'MpesaReceiptNumber', Value: 'QWE1234567' }
            ]
          }
        }
      }
    };

    // First execution: processes callback and confirms payment
    const firstResult = await handleMpesaCallback({ callbackBody: callbackPayload });
    assert.equal(firstResult.status, 'paid');

    const confirmedPay = await Payment.findById(payment._id);
    assert.equal(confirmedPay.status, 'paid');
    assert.equal(confirmedPay.transactionReference, 'QWE1234567');

    // Duplicate callback: must be acknowledged cleanly without re-executing stock commits!
    const secondResult = await handleMpesaCallback({ callbackBody: callbackPayload });
    assert.equal(secondResult.acknowledged, true);
    assert.ok(secondResult.note.includes('Duplicate callback ignored'));
  });

  await t.test('Refund processing enforces limits', async () => {
    const pay = await Payment.create({
      paymentNumber: `PAY-REF-${Date.now()}`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: 10000,
      currency: 'KES',
      method: 'cash',
      status: 'paid'
    });

    // Refund 4,000 cents
    const res1 = await processRefund({
      paymentId: pay._id,
      refundAmount: 4000,
      reason: 'Partial return'
    });
    assert.equal(res1.payment.status, 'partially_refunded');
    assert.equal(res1.payment.refundAmount, 4000);

    // Attempting to refund 7,000 more (exceeding 10,000 total) must fail
    await assert.rejects(
      async () => {
        await processRefund({
          paymentId: pay._id,
          refundAmount: 7000
        });
      },
      { code: 'EXCEEDS_PAYMENT' }
    );
  });
});

test('6. Returns, Inspections & Inventory Restocking', async (t) => {
  let prod, order;

  t.beforeEach(async () => {
    let cat = await Category.findOne({ slug: 'test-cat' });
    if (!cat) cat = await Category.create({ name: 'Test Cat', slug: 'test-cat' });

    await Product.deleteMany({ sku: 'RET-P1' });
    prod = await Product.create({
      name: 'Washing Powder',
      slug: 'washing-powder',
      sku: 'RET-P1',
      categoryId: cat._id,
      costPrice: 20000,
      sellingPrice: 25000,
      onHand: 10,
      reserved: 0
    });

    order = await createOrder({
      customerName: 'Grace Wairimu',
      customerPhone: '0711223344',
      fulfilmentType: 'pickup',
      items: [{ productId: prod._id.toString(), quantity: 2 }],
      paymentMethod: 'cash'
    });

    // Pay and complete the order
    await recordCashPayment({ orderId: order._id, tenderedAmount: 100000 });
    await transitionOrderStatus({ orderId: order._id, newStatus: 'preparing' });
    await transitionOrderStatus({ orderId: order._id, newStatus: 'ready_for_pickup' });
    await transitionOrderStatus({ orderId: order._id, newStatus: 'completed' });
  });

  await t.test('Inspected items with restock disposition increment onHand inventory', async () => {
    // Current onHand is 8 (10 initial - 2 sold)
    const prodBefore = await Product.findById(prod._id);
    assert.equal(prodBefore.onHand, 8);

    const ret = await createReturnRequest({
      orderId: order._id,
      items: [{ productId: prod._id.toString(), quantity: 1, reason: 'customer_request' }]
    });

    assert.equal(ret.status, 'requested');

    // Inspect and approve restock
    const completedReturn = await processReturnInspection({
      returnId: ret._id,
      itemDispositions: [
        {
          itemId: ret.items[0]._id.toString(),
          disposition: 'restock',
          dispositionNotes: 'Item unopened and seal intact'
        }
      ]
    });

    assert.equal(completedReturn.status, 'completed');

    // Verify onHand increased by 1 to 9
    const prodAfter = await Product.findById(prod._id);
    assert.equal(prodAfter.onHand, 9);

    // Verify stock movement ledger entry
    const movement = await StockMovement.findOne({ referenceId: ret.returnNumber });
    assert.ok(movement);
    assert.equal(movement.reason, 'return_restock');
    assert.equal(movement.change, 1);
  });
});
