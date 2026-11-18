const BASE_URL = '/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = localStorage.getItem('dukaflow_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `Request failed (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = data.error?.details;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  // Shop Settings
  getShop: () => request('/shop'),
  updateShop: (payload) => request('/shop', { method: 'PUT', body: JSON.stringify(payload) }),

  // Users & Staff
  getUsers: () => request('/users'),
  createStaff: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateStaff: (id, payload) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (payload) => request('/categories', { method: 'POST', body: JSON.stringify(payload) }),

  // Products
  getProducts: (params = '') => request(`/products${params ? `?${params}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (payload) => request('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  archiveProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Inventory
  getInventory: (params = '') => request(`/inventory${params ? `?${params}` : ''}`),
  adjustStock: (payload) => request('/inventory/adjust', { method: 'POST', body: JSON.stringify(payload) }),
  receiveStock: (payload) => request('/inventory/receive', { method: 'POST', body: JSON.stringify(payload) }),
  getStockMovements: (params = '') => request(`/inventory/movements${params ? `?${params}` : ''}`),

  // Cart & Pricing
  calculateCart: (payload) => request('/cart/calculate', { method: 'POST', body: JSON.stringify(payload) }),

  // Coupons
  getCoupons: () => request('/coupons'),
  createCoupon: (payload) => request('/coupons', { method: 'POST', body: JSON.stringify(payload) }),

  // Orders
  getOrders: (params = '') => request(`/orders${params ? `?${params}` : ''}`),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrderStatus: (id, status, note = '') =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
  cancelOrder: (id, reason = '') =>
    request(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Payments
  recordCash: (payload) => request('/payments/cash', { method: 'POST', body: JSON.stringify(payload) }),
  simulatePayment: (payload) => request('/payments/simulate', { method: 'POST', body: JSON.stringify(payload) }),
  initiateMpesa: (payload) => request('/payments/mpesa/stkpush', { method: 'POST', body: JSON.stringify(payload) }),
  simulateMpesaSuccess: (checkoutRequestId) =>
    request('/payments/mpesa/simulate-success', { method: 'POST', body: JSON.stringify({ checkoutRequestId }) }),
  refund: (payload) => request('/payments/refund', { method: 'POST', body: JSON.stringify(payload) }),
  getPayment: (id) => request(`/payments/${id}`),

  // Suppliers & Purchasing
  getSuppliers: () => request('/suppliers'),
  createSupplier: (payload) => request('/suppliers', { method: 'POST', body: JSON.stringify(payload) }),
  getPurchaseOrders: () => request('/purchase-orders'),
  createPurchaseOrder: (payload) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }),
  receivePurchaseOrder: (id, payload) =>
    request(`/purchase-orders/${id}/receive`, { method: 'POST', body: JSON.stringify(payload) }),

  // Returns
  getReturns: () => request('/returns'),
  createReturn: (payload) => request('/returns', { method: 'POST', body: JSON.stringify(payload) }),
  inspectReturn: (id, payload) =>
    request(`/returns/${id}/inspect`, { method: 'POST', body: JSON.stringify(payload) }),

  // Customers
  getCustomers: (params = '') => request(`/customers${params ? `?${params}` : ''}`),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (payload) => request('/customers', { method: 'POST', body: JSON.stringify(payload) }),

  // Reports
  getDashboardMetrics: () => request('/reports/dashboard'),
  getSalesReport: (params = '') => request(`/reports/sales${params ? `?${params}` : ''}`),
  getInventoryValuation: () => request('/reports/inventory-valuation'),
  getPaymentBreakdown: () => request('/reports/payments'),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: (params = '') => request(`/audit-logs${params ? `?${params}` : ''}`),

  // Customer Storefront
  getStorefrontShop: () => request('/storefront/shop'),
  getStorefrontCategories: () => request('/storefront/categories'),
  getStorefrontProducts: (params = '') => request(`/storefront/products${params ? `?${params}` : ''}`),
  getStorefrontProduct: (id) => request(`/storefront/products/${id}`),
  calculateStorefront: (payload) => request('/storefront/calculate', { method: 'POST', body: JSON.stringify(payload) }),
  createStorefrontOrder: (payload) => request('/storefront/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getStorefrontOrder: (orderNumber) => request(`/storefront/orders/${orderNumber}`)
};
