import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes, formatDate } from '../utils/format.js';
import { Search, Eye, CheckCircle2, Clock, Truck, XCircle, Printer, X } from 'lucide-react';

export default function OrdersView({ currentUser }) {
  const isCustomer = currentUser?.role === 'customer';
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionError, setActionError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, search]);

  async function loadOrders() {
    try {
      setLoading(true);
      const query = `${statusFilter ? `status=${statusFilter}&` : ''}${search ? `search=${search}&` : ''}`;
      const res = await api.getOrders(query);
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusTransition(orderId, newStatus, note = '') {
    try {
      setUpdating(true);
      setActionError('');
      const res = await api.updateOrderStatus(orderId, newStatus, note);
      setSelectedOrder(res.order);
      loadOrders();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancelOrder(orderId) {
    const reason = window.prompt('Please enter reason for cancellation:');
    if (!reason) return;

    try {
      setUpdating(true);
      setActionError('');
      const res = await api.cancelOrder(orderId, reason);
      setSelectedOrder(res.order);
      loadOrders();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{isCustomer ? 'My Orders & Purchases' : 'Customer Orders & Fulfilment'}</h1>
          <p className="muted">
            {isCustomer
              ? 'View your past order history, live fulfillment tracking, and payment receipts.'
              : 'Track orders across the entire lifecycle from checkout, preparation, dispatch to completion.'}
          </p>
        </div>
      </div>

      <div className="admin-tab-group mb-4">
        {[
          { key: '', label: 'All Orders' },
          { key: 'pending', label: 'Pending' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'preparing', label: 'Preparing' },
          { key: 'ready_for_pickup', label: 'Ready / Dispatched' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-filters-bar">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by order number (ORD-...), customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Fulfilment</th>
              <th>Total (KES)</th>
              <th>Payment Status</th>
              <th>Order Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>Loading orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No orders found.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id}>
                  <td>
                    <strong><code>{o.orderNumber}</code></strong>
                  </td>
                  <td><small>{formatDate(o.createdAt)}</small></td>
                  <td>
                    <div><b>{o.customerName}</b></div>
                    <small className="muted">{o.customerPhone}</small>
                  </td>
                  <td>
                    <span className="badge neutral">{o.fulfilmentType.toUpperCase()}</span>
                  </td>
                  <td><strong>{formatKes(o.grandTotal)}</strong></td>
                  <td>
                    <span className={`badge ${o.paymentStatus === 'paid' ? 'success' : o.paymentStatus === 'failed' ? 'danger' : 'warning'}`}>
                      {o.paymentStatus.toUpperCase()} ({o.paymentMethod.toUpperCase()})
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${o.orderStatus === 'completed' ? 'success' : o.orderStatus === 'cancelled' ? 'danger' : 'primary'}`}>
                      {o.orderStatus.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="outline-button small" onClick={() => setSelectedOrder(o)}>
                      <Eye size={13} /> View Order
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="sf-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <aside className="sf-order-detail-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sf-drawer-header">
              <div>
                <h2>{selectedOrder.orderNumber}</h2>
                <small className="muted">Placed on {formatDate(selectedOrder.createdAt)}</small>
              </div>
              <button className="sf-close-btn" onClick={() => setSelectedOrder(null)}><X size={20} /></button>
            </div>

            {actionError && <div className="sf-alert danger">{actionError}</div>}

            <div className="order-drawer-content">
              {/* Lifecycle Actions Bar (Staff Only) */}
              {!isCustomer && (
                <div className="order-actions-card">
                  <h4>Workflow Status Actions</h4>
                  <div className="status-button-row">
                    {selectedOrder.orderStatus === 'pending' && (
                      <button
                        className="primary-button small"
                        disabled={updating}
                        onClick={() => handleStatusTransition(selectedOrder._id, 'confirmed', 'Confirmed by staff')}
                      >
                        ✓ Confirm Order
                      </button>
                    )}
                    {selectedOrder.orderStatus === 'confirmed' && (
                      <button
                        className="primary-button small"
                        disabled={updating}
                        onClick={() => handleStatusTransition(selectedOrder._id, 'preparing', 'Started picking and packing')}
                      >
                        📦 Start Preparing
                      </button>
                    )}
                    {selectedOrder.orderStatus === 'preparing' && (
                      <button
                        className="primary-button small"
                        disabled={updating}
                        onClick={() =>
                          handleStatusTransition(
                            selectedOrder._id,
                            selectedOrder.fulfilmentType === 'delivery' ? 'dispatched' : 'ready_for_pickup',
                            'Items assembled in bag'
                          )
                        }
                      >
                        {selectedOrder.fulfilmentType === 'delivery' ? '🚚 Dispatch Rider' : '✓ Ready for Collection'}
                      </button>
                    )}
                    {(selectedOrder.orderStatus === 'ready_for_pickup' || selectedOrder.orderStatus === 'dispatched') && (
                      <button
                        className="primary-button small bg-emerald"
                        disabled={updating}
                        onClick={() => handleStatusTransition(selectedOrder._id, 'completed', 'Handed over to customer')}
                      >
                        ✓ Mark Completed
                      </button>
                    )}
                    {selectedOrder.orderStatus !== 'completed' && selectedOrder.orderStatus !== 'cancelled' && (
                      <button
                        className="outline-button small text-danger"
                        disabled={updating}
                        onClick={() => handleCancelOrder(selectedOrder._id)}
                      >
                        <XCircle size={13} /> Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Info Card */}
              <div className="detail-card">
                <h4>Customer & Fulfilment</h4>
                <p><b>Name:</b> {selectedOrder.customerName}</p>
                <p><b>Phone:</b> {selectedOrder.customerPhone}</p>
                {selectedOrder.customerEmail && <p><b>Email:</b> {selectedOrder.customerEmail}</p>}
                <p><b>Fulfilment:</b> {selectedOrder.fulfilmentType.toUpperCase()}</p>
                {selectedOrder.fulfilmentType === 'delivery' && (
                  <p>
                    <b>Delivery Address:</b> {selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.zone}
                    {selectedOrder.deliveryAddress?.instructions && (
                      <span className="d-block text-muted">Notes: {selectedOrder.deliveryAddress.instructions}</span>
                    )}
                  </p>
                )}
              </div>

              {/* Items Card */}
              <div className="detail-card">
                <h4>Order Items</h4>
                <table className="mini-table">
                  <thead>
                    <tr><th>Item</th><th>Qty</th><th>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((i, idx) => (
                      <tr key={idx}>
                        <td>{i.productName} <code>({i.sku})</code></td>
                        <td>{i.quantity}</td>
                        <td>{formatKes(i.unitPrice)}</td>
                        <td style={{ textAlign: 'right' }}>{formatKes(i.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="order-totals-breakdown">
                  <div><span>Subtotal:</span> <span>{formatKes(selectedOrder.subtotal)}</span></div>
                  {selectedOrder.discountTotal > 0 && <div><span>Discount:</span> <span>-{formatKes(selectedOrder.discountTotal)}</span></div>}
                  <div><span>VAT (16% standard):</span> <span>{formatKes(selectedOrder.taxTotal)}</span></div>
                  <div><span>Delivery Fee:</span> <span>{formatKes(selectedOrder.deliveryFee)}</span></div>
                  <div className="grand"><span>Grand Total:</span> <strong>{formatKes(selectedOrder.grandTotal)}</strong></div>
                </div>
              </div>

              {/* Audit Timeline */}
              <div className="detail-card">
                <h4>Activity Timeline</h4>
                <ul className="timeline-list">
                  {selectedOrder.timeline?.map((t, idx) => (
                    <li key={idx}>
                      <b>{t.status}</b>
                      <small className="muted d-block">{formatDate(t.timestamp)} - {t.actor}</small>
                      {t.note && <span>{t.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="drawer-footer-actions">
                <button className="primary-button full-width" onClick={() => window.print()}>
                  <Printer size={16} /> Print Receipt
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
