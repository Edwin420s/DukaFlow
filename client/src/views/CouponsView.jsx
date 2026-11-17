import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes, formatDate } from '../utils/format.js';
import { Plus, Tag, Edit2, Trash2, CheckCircle, Percent, DollarSign } from 'lucide-react';

export default function CouponsView() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  // Form states
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderValueKes, setMinOrderValueKes] = useState(1000);
  const [maxDiscountKes, setMaxDiscountKes] = useState(500);
  const [usageLimit, setUsageLimit] = useState(500);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    try {
      setLoading(true);
      const res = await api.getCoupons();
      setCoupons(res.coupons || []);
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCoupon(null);
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setMinOrderValueKes(1000);
    setMaxDiscountKes(500);
    setUsageLimit(500);
    setIsActive(true);
    setError('');
    setIsModalOpen(true);
  }

  function openEditModal(c) {
    setEditingCoupon(c);
    setCode(c.code);
    setDescription(c.description || '');
    setDiscountType(c.discountType);
    setDiscountValue(c.discountType === 'percentage' ? c.discountValue : c.discountValue / 100);
    setMinOrderValueKes((c.minOrderValue || 0) / 100);
    setMaxDiscountKes(c.maxDiscount ? c.maxDiscount / 100 : '');
    setUsageLimit(c.usageLimit || '');
    setIsActive(c.isActive);
    setError('');
    setIsModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    const val = Number(discountValue);
    const minOrderVal = Math.round(Number(minOrderValueKes) * 100);
    const maxDisc = maxDiscountKes ? Math.round(Number(maxDiscountKes) * 100) : null;
    const limit = usageLimit ? Number(usageLimit) : null;

    const payload = {
      code: code.trim().toUpperCase(),
      description,
      discountType,
      discountValue: discountType === 'percentage' ? val : Math.round(val * 100),
      minOrderValue: minOrderVal,
      maxDiscount: maxDisc,
      usageLimit: limit,
      isActive
    };

    try {
      if (editingCoupon) {
        await api.updateCoupon(editingCoupon._id, payload);
      } else {
        await api.createCoupon(payload);
      }
      setIsModalOpen(false);
      loadCoupons();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await api.deleteCoupon(c._id);
      loadCoupons();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Promotions & Discount Coupons</h1>
          <p className="muted">Create customer incentive codes, set percentage or fixed discounts, minimum spend rules, and track usage.</p>
        </div>
        <button className="primary-button" onClick={openCreateModal}>
          <Plus size={16} /> New Coupon
        </button>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Coupon Code</th>
              <th>Description</th>
              <th>Discount</th>
              <th>Min Order Spend</th>
              <th>Usage Count</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading coupons...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No coupons created yet.</td></tr>
            ) : (
              coupons.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className="d-flex align-center gap-2">
                      <Tag size={15} className="text-emerald" />
                      <strong><code>{c.code}</code></strong>
                    </div>
                  </td>
                  <td>{c.description || '-'}</td>
                  <td>
                    <b>{c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `${formatKes(c.discountValue)} OFF`}</b>
                    {c.maxDiscount && <small className="muted d-block">(Cap: {formatKes(c.maxDiscount)})</small>}
                  </td>
                  <td>{c.minOrderValue > 0 ? formatKes(c.minOrderValue) : 'No minimum'}</td>
                  <td>
                    <b>{c.usageCount || 0}</b>
                    {c.usageLimit && <span className="muted"> / {c.usageLimit}</span>}
                  </td>
                  <td>
                    <span className={`badge ${c.isActive ? 'success' : 'neutral'}`}>
                      {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions">
                      <button className="icon-btn" onClick={() => openEditModal(c)} title="Edit"><Edit2 size={14} /></button>
                      <button className="icon-btn text-danger" onClick={() => handleDelete(c)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Coupon Modal */}
      {isModalOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card">
            <h2>{editingCoupon ? 'Edit Coupon' : 'Create Promotional Coupon'}</h2>
            {error && <div className="sf-alert danger">{error}</div>}

            <form onSubmit={handleSave} className="admin-modal-form">
              <label>
                Coupon Code *
                <input
                  type="text"
                  required
                  placeholder="e.g. KARIBU10 or FLASH200"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </label>

              <label>
                Description
                <input
                  type="text"
                  placeholder="e.g. 10% Welcome Discount for new customers"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <div className="form-grid-2">
                <label>
                  Discount Type *
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (KES)</option>
                  </select>
                </label>
                <label>
                  Discount Value *
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid-2">
                <label>
                  Min Order Value (KES)
                  <input
                    type="number"
                    value={minOrderValueKes}
                    onChange={(e) => setMinOrderValueKes(e.target.value)}
                  />
                </label>
                {discountType === 'percentage' && (
                  <label>
                    Max Discount Cap (KES)
                    <input
                      type="number"
                      placeholder="Optional cap"
                      value={maxDiscountKes}
                      onChange={(e) => setMaxDiscountKes(e.target.value)}
                    />
                  </label>
                )}
              </div>

              <label>
                Usage Limit (Max Redemptions)
                <input
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                />
              </label>

              <label className="checkbox-label mt-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active and redeemable at checkout</span>
              </label>

              <div className="sf-modal-actions mt-3">
                <button type="submit" className="primary-button">{editingCoupon ? 'Save Changes' : 'Create Coupon'}</button>
                <button type="button" className="outline-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
