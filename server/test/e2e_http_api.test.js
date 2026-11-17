import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Coupon } from '../src/models/Coupon.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { Supplier } from '../src/models/Supplier.js';
import { PurchaseOrder } from '../src/models/PurchaseOrder.js';
import { Return } from '../src/models/Return.js';
import { StockMovement } from '../src/models/StockMovement.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { hashPassword } from '../src/services/authService.js';

let server;
let baseUrl;
let ownerToken;
let cashierToken;
let testCategory;
let testProduct;

test.before(async () => {
  await connectDatabase();

  // Start HTTP server on dynamic port
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  // Seed test users
  await User.deleteMany({ email: { $in: ['e2e_owner@dukaflow.co.ke', 'e2e_cashier@dukaflow.co.ke'] } });

  const ownerHash = await hashPassword('TestOwner123!');
  await User.create({
    name: 'E2E Owner',
    email: 'e2e_owner@dukaflow.co.ke',
    passwordHash: ownerHash,
    role: 'owner',
    status: 'active'
  });

  const cashierHash = await hashPassword('TestCashier123!');
  await User.create({
    name: 'E2E Cashier',
    email: 'e2e_cashier@dukaflow.co.ke',
    passwordHash: cashierHash,
    role: 'cashier',
    status: 'active'
  });

  // Seed test catalog
  await Category.deleteMany({ slug: 'e2e-staples' });
  testCategory = await Category.create({
    name: 'E2E Staples',
    slug: 'e2e-staples',
    description: 'Staple dry goods for testing'
  });

  await Product.deleteMany({ sku: 'E2E-MAIZE-2KG' });
  testProduct = await Product.create({
    name: 'E2E Maize Flour 2kg',
    slug: 'e2e-maize-flour-2kg',
    sku: 'E2E-MAIZE-2KG',
    categoryId: testCategory._id,
    categoryName: testCategory.name,
    costPrice: 16000, // KSh 160.00
    sellingPrice: 22000, // KSh 220.00
    onHand: 50,
    reserved: 0,
    unit: '2kg bag',
    lowStockThreshold: 10,
    taxCategory: 'zero_rated'
  });
});

