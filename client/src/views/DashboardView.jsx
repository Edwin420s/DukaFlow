import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes, formatDate } from '../utils/format.js';
import {
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  Boxes,
  Plus,
  ArrowRight,
  Eye,
  CheckCircle2
} from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    try {
      setLoading(true);
      const res = await api.getDashboardMetrics();
      setMetrics(res);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">ENTERPRISE RETAIL PLATFORM</p>
          <h1>Good morning, Shop Manager</h1>
          <p className="muted">Live overview of sales, inventory thresholds, and customer orders today.</p>
        </div>
        <div className="header-button-row">
          <button className="primary-button" onClick={() => onNavigate('/pos')}>
            <ShoppingBag size={15} /> Open Quick POS
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metric-grid">
        <article className="metric">
          <span>Today's Settled Sales</span>
          <strong>{formatKes(metrics?.todaySales || 0)}</strong>
          <small>Sales captured today</small>
        </article>

        <article className="metric">
          <span>Orders Placed Today</span>
          <strong>{metrics?.todayOrderCount || 0}</strong>
          <small>Customer and POS sales</small>
        </article>

        <article className="metric">
          <span>Items to Restock</span>
          <strong className={(metrics?.lowStockCount || 0) > 0 ? 'text-danger' : ''}>
            {metrics?.lowStockCount || 0}
          </strong>
          <small>At or below low-stock threshold</small>
        </article>

        <article className="metric">
          <span>Pending Fulfilment</span>
          <strong className="text-primary">{metrics?.pendingFulfilmentCount || 0}</strong>
          <small>Orders awaiting packing or dispatch</small>
        </article>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="quick-action-bar mb-4">
        <button className="quick-action-pill" onClick={() => onNavigate('/pos')}>
          <ShoppingBag size={14} /> New POS Sale
        </button>
        <button className="quick-action-pill" onClick={() => onNavigate('/products')}>
          <Plus size={14} /> Add Product
        </button>
        <button className="quick-action-pill" onClick={() => onNavigate('/inventory')}>
          <Boxes size={14} /> Receive / Adjust Stock
        </button>
        <button className="quick-action-pill" onClick={() => onNavigate('/suppliers')}>
          <ClipboardList size={14} /> Create Purchase Order
        </button>
        <button className="quick-action-pill" onClick={() => onNavigate('/reports')}>
          <TrendingUp size={14} /> View Revenue Analytics
        </button>
      </div>

      <div className="content-grid">
        {/* Recent Orders Panel */}
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Orders</h2>
              <p className="muted">Latest transactions processed across the counter and storefront.</p>
            </div>
            <button className="outline-button small" onClick={() => onNavigate('/orders')}>
              View All Orders <ArrowRight size={13} />
            </button>
          </div>

          <div className="admin-table-card mt-3">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!metrics?.recentOrders || metrics.recentOrders.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No orders yet.</td></tr>
                ) : (
                  metrics.recentOrders.map((o) => (
                    <tr key={o._id}>
                      <td><code>{o.orderNumber}</code></td>
                      <td>
                        <b>{o.customerName}</b>
                        <small className="muted d-block">{o.customerPhone}</small>
                      </td>
                      <td><strong>{formatKes(o.grandTotal)}</strong></td>
                      <td>
                        <span className={`badge ${o.orderStatus === 'completed' ? 'success' : o.orderStatus === 'cancelled' ? 'danger' : 'primary'}`}>
                          {o.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Attention & Notifications Panel */}
        <article className="panel">
          <h2>Operational Attention</h2>
          <p className="muted">Key alerts requiring immediate staff action.</p>

          <div className="attention-list mt-3">
            {(metrics?.lowStockCount || 0) > 0 && (
              <div className="attention-card warning">
                <AlertTriangle size={18} />
                <div>
                  <b>{metrics.lowStockCount} items at low stock levels</b>
                  <p>Check inventory thresholds to replenish items before they run out.</p>
                  <button className="btn-link" onClick={() => onNavigate('/inventory')}>Go to Inventory →</button>
                </div>
              </div>
            )}

            {(metrics?.pendingFulfilmentCount || 0) > 0 && (
              <div className="attention-card info">
                <ClipboardList size={18} />
                <div>
                  <b>{metrics.pendingFulfilmentCount} orders pending fulfilment</b>
                  <p>Pick and pack orders for express delivery or counter pickup.</p>
                  <button className="btn-link" onClick={() => onNavigate('/orders')}>View Orders →</button>
                </div>
              </div>
            )}

            {(metrics?.lowStockCount || 0) === 0 && (metrics?.pendingFulfilmentCount || 0) === 0 && (
              <div className="attention-card success">
                <CheckCircle2 size={18} />
                <div>
                  <b>All operations running smoothly</b>
                  <p>All stock levels are optimal and all orders are fulfilled.</p>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
