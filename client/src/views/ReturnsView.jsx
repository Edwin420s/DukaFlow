import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes, formatDate } from '../utils/format.js';
import { Plus, RotateCcw, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ReturnsView() {
  const [returns, setReturns] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Create Return Form
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrderData, setSelectedOrderData] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnNotes, setReturnNotes] = useState('');

  // Inspect Form
  const [dispositions, setDispositions] = useState([]);
  const [issueRefund, setIssueRefund] = useState(true);
  const [inspectNotes, setInspectNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [retsRes, ordersRes] = await Promise.all([
        api.getReturns(),
        api.getOrders('status=completed')
      ]);
      setReturns(retsRes.returns || []);
      setCompletedOrders(ordersRes.orders || []);
      if (ordersRes.orders?.length > 0 && !selectedOrderId) {
        selectOrderForReturn(ordersRes.orders[0]._id, ordersRes.orders);
      }
    } catch (err) {
      console.error('Failed to load returns data:', err);
    } finally {
      setLoading(false);
    }
  }

  function selectOrderForReturn(orderId, orderList = completedOrders) {
    setSelectedOrderId(orderId);
    const ord = orderList.find((o) => o._id === orderId);
    setSelectedOrderData(ord);
    if (ord?.items) {
      setReturnItems(
        ord.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          orderedQty: i.quantity,
          returnQty: 0,
          reason: 'customer_request'
        }))
      );
    }
  }

  async function handleCreateReturn(e) {
    e.preventDefault();
    setError('');

    const itemsToSubmit = returnItems
      .filter((i) => Number(i.returnQty) > 0)
      .map((i) => ({
        productId: i.productId,
        quantity: Number(i.returnQty),
        reason: i.reason
      }));

    if (itemsToSubmit.length === 0) {
      setError('Please select at least 1 item and quantity to return.');
      return;
    }

    try {
      await api.createReturn({
        orderId: selectedOrderId,
        items: itemsToSubmit,
        notes: returnNotes
      });
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function openInspectModal(ret) {
    setSelectedReturn(ret);
    setDispositions(
      ret.items.map((i) => ({
        itemId: i._id,
        productName: i.productName,
        quantity: i.quantity,
        disposition: 'restock',
        dispositionNotes: 'Verified condition'
      }))
    );
    setError('');
    setIsInspectModalOpen(true);
  }

  async function handleInspectSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      await api.inspectReturn(selectedReturn._id, {
        itemDispositions: dispositions,
        issueRefund,
        notes: inspectNotes
      });
      setIsInspectModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Returns, Inspections & Refunds</h1>
          <p className="muted">Process returns from completed orders, inspect condition, restock sellable items, and issue refunds.</p>
        </div>
        <button className="primary-button" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} /> Process Return
        </button>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Return Number</th>
              <th>Order Number</th>
              <th>Date</th>
              <th>Items</th>
              <th>Refund Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading returns...</td></tr>
            ) : returns.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No returns requested.</td></tr>
            ) : (
              returns.map((ret) => (
                <tr key={ret._id}>
                  <td><strong><code>{ret.returnNumber}</code></strong></td>
                  <td><code>{ret.orderNumber}</code></td>
                  <td><small>{formatDate(ret.createdAt)}</small></td>
                  <td>
                    <small>
                      {ret.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                    </small>
                  </td>
                  <td><strong>{formatKes(ret.totalRefundAmount)}</strong></td>
                  <td>
                    <span className={`badge ${ret.status === 'completed' ? 'success' : 'warning'}`}>
                      {ret.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ret.status === 'requested' && (
                      <button className="primary-button small" onClick={() => openInspectModal(ret)}>
                        <ShieldCheck size={13} /> Inspect & Dispose
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Process Return Modal */}
      {isCreateModalOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card large">
            <h2>Process Customer Return</h2>
            {error && <div className="sf-alert danger">{error}</div>}

            <form onSubmit={handleCreateReturn} className="admin-modal-form">
              <label>
                Select Completed Order *
                <select
                  value={selectedOrderId}
                  onChange={(e) => selectOrderForReturn(e.target.value)}
                >
                  {completedOrders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} - {o.customerName} ({formatKes(o.grandTotal)})
                    </option>
                  ))}
                </select>
              </label>

              <h4>Select Items to Return</h4>
              {returnItems.map((item, idx) => (
                <div key={idx} className="return-item-line">
                  <div>
                    <b>{item.productName}</b>
                    <small className="muted d-block">Original Qty: {item.orderedQty}</small>
                  </div>
                  <label>
                    Return Qty:
                    <input
                      type="number"
                      min="0"
                      max={item.orderedQty}
                      value={item.returnQty}
                      onChange={(e) => {
                        const updated = [...returnItems];
                        updated[idx].returnQty = e.target.value;
                        setReturnItems(updated);
                      }}
                    />
                  </label>
                  <label>
                    Reason:
                    <select
                      value={item.reason}
                      onChange={(e) => {
                        const updated = [...returnItems];
                        updated[idx].reason = e.target.value;
                        setReturnItems(updated);
                      }}
                    >
                      <option value="customer_request">Customer Changed Mind</option>
                      <option value="defective">Defective / Damaged</option>
                      <option value="wrong_item">Wrong Item Delivered</option>
                      <option value="expired">Expired</option>
                    </select>
                  </label>
                </div>
              ))}

              <label>
                Return Notes:
                <textarea rows="2" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
              </label>

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Submit Return Request</button>
                <button type="button" className="outline-button" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect & Disposition Modal */}
      {isInspectModalOpen && selectedReturn && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card large">
            <h2>Inspect Return: {selectedReturn.returnNumber}</h2>
            <p className="muted">Choose item disposition. Restocking automatically increases available inventory and records an immutable movement record.</p>
            {error && <div className="sf-alert danger">{error}</div>}

            <form onSubmit={handleInspectSubmit} className="admin-modal-form">
              {dispositions.map((disp, idx) => (
                <div key={idx} className="disposition-card">
                  <div>
                    <b>{disp.productName} (x{disp.quantity})</b>
                  </div>
                  <label>
                    Disposition:
                    <select
                      value={disp.disposition}
                      onChange={(e) => {
                        const updated = [...dispositions];
                        updated[idx].disposition = e.target.value;
                        setDispositions(updated);
                      }}
                    >
                      <option value="restock">Restock to Inventory (Good Condition)</option>
                      <option value="damaged_writeoff">Damaged / Write-Off (Cannot Resell)</option>
                      <option value="supplier_return">Return to Supplier</option>
                    </select>
                  </label>
                  <input
                    type="text"
                    placeholder="Inspection remarks..."
                    value={disp.dispositionNotes}
                    onChange={(e) => {
                      const updated = [...dispositions];
                      updated[idx].dispositionNotes = e.target.value;
                      setDispositions(updated);
                    }}
                  />
                </div>
              ))}

              <label className="checkbox-label mt-3">
                <input
                  type="checkbox"
                  checked={issueRefund}
                  onChange={(e) => setIssueRefund(e.target.checked)}
                />
                <span>Issue Refund ({formatKes(selectedReturn.totalRefundAmount)}) back to customer</span>
              </label>

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Complete Inspection & Save</button>
                <button type="button" className="outline-button" onClick={() => setIsInspectModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
