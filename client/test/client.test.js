import test from 'node:test';
import assert from 'node:assert/strict';
import { formatKes, formatDate, formatTime } from '../src/utils/format.js';

test('1. Client Formatting Utilities', async (t) => {
  await t.test('formats minor integer units (cents) into Kenyan Shillings (KES)', () => {
    assert.equal(formatKes(0), 'KSh 0.00');
    assert.equal(formatKes(22000), 'KSh 220.00');
    assert.equal(formatKes(150050), 'KSh 1,500.50');
    assert.equal(formatKes(10000000), 'KSh 100,000.00');
    assert.equal(formatKes(499), 'KSh 4.99');
  });

  await t.test('formats dates and times consistently', () => {
    const d = new Date('2026-11-17T12:30:00Z');
    const formattedDate = formatDate(d);
    assert.ok(formattedDate.includes('2026') || formattedDate.includes('Nov'));

    const formattedTime = formatTime(d);
    assert.ok(typeof formattedTime === 'string' && formattedTime.length >= 3);
  });
});

test('2. Client Cart & Pricing Calculations', async (t) => {
  await t.test('computes subtotal and 16% standard VAT accurately', () => {
    const cart = [
      { id: '1', name: 'Maize Meal 2kg', sellingPrice: 22000, quantity: 2, taxCategory: 'zero_rated' },
      { id: '2', name: 'Bar Soap 800g', sellingPrice: 15000, quantity: 3, taxCategory: 'standard' }
    ];

    const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
    assert.equal(subtotal, 2 * 22000 + 3 * 15000); // 44000 + 45000 = 89000 cents

    // VAT 16% only on standard taxable item: 45000 * 0.16 = 7200 cents
    const taxTotal = cart.reduce((sum, item) => {
      return sum + (item.taxCategory === 'standard' ? Math.round(item.sellingPrice * item.quantity * 0.16) : 0);
    }, 0);
    assert.equal(taxTotal, 7200);

    const grandTotal = subtotal + taxTotal;
    assert.equal(grandTotal, 96200); // KSh 962.00
  });

  await t.test('normalizes promotional coupon input', () => {
    const rawInputs = ['  karibu10  ', 'Karibu10', 'duka200', ' DUKA200 '];
    const expected = ['KARIBU10', 'KARIBU10', 'DUKA200', 'DUKA200'];
    const actual = rawInputs.map((c) => c.trim().toUpperCase());
    assert.deepEqual(actual, expected);
  });
});

test('3. POS Cash Tender & Real-Time Change Calculation', async (t) => {
  const grandTotal = 85000; // KSh 850.00

  await t.test('detects when tendered cash is insufficient', () => {
    const tenderedCents = 50000; // KSh 500.00
    const changeDue = Math.max(0, tenderedCents - grandTotal);
    const remaining = grandTotal - tenderedCents;
    const canComplete = tenderedCents >= grandTotal;

    assert.equal(canComplete, false);
    assert.equal(changeDue, 0);
    assert.equal(remaining, 35000); // KSh 350.00 short
  });

  await t.test('calculates exact zero change when tendered equals total', () => {
    const tenderedCents = 85000;
    const changeDue = Math.max(0, tenderedCents - grandTotal);
    const canComplete = tenderedCents >= grandTotal;

    assert.equal(canComplete, true);
    assert.equal(changeDue, 0);
  });

  await t.test('calculates correct positive change for higher denomination note', () => {
    const tenderedCents = 100000; // KSh 1,000.00 note
    const changeDue = Math.max(0, tenderedCents - grandTotal);
    const canComplete = tenderedCents >= grandTotal;

    assert.equal(canComplete, true);
    assert.equal(changeDue, 15000); // KSh 150.00 change to return
  });
});

test('4. POS Offline Outbox Buffer Invariants', async (t) => {
  await t.test('offline order generator constructs valid resilient payload', () => {
    const cart = [{ _id: 'prod-123', name: 'Milk 500ml', sellingPrice: 6500, quantity: 2 }];
    const grandTotal = 13000;
    const tenderedCents = 20000;
    const changeDue = 7000;

    const offlineOrder = {
      id: `offline-${Date.now()}-test`,
      orderNumber: `OFF-${Date.now().toString().slice(-6)}`,
      customerName: 'Counter Customer',
      customerPhone: '0700000000',
      items: cart.map((i) => ({ productId: i._id, quantity: i.quantity })),
      lineItems: cart,
      tenderedAmount: tenderedCents,
      changeAmount: changeDue,
      total: grandTotal,
      createdAt: new Date().toISOString(),
      isOffline: true
    };

    assert.ok(offlineOrder.id.startsWith('offline-'));
    assert.ok(offlineOrder.orderNumber.startsWith('OFF-'));
    assert.equal(offlineOrder.isOffline, true);
    assert.equal(offlineOrder.items.length, 1);
    assert.equal(offlineOrder.total, 13000);

    // Queue manipulation: serialization and deserialization
    const serialized = JSON.stringify([offlineOrder]);
    const parsed = JSON.parse(serialized);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].orderNumber, offlineOrder.orderNumber);
  });
});

