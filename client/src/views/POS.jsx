import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes } from '../utils/format.js';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Printer,
  Barcode,
  ShoppingBag,
  CreditCard,
  Banknote,
  RotateCcw
} from 'lucide-react';

export default function POS({ currentUser, onSaleComplete }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [tenderedInput, setTenderedInput] = useState('');
  const [customerName, setCustomerName] = useState('Counter Customer');
  const [customerPhone, setCustomerPhone] = useState('0700000000');
  const [completedOrder, setCompletedOrder] = useState(null);
  const [completedChange, setCompletedChange] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCatalog();
  }, [selectedCategory, search]);

  async function loadCatalog() {
    try {
      const [prodsRes, catsRes] = await Promise.all([
        api.getProducts(`status=active${selectedCategory ? `&categoryId=${selectedCategory}` : ''}${search ? `&search=${search}` : ''}`),
        api.getCategories()
      ]);
      setProducts(prodsRes.products || []);
      setCategories(catsRes.categories || []);
    } catch (err) {
      console.error('POS Catalog load error:', err);
    }
  }

  function addToCart(prod) {
    const avail = prod.available;
    if (avail <= 0) return;

    setCart((prev) => {
      const existing = prev.find((i) => i._id === prod._id);
      if (existing) {
        if (existing.quantity >= avail) return prev;
        return prev.map((i) => (i._id === prod._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...prod, quantity: 1 }];
    });
  }

  function updateQty(id, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i._id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  }

  const subtotal = cart.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);
  // Calculate VAT 16% on standard taxable items
  const taxTotal = cart.reduce((sum, i) => {
    return sum + (i.taxCategory === 'standard' ? Math.round(i.sellingPrice * i.quantity * 0.16) : 0);
  }, 0);
  const grandTotal = subtotal + taxTotal;

  const tenderedCents = Math.round(Number(tenderedInput || 0) * 100);
  const changeDue = Math.max(0, tenderedCents - grandTotal);
  const canComplete = cart.length > 0 && tenderedCents >= grandTotal;

  async function handleCompleteSale() {
    if (!canComplete) return;
    setError('');
    setProcessing(true);

    try {
      // 1. Create order
      const items = cart.map((i) => ({ productId: i._id, quantity: i.quantity }));
      const orderRes = await api.createOrder({
        customerName: customerName.trim() || 'Counter Customer',
        customerPhone: customerPhone.trim() || '0700000000',
        fulfilmentType: 'pickup',
        items,
        paymentMethod: 'cash'
      });

      const order = orderRes.order;

      // 2. Record cash payment and commit stock
      const payRes = await api.recordCash({
        orderId: order._id,
        tenderedAmount: tenderedCents
      });

      // 3. Mark completed
      await api.updateOrderStatus(order._id, 'completed', 'POS counter handover');

      setCompletedOrder(payRes.order || order);
      setCompletedChange(payRes.changeAmount || changeDue);
      setCart([]);
      setTenderedInput('');
      loadCatalog();
      if (onSaleComplete) onSaleComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="pos-layout">
      {/* Left Column: Product Grid & Barcode Search */}
      <div className="pos-catalog">
        <div className="pos-search-bar">
          <div className="pos-input-wrap">
            <Barcode size={18} className="pos-icon" />
            <input
              type="text"
              placeholder="Scan barcode or type SKU / product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="pos-cats-scroll">
            <button
              className={`pos-cat-tab ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              All Items
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                className={`pos-cat-tab ${selectedCategory === c._id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c._id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pos-grid">
          {products.map((p) => (
            <div
              key={p._id}
              className={`pos-item-card ${p.available <= 0 ? 'disabled' : ''}`}
              onClick={() => addToCart(p)}
            >
              <div className="pos-item-img">
                <img src={p.imageUrl} alt={p.name} />
                <span className="pos-sku-badge">{p.sku}</span>
              </div>
              <div className="pos-item-meta">
                <h4>{p.name}</h4>
                <div className="pos-item-bottom">
                  <strong>{formatKes(p.sellingPrice)}</strong>
                  <span className={`pos-avail-pill ${p.available <= 5 ? 'warn' : ''}`}>
                    {p.available} in stock
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Active Cart & Cash Calculator */}
      <div className="pos-ticket">
        <div className="pos-ticket-header">
          <h3>POS Quick Sale</h3>
          <span className="pos-cashier-badge">Cashier: {currentUser?.name || 'Staff'}</span>
        </div>

        <div className="pos-customer-bar">
          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        {error && <div className="sf-alert danger">{error}</div>}

        <div className="pos-items-table">
          {cart.length === 0 ? (
            <div className="pos-empty-cart">
              <ShoppingBag size={32} className="muted" />
              <p>Click items on the left or scan barcode to add to this sale.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item._id} className="pos-cart-row">
                <div className="pos-row-left">
                  <b>{item.name}</b>
                  <small>{formatKes(item.sellingPrice)} each</small>
                </div>
                <div className="pos-qty-actions">
                  <button onClick={() => updateQty(item._id, -1)}><Minus size={12} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(item._id, 1)}><Plus size={12} /></button>
                </div>
                <strong className="pos-row-price">{formatKes(item.sellingPrice * item.quantity)}</strong>
              </div>
            ))
          )}
        </div>

        {/* Calculation Summary */}
        <div className="pos-summary-box">
          <div className="pos-sum-line"><span>Subtotal:</span> <span>{formatKes(subtotal)}</span></div>
          <div className="pos-sum-line"><span>VAT (16% standard):</span> <span>{formatKes(taxTotal)}</span></div>
          <div className="pos-sum-line total"><span>Total Due:</span> <strong>{formatKes(grandTotal)}</strong></div>

          {/* Cash Tender & Change */}
          <div className="pos-tender-row">
            <label>
              <span>Cash Tendered (KES):</span>
              <input
                type="number"
                step="5"
                placeholder="0.00"
                value={tenderedInput}
                onChange={(e) => setTenderedInput(e.target.value)}
              />
            </label>
            <div className="pos-change-display">
              <span>Change Due:</span>
              <strong className={changeDue > 0 ? 'text-emerald' : ''}>
                {formatKes(changeDue)}
              </strong>
            </div>
          </div>

          {/* Quick Cash Presets */}
          <div className="pos-cash-presets">
            {[100, 200, 500, 1000, 2000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTenderedInput(String(amt))}
              >
                KES {amt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTenderedInput((grandTotal / 100).toFixed(2))}
            >
              Exact
            </button>
          </div>

          <button
            className="primary-button full-width pos-checkout-btn"
            disabled={!canComplete || processing}
            onClick={handleCompleteSale}
          >
            {processing ? 'Recording Sale...' : `Complete Sale (${formatKes(grandTotal)})`}
          </button>
        </div>
      </div>

      {/* Sale Complete Modal & Receipt */}
      {completedOrder && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card">
            <div className="sf-order-confirmed-banner">
              <CheckCircle size={40} className="text-emerald" />
              <h2>Sale Completed!</h2>
              <p>Order: <b>{completedOrder.orderNumber}</b></p>
              <div className="pos-change-banner">
                <span>CHANGE TO RETURN:</span>
                <strong>{formatKes(completedChange)}</strong>
              </div>
            </div>

            <div className="sf-modal-actions">
              <button className="primary-button" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="outline-button" onClick={() => setCompletedOrder(null)}>
                Start Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