// Helper for authenticated HTTP requests
async function http(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

test('HTTP API End-to-End Test Suite', async (t) => {
  await t.test('1. Health & Readiness endpoints return 200', async () => {
    const health = await http('GET', '/health');
    assert.equal(health.status, 200);
    assert.equal(health.data.status, 'ok');

    const ready = await http('GET', '/readiness');
    assert.equal(ready.status, 200);
    assert.equal(ready.data.ready, true);
  });

  await t.test('2. Authentication Flow (Login, Claims & Me)', async () => {
    // Invalid login
    const badLogin = await http('POST', '/auth/login', {
      email: 'e2e_owner@dukaflow.co.ke',
      password: 'WrongPassword'
    });
    assert.equal(badLogin.status, 401);

    // Valid owner login
    const ownerRes = await http('POST', '/auth/login', {
      email: 'e2e_owner@dukaflow.co.ke',
      password: 'TestOwner123!'
    });
    assert.equal(ownerRes.status, 200);
    assert.ok(ownerRes.data.accessToken);
    assert.equal(ownerRes.data.user.role, 'owner');
    ownerToken = ownerRes.data.accessToken;

    // Valid cashier login
    const cashierRes = await http('POST', '/auth/login', {
      email: 'e2e_cashier@dukaflow.co.ke',
      password: 'TestCashier123!'
    });
    assert.equal(cashierRes.status, 200);
    cashierToken = cashierRes.data.accessToken;

    // Verify /auth/me with Bearer token
    const meRes = await http('GET', '/auth/me', null, ownerToken);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.user.email, 'e2e_owner@dukaflow.co.ke');
  });

  await t.test('3. Storefront Journey (Browse, Calculate, Place Order, M-Pesa STK)', async () => {
    // 3a. Browse storefront catalog
    const shopRes = await http('GET', '/storefront/shop');
    assert.equal(shopRes.status, 200);
    assert.ok(shopRes.data.shop);

    const prodsRes = await http('GET', `/storefront/products?category=${testCategory.slug}`);
    assert.equal(prodsRes.status, 200);
    const found = prodsRes.data.products.find((p) => p.sku === 'E2E-MAIZE-2KG');
    assert.ok(found);
    assert.equal(found.sellingPrice, 22000);

    // 3b. Setup a test coupon
    await Coupon.deleteMany({ code: 'E2ESAVE10' });
    await Coupon.create({
      code: 'E2ESAVE10',
      description: '10% discount for E2E testing',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 20000, // min KSh 200.00
      maxDiscount: 50000,
      isActive: true,
      validFrom: new Date('2020-01-01'),
      validUntil: new Date('2030-01-01')
    });

    // 3c. Calculate cart with coupon and delivery
    const calcRes = await http('POST', '/storefront/calculate', {
      items: [{ productId: testProduct._id.toString(), quantity: 2 }],
      couponCode: 'E2ESAVE10',
      fulfilmentType: 'delivery',
      deliveryZoneName: 'Nairobi Westlands'
    });
    assert.equal(calcRes.status, 200);
    const totals = calcRes.data;
    assert.equal(totals.subtotal, 44000); // 2 * 22000
    assert.equal(totals.discountTotal, 4400); // 10% of 44000
    assert.ok(totals.grandTotal > 0);

    // 3d. Place customer order on storefront
    const orderRes = await http('POST', '/storefront/orders', {
      customerName: 'Mary Otieno',
      customerPhone: '0722001122',
      customerEmail: 'mary@example.com',
      fulfilmentType: 'delivery',
      deliveryAddress: {
        street: 'Kariokor Close Apt 2B',
        zone: 'Nairobi Westlands',
        instructions: 'Call upon arrival'
      },
      items: [{ productId: testProduct._id.toString(), quantity: 2 }],
      couponCode: 'E2ESAVE10',
      paymentMethod: 'mpesa'
    });

    assert.equal(orderRes.status, 201);
    const order = orderRes.data.order;
    assert.ok(order._id);
    assert.equal(order.orderStatus, 'pending');
    assert.equal(order.paymentStatus, 'unpaid');

    // 3e. Check stock reserved (onHand: 50, reserved: 2, available: 48)
    const prodAfterReserve = await Product.findById(testProduct._id);
    assert.equal(prodAfterReserve.reserved, 2);
    assert.equal(prodAfterReserve.onHand, 50);

    // 3f. Trigger M-Pesa STK push
    const mpesaRes = await http('POST', '/payments/mpesa/initiate', {
      orderId: order._id,
      phoneNumber: '254722001122'
    });
    assert.equal(mpesaRes.status, 200);
    assert.ok(mpesaRes.data.checkoutRequestId);

    // 3g. Simulate Customer entering M-Pesa PIN on phone
    const simRes = await http('POST', '/payments/mpesa/simulate-success', {
      checkoutRequestId: mpesaRes.data.checkoutRequestId
    });
    assert.equal(simRes.status, 200);
    assert.equal(simRes.data.success, true);

    // 3h. Customer tracks live order status by orderNumber
    const trackRes = await http('GET', `/storefront/orders/${order.orderNumber}`);
    assert.equal(trackRes.status, 200);
    assert.equal(trackRes.data.order.paymentStatus, 'paid');
    assert.equal(trackRes.data.order.orderStatus, 'confirmed');

    // Verify stock is now committed (onHand decremented to 48, reserved 0)
    const prodAfterCommit = await Product.findById(testProduct._id);
    assert.equal(prodAfterCommit.onHand, 48);
    assert.equal(prodAfterCommit.reserved, 0);
  });

  await t.test('4. POS Cash Checkout Journey', async () => {
    // 4a. Cashier creates quick in-store sale
    const createOrderRes = await http(
      'POST',
      '/orders',
      {
        customerName: 'Counter Cash Customer',
        customerPhone: '0700123456',
        fulfilmentType: 'pickup',
        items: [{ productId: testProduct._id.toString(), quantity: 3 }],
        paymentMethod: 'cash'
      },
      cashierToken
    );
    assert.equal(createOrderRes.status, 201);
    const posOrder = createOrderRes.data.order;
    assert.equal(posOrder.grandTotal, 66000); // 3 * 22000

    // 4b. Cashier tenders KES 1,000 note (100,000 cents)
    const cashRes = await http(
      'POST',
      '/payments/cash',
      {
        orderId: posOrder._id,
        tenderedAmount: 100000
      },
      cashierToken
    );
    assert.equal(cashRes.status, 200);
    assert.equal(cashRes.data.payment.status, 'paid');
    assert.equal(cashRes.data.changeAmount, 34000); // KSh 340.00 change

    // 4c. Cashier marks completed handover
    const updateRes = await http(
      'PATCH',
      `/orders/${posOrder._id}/status`,
      {
        status: 'completed',
        notes: 'Handed over at POS counter'
      },
      cashierToken
    );
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.order.orderStatus, 'completed');
  });

  await t.test('5. Backoffice Inventory Adjustments & Ledger Audit', async () => {
    const prodBefore = await Product.findById(testProduct._id);
    const onHandBefore = prodBefore.onHand;

    // 5a. Manual stock adjustment (+5 bags, reason: 'count_correction')
    const adjustRes = await http(
      'POST',
      '/inventory/adjust',
      {
        productId: testProduct._id.toString(),
        newOnHand: onHandBefore + 5,
        reason: 'count_correction',
        notes: 'Found unopened carton during shelf count'
      },
      ownerToken
    );
    assert.equal(adjustRes.status, 200);
    assert.equal(adjustRes.data.product.onHand, onHandBefore + 5);

    // 5b. Verify movement ledger
    const movementsRes = await http('GET', `/inventory/movements?productId=${testProduct._id}`, null, ownerToken);
    assert.equal(movementsRes.status, 200);
    assert.ok(movementsRes.data.movements.length > 0);
    const latest = movementsRes.data.movements[0];
    assert.equal(latest.reason, 'count_correction');
    assert.equal(latest.change, 5);
  });

  await t.test('6. Suppliers, Purchase Orders & Receiving Goods', async () => {
    // 6a. Create supplier
    const supRes = await http(
      'POST',
      '/suppliers',
      {
        name: 'E2E Milling Mills Ltd',
        contactPerson: 'David Kiptoo',
        phone: '0711556677',
        email: 'sales@e2emilling.co.ke',
        leadTimeDays: 2
      },
      ownerToken
    );
    assert.equal(supRes.status, 201);
    const supplier = supRes.data.supplier;

    // 6b. Create PO
    const poRes = await http(
      'POST',
      '/purchase-orders',
      {
        supplierId: supplier._id,
        expectedDate: new Date('2026-12-01').toISOString(),
        items: [
          {
            productId: testProduct._id.toString(),
            orderedQuantity: 20,
            unitCost: 15500
          }
        ]
      },
      ownerToken
    );
    assert.equal(poRes.status, 201);
    const po = poRes.data.purchaseOrder;
    assert.equal(po.status, 'ordered');

    // 6c. Receive goods against the PO
    const receiveRes = await http(
      'POST',
      `/purchase-orders/${po._id}/receive`,
      {
        items: [
          {
            productId: testProduct._id.toString(),
            receivedQuantity: 20
          }
        ]
      },
      ownerToken
    );
    assert.equal(receiveRes.status, 200);
    assert.equal(receiveRes.data.purchaseOrder.status, 'received');

    // Verify inventory incremented by 20
    const prodAfterReceive = await Product.findById(testProduct._id);
    assert.ok(prodAfterReceive.onHand >= 20);
  });

  await t.test('7. Reports & Analytics (Dashboard KPIs, Sales, Valuation, CSV)', async () => {
    // 7a. Dashboard metrics
    const dashRes = await http('GET', '/reports/dashboard', null, ownerToken);
    assert.equal(dashRes.status, 200);
    assert.ok(typeof dashRes.data.todaySales === 'number');
    assert.ok(typeof dashRes.data.lowStockCount === 'number');

    // 7b. Sales report with top products and daily trend
    const salesRes = await http('GET', '/reports/sales', null, ownerToken);
    assert.equal(salesRes.status, 200);
    assert.ok(Array.isArray(salesRes.data.topProducts));
    assert.ok(Array.isArray(salesRes.data.dailySales));

    // 7c. Inventory valuation
    const valRes = await http('GET', '/reports/inventory-valuation', null, ownerToken);
    assert.equal(valRes.status, 200);
    assert.ok(valRes.data.totalCostValue >= 0);
    assert.ok(valRes.data.totalRetailValue >= 0);

    // 7d. CSV export download
    const csvRes = await fetch(`${baseUrl}/reports/sales/csv`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert.equal(csvRes.status, 200);
    assert.equal(csvRes.headers.get('content-type')?.includes('text/csv'), true);
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('Order Number'));
  });

  await t.test('8. RBAC Security: Cashier restricted from Owner endpoints', async () => {
    // Cashier attempting to update shop settings must be rejected (403)
    const forbiddenRes = await http(
      'PUT',
      '/shop',
      { name: 'Hacked Shop Name' },
      cashierToken
    );
    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenRes.data.error.code, 'FORBIDDEN');
  });

  await t.test('9. Audit Trail Logging', async () => {
    const auditRes = await http('GET', '/audit-logs?limit=10', null, ownerToken);
    assert.equal(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.data.logs));
    assert.ok(auditRes.data.logs.length > 0);
    // Verified audit log captures actor, action, timestamp
    const firstLog = auditRes.data.logs[0];
    assert.ok(firstLog.action);
    assert.ok(firstLog.actorName || firstLog.actorEmail);
  });
});

test.after(async () => {
  if (server) {
    try {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    } catch {}
  }
  await disconnectDatabase();
});
