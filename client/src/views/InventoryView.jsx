import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatDate } from '../utils/format.js';
import { PlusCircle, Sliders, AlertTriangle, History, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function InventoryView() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements'
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('count_correction');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, lowStockFilter, search]);

  async function loadData() {
    try {
      setLoading(true);
      if (activeTab === 'stock') {
        const res = await api.getInventory(
          `${lowStockFilter ? 'lowStockOnly=true&' : ''}${search ? `search=${search}&` : ''}`
        );
        setInventory(res.inventory || []);
      } else {
        const res = await api.getStockMovements();
        setMovements(res.movements || []);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  }

  function openAdjust(prod) {
    setSelectedProduct(prod);
    setAdjustQty(prod.onHand);
    setAdjustReason('count_correction');
    setAdjustNotes('');
    setError('');
    setIsAdjustModalOpen(true);
  }

  function openReceive(prod) {
    setSelectedProduct(prod);
    setReceiveQty(10);
    setReceiveNotes('');
    setError('');
    setIsReceiveModalOpen(true);
  }

  async function handleAdjustSubmit(e) {
    e.preventDefault();
    if (!adjustNotes.trim()) {
      setError('A note/reason description is required for audit traceability.');
      return;
    }
    try {
      await api.adjustStock({
        productId: selectedProduct.id,
        newOnHand: Number(adjustQty),
        reason: adjustReason,
        notes: adjustNotes.trim()
      });
      setIsAdjustModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReceiveSubmit(e) {
    e.preventDefault();
    try {
      await api.receiveStock({
        productId: selectedProduct.id,
        quantity: Number(receiveQty),
        notes: receiveNotes.trim()
      });
      setIsReceiveModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Inventory & Stock Ledger</h1>
          <p className="muted">Authoritative tracking of on-hand quantities, active reservations, and immutable movement history.</p>
        </div>
        <div className="admin-tab-group">
          <button
            className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            Live Stock Levels
          </button>
          <button
            className={`tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <History size={15} /> Movement History Ledger
          </button>
        </div>
      </div>

      {activeTab === 'stock' && (
        <>
          <div className="admin-filters-bar">
            <input
              type="text"
              placeholder="Search by SKU or item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)}
              />
              <span>Show Low Stock Only</span>
            </label>
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>On-Hand</th>
                  <th>Reserved</th>
                  <th>Available to Sell</th>
                  <th>Low-Stock Alert Level</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading inventory...</td></tr>
                ) : inventory.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No inventory items found.</td></tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small className="muted d-block">{item.unit}</small>
                      </td>
                      <td><code>{item.sku}</code></td>
                      <td><b>{item.onHand}</b></td>
                      <td><span className="text-muted">{item.reserved}</span></td>
                      <td>
                        <strong className={item.available <= item.lowStockThreshold ? 'text-danger' : 'text-emerald'}>
                          {item.available}
                        </strong>
                      </td>
                      <td>
                        {item.isLowStock ? (
                          <span className="badge warning"><AlertTriangle size={12} /> Low Stock (Threshold: {item.lowStockThreshold})</span>
                        ) : (
                          <span className="badge neutral">Threshold: {item.lowStockThreshold}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <button className="outline-button small" onClick={() => openReceive(item)}>
                            <PlusCircle size={13} /> Receive
                          </button>
                          <button className="outline-button small" onClick={() => openAdjust(item)}>
                            <Sliders size={13} /> Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'movements' && (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Quantity Change</th>
                <th>Before / After</th>
                <th>Reason</th>
                <th>Reference</th>
                <th>Recorded By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px' }}>Loading movement ledger...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px' }}>No stock movements recorded yet.</td></tr>
              ) : (
                movements.map((m) => (
                  <tr key={m._id}>
                    <td><small>{formatDate(m.createdAt)}</small></td>
                    <td><strong>{m.productName}</strong></td>
                    <td><code>{m.sku}</code></td>
                    <td>
                      <strong className={m.change > 0 ? 'text-emerald' : 'text-danger'}>
                        {m.change > 0 ? `+${m.change}` : m.change}
                      </strong>
                    </td>
                    <td><small>{m.previousOnHand} → {m.newOnHand}</small></td>
                    <td><span className="badge neutral">{m.reason.replace(/_/g, ' ')}</span></td>
                    <td><small><code>{m.referenceId || m.referenceType}</code></small></td>
                    <td><small>{m.actorName}</small></td>
                    <td><small className="muted">{m.notes}</small></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Adjust Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card">
            <h2>Adjust Inventory: {selectedProduct.name}</h2>
            <p className="muted">SKU: {selectedProduct.sku} | Current On-Hand: {selectedProduct.onHand}</p>
            {error && <div className="sf-alert danger">{error}</div>}

            <form onSubmit={handleAdjustSubmit} className="admin-modal-form">
              <label>
                New Physical On-Hand Count *
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </label>

              <label>
                Mandatory Reason *
                <select value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
                  <option value="count_correction">Physical Inventory Count Correction</option>
                  <option value="damaged">Damaged Goods Write-off</option>
                  <option value="expired">Expired Stock Removal</option>
                  <option value="manual_adjustment">Manual Reconciliation</option>
                </select>
              </label>

              <label>
                Audit Explanation Notes *
                <textarea
                  rows="2"
                  required
                  placeholder="Explain why this adjustment is being made..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </label>

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Confirm Adjustment</button>
                <button type="button" className="outline-button" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Receive Modal */}
      {isReceiveModalOpen && selectedProduct && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card">
            <h2>Receive Stock: {selectedProduct.name}</h2>
            <p className="muted">SKU: {selectedProduct.sku} | Current On-Hand: {selectedProduct.onHand}</p>
            {error && <div className="sf-alert danger">{error}</div>}

            <form onSubmit={handleReceiveSubmit} className="admin-modal-form">
              <label>
                Quantity Received *
                <input
                  type="number"
                  min="1"
                  required
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value)}
                />
              </label>

              <label>
                Delivery Reference / Notes
                <input
                  type="text"
                  placeholder="e.g. Morning direct farm delivery"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                />
              </label>

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Receive into Stock</button>
                <button type="button" className="outline-button" onClick={() => setIsReceiveModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