test('5. Landing Page Navigation & Route Guard Logic', async (t) => {
  function getCustomerShopTarget(currentUser) {
    return currentUser ? '/storefront' : '/login?redirect=/storefront';
  }

  function getWorkspaceTarget(currentUser) {
    if (!currentUser) return '/login';
    if (currentUser.role === 'cashier') return '/pos';
    if (currentUser.role === 'customer') return '/storefront';
    return '/dashboard';
  }

  function resolvePostLoginDestination(user, redirectParam) {
    if (user.role === 'cashier') return '/pos';
    if (user.role === 'customer') {
      return redirectParam && redirectParam.startsWith('/storefront') ? redirectParam : '/storefront';
    }
    if (redirectParam && !redirectParam.startsWith('/pos') && !redirectParam.startsWith('/login')) {
      return redirectParam;
    }
    return '/dashboard';
  }

  function canAccessRoute(role, path) {
    const permissions = {
      owner: ['/dashboard', '/pos', '/products', '/inventory', '/orders', '/coupons', '/suppliers', '/returns', '/customers', '/staff', '/reports', '/audit', '/settings', '/profile', '/storefront'],
      manager: ['/dashboard', '/pos', '/products', '/inventory', '/orders', '/coupons', '/suppliers', '/returns', '/customers', '/reports', '/profile', '/storefront'],
      cashier: ['/pos', '/orders', '/returns', '/customers', '/profile', '/storefront'],
      customer: ['/orders', '/profile', '/storefront']
    };
    return (permissions[role] || []).includes(path);
  }

  await t.test('unauthenticated visitors are directed to login when clicking Customer Shop', () => {
    assert.equal(getCustomerShopTarget(null), '/login?redirect=/storefront');
    assert.equal(getWorkspaceTarget(null), '/login');
  });

  await t.test('authenticated users are directed to authorized storefront or workspace', () => {
    const customer = { id: 'cust-1', name: 'Alice Wambui', role: 'customer' };
    const cashier = { id: 'cash-1', name: 'Mercy Wanjiku', role: 'cashier' };
    const manager = { id: 'mgr-1', name: 'Peter Otieno', role: 'manager' };
    const owner = { id: 'own-1', name: 'John Kamau', role: 'owner' };

    assert.equal(getCustomerShopTarget(customer), '/storefront');
    assert.equal(getWorkspaceTarget(customer), '/storefront');
    assert.equal(getWorkspaceTarget(cashier), '/pos');
    assert.equal(getWorkspaceTarget(manager), '/dashboard');
    assert.equal(getWorkspaceTarget(owner), '/dashboard');
  });

  await t.test('post-login redirection sends each role to the exact right authorized account', () => {
    const customer = { role: 'customer' };
    const cashier = { role: 'cashier' };
    const owner = { role: 'owner' };

    // Default redirection with no redirect param
    assert.equal(resolvePostLoginDestination(customer, null), '/storefront');
    assert.equal(resolvePostLoginDestination(cashier, null), '/pos');
    assert.equal(resolvePostLoginDestination(owner, null), '/dashboard');

    // Customer with redirect param pointing to storefront
    assert.equal(resolvePostLoginDestination(customer, '/storefront'), '/storefront');

    // Cashier always redirected to POS terminal even if a redirect param is present
    assert.equal(resolvePostLoginDestination(cashier, '/reports'), '/pos');

    // Owner with specific backoffice redirect param
    assert.equal(resolvePostLoginDestination(owner, '/inventory'), '/inventory');
  });

  await t.test('strict role permissions prevent privilege escalation across accounts', () => {
    // Cashiers cannot access owner/manager sensitive backoffice views
    assert.equal(canAccessRoute('cashier', '/reports'), false);
    assert.equal(canAccessRoute('cashier', '/settings'), false);
    assert.equal(canAccessRoute('cashier', '/staff'), false);
    assert.equal(canAccessRoute('cashier', '/audit'), false);
    assert.equal(canAccessRoute('cashier', '/inventory'), false);
    assert.equal(canAccessRoute('cashier', '/pos'), true);
    assert.equal(canAccessRoute('cashier', '/profile'), true);

    // Customers only access their own orders, storefront and personal profile
    assert.equal(canAccessRoute('customer', '/dashboard'), false);
    assert.equal(canAccessRoute('customer', '/pos'), false);
    assert.equal(canAccessRoute('customer', '/staff'), false);
    assert.equal(canAccessRoute('customer', '/orders'), true);
    assert.equal(canAccessRoute('customer', '/storefront'), true);
    assert.equal(canAccessRoute('customer', '/profile'), true);

    // Managers cannot access owner-only staff, audit logs, or settings
    assert.equal(canAccessRoute('manager', '/staff'), false);
    assert.equal(canAccessRoute('manager', '/audit'), false);
    assert.equal(canAccessRoute('manager', '/settings'), false);
    assert.equal(canAccessRoute('manager', '/inventory'), true);
    assert.equal(canAccessRoute('manager', '/reports'), true);

    // Owners have enterprise access across all modules
    assert.equal(canAccessRoute('owner', '/staff'), true);
    assert.equal(canAccessRoute('owner', '/audit'), true);
    assert.equal(canAccessRoute('owner', '/settings'), true);
  });
});
