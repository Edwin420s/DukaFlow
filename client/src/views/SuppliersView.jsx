import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes, formatDate } from '../utils/format.js';
import { Plus, Truck, PackageCheck, FileText, Phone, Mail, Building } from 'lucide-react';

export default function SuppliersView() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers'
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);

  // Supplier Form
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTaxPin, setSupTaxPin] = useState('');

  // PO Form
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poLines, setPoLines] = useState([{ productId: '', quantity: 10, unitCostKes: 100 }]);
  const [poNotes, setPoNotes] = useState('');

  // Receive Form
  const [receiveLines, setReceiveLines] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      const [supsRes, posRes, prodsRes] = await Promise.all([
        api.getSuppliers(),
        api.getPurchaseOrders(),
        api.getProducts('status=active')
      ]);
      setSuppliers(supsRes.suppliers || []);
      setPurchaseOrders(posRes.purchaseOrders || []);
      setProducts(prodsRes.products || []);
      if (supsRes.suppliers?.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(supsRes.suppliers[0]._id);
      }
    } catch (err) {
      console.error('Failed to load supplier data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSupplier(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createSupplier({
        name: supName,
        contactPerson: supContact,
        email: supEmail,
        phone: supPhone,
        address: supAddress,
        taxPin: supTaxPin
      });
      setIsSupplierModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function addPoLine() {
    setPoLines([...poLines, { productId: products[0]?._id || '', quantity: 10, unitCostKes: 100 }]);
  }

  function updatePoLine(index, field, value) {
    const updated = [...poLines];
    updated[index][field] = value;
    setPoLines(updated);
  }

  async function handleCreatePo(e) {
    e.preventDefault();
    setError('');
    try {
      const items = poLines.map((l) => ({
        productId: l.productId,
        orderedQuantity: Number(l.quantity),
        unitCost: Math.round(Number(l.unitCostKes) * 100)
      }));

      await api.createPurchaseOrder({
        supplierId: selectedSupplierId,
        items,
        notes: poNotes
      });
      setIsPoModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function openReceiveModal(po) {
    setSelectedPo(po);
    setReceiveLines(
      po.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        orderedQuantity: i.orderedQuantity,
        alreadyReceived: i.receivedQuantity || 0,
        receiveNow: Math.max(0, i.orderedQuantity - (i.receivedQuantity || 0))
      }))
    );
    setError('');
    setIsReceiveModalOpen(true);
  }

  async function handleReceiveSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const itemsToReceive = receiveLines
        .filter((l) => l.receiveNow > 0)
        .map((l) => ({
          productId: l.productId,
          receivedQuantity: Number(l.receiveNow)
        }));

      if (itemsToReceive.length === 0) {
        setError('Please enter at least one quantity to receive.');
        return;
      }

      await api.receivePurchaseOrder(selectedPo._id, { items: itemsToReceive });
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
          <h1>Suppliers & Purchasing</h1>
          <p className="muted">Manage supplier contacts, issue purchase orders, and receive goods directly into inventory.</p>
        </div>
        <div className="admin-tab-group">
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Purchase Orders
          </button>
          <button
            className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
          >
            Supplier Directory
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <>
          <div className="admin-filters-bar justify-end">
            <button className="primary-button" onClick={() => setIsPoModalOpen(true)}>
              <Plus size={16} /> New Purchase Order
            </button>
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Items & Quantities</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading purchase orders...</td></tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No purchase orders recorded yet.</td></tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po._id}>
                      <td><strong><code>{po.poNumber}</code></strong></td>
                      <td><small>{formatDate(po.createdAt)}</small></td>
                      <td><b>{po.supplierName}</b></td>
                      <td><strong>{formatKes(po.totalAmount)}</strong></td>
                      <td>
                        <span className={`badge ${po.status === 'received' ? 'success' : po.status === 'partially_received' ? 'warning' : 'primary'}`}>
                          {po.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <small>
                          {po.items.map((i) => `${i.productName}: ${i.receivedQuantity}/${i.orderedQuantity}`).join(', ')}
                        </small>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {po.status !== 'received' && po.status !== 'cancelled' && (
                          <button className="primary-button small" onClick={() => openReceiveModal(po)}>
                            <PackageCheck size={13} /> Receive Goods
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'suppliers' && (
        <>
          <div className="admin-filters-bar justify-end">
            <button className="primary-button" onClick={() => setIsSupplierModalOpen(true)}>
              <Plus size={16} /> Add Supplier
            </button>
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>KRA PIN</th>
                  <th>Total Purchases</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading suppliers...</td></tr>
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No suppliers configured.</td></tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s._id}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.contactPerson || '-'}</td>
                      <td>{s.phone || '-'}</td>
                      <td>{s.email || '-'}</td>
                      <td><code>{s.taxPin || '-'}</code></td>
                      <td><strong>{formatKes(s.totalPurchases)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* New Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card">
            <h2>Add Supplier</h2>
            {error && <div className="sf-alert danger">{error}</div>}
            <form onSubmit={handleCreateSupplier} className="admin-modal-form">
              <label>
                Supplier / Company Name *
                <input type="text" required value={supName} onChange={(e) => setSupName(e.target.value)} />
              </label>
              <label>
                Contact Person
                <input type="text" value={supContact} onChange={(e) => setSupContact(e.target.value)} />
              </label>
              <div className="form-grid-2">
                <label>
                  Phone Number
                  <input type="tel" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} />
                </label>
                <label>
                  Email Address
                  <input type="email" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} />
                </label>
              </div>
              <div className="form-grid-2">
                <label>
                  Physical Address
                  <input type="text" value={supAddress} onChange={(e) => setSupAddress(e.target.value)} />
                </label>
                <label>
                  KRA Tax PIN
                  <input type="text" value={supTaxPin} onChange={(e) => setSupTaxPin(e.target.value.toUpperCase())} />
                </label>
              </div>
              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Save Supplier</button>
                <button type="button" className="outline-button" onClick={() => setIsSupplierModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {isPoModalOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card large">
            <h2>Create Purchase Order</h2>
            {error && <div className="sf-alert danger">{error}</div>}
            <form onSubmit={handleCreatePo} className="admin-modal-form">
              <label>
                Select Supplier *
                <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.contactPerson})</option>
                  ))}
                </select>
              </label>

              <h4>Line Items</h4>
              {poLines.map((line, idx) => (
                <div key={idx} className="po-form-line">
                  <select
                    value={line.productId}
                    onChange={(e) => updatePoLine(idx, 'productId', e.target.value)}
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Quantity"
                    value={line.quantity}
                    onChange={(e) => updatePoLine(idx, 'quantity', e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Unit Cost (KES)"
                    value={line.unitCostKes}
                    onChange={(e) => updatePoLine(idx, 'unitCostKes', e.target.value)}
                  />
                </div>
              ))}

              <button type="button" className="outline-button small" onClick={addPoLine}>
                <Plus size={14} /> Add Another Item
              </button>

              <label>
                Delivery Instructions / Notes
                <textarea rows="2" value={poNotes} onChange={(e) => setPoNotes(e.target.value)} />
              </label>

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Issue Purchase Order</button>
                <button type="button" className="outline-button" onClick={() => setIsPoModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Goods Modal */}
      {isReceiveModalOpen && selectedPo && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card">
            <h2>Receive Goods: {selectedPo.poNumber}</h2>
            <p className="muted">Enter quantities arrived to update on-hand inventory and log stock movement ledger.</p>
            {error && <div className="sf-alert danger">{error}</div>}

            <form onSubmit={handleReceiveSubmit} className="admin-modal-form">
              {receiveLines.map((line, idx) => (
                <div key={idx} className="receive-line-card">
                  <div>
                    <b>{line.productName}</b>
                    <small className="muted d-block">Ordered: {line.orderedQuantity} | Already Received: {line.alreadyReceived}</small>
                  </div>
                  <label>
                    Receive Now:
                    <input
                      type="number"
                      min="0"
                      value={line.receiveNow}
                      onChange={(e) => {
                        const updated = [...receiveLines];
                        updated[idx].receiveNow = e.target.value;
                        setReceiveLines(updated);
                      }}
                    />
                  </label>
                </div>
              ))}

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Confirm Goods Receipt</button>
                <button type="button" className="outline-button" onClick={() => setIsReceiveModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
