import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes } from '../utils/format.js';
import { Search, UserCheck, Phone, Mail, ShoppingBag } from 'lucide-react';

export default function CustomersView() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  async function loadCustomers() {
    try {
      setLoading(true);
      const res = await api.getCustomers(search ? `search=${search}` : '');
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function viewCustomer(cust) {
    setSelectedCustomer(cust);
    try {
      const res = await api.getCustomer(cust._id);
      setCustomerOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Customer CRM Directory</h1>
          <p className="muted">Profiles, order volumes, lifetime value and contact details for retail customers.</p>
        </div>
      </div>

      <div className="admin-filters-bar">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by customer name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Total Orders</th>
              <th>Lifetime Spend</th>
              <th style={{ textAlign: 'right' }}>History</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading customers...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No customers recorded.</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id}>
                  <td><strong>{c.name}</strong></td>
                  <td><code>{c.phone}</code></td>
                  <td>{c.email || '-'}</td>
                  <td><small className="muted">{c.address || '-'}</small></td>
                  <td><b>{c.totalOrders}</b></td>
                  <td><strong>{formatKes(c.totalSpend)}</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="outline-button small" onClick={() => viewCustomer(c)}>
                      View Orders
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Orders Modal */}
      {selectedCustomer && (
        <div className="sf-modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="sf-modal-card large" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedCustomer.name} — Order History</h2>
            <p className="muted">Phone: {selectedCustomer.phone} | Total Lifetime Spend: {formatKes(selectedCustomer.totalSpend)}</p>

            <div className="admin-table-card mt-3">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customerOrders.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>No orders found.</td></tr>
                  ) : (
                    customerOrders.map((o) => (
                      <tr key={o._id}>
                        <td><code>{o.orderNumber}</code></td>
                        <td><small>{new Date(o.createdAt).toLocaleDateString()}</small></td>
                        <td><span className="badge neutral">{o.orderStatus}</span></td>
                        <td><span className="badge success">{o.paymentStatus}</span></td>
                        <td><strong>{formatKes(o.grandTotal)}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="sf-modal-actions mt-3">
              <button className="primary-button" onClick={() => setSelectedCustomer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
