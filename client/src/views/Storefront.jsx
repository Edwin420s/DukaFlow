import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes, formatDate } from '../utils/format.js';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Clock,
  Truck,
  ArrowRight,
  ShieldCheck,
  Phone,
  Printer,
  X,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';

export default function Storefront({ onSwitchToPortal }) {
  const [shop, setShop] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state persisted in localStorage
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dukaflow_cart')) || [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [fulfilmentType, setFulfilmentType] = useState('pickup');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryZone, setDeliveryZone] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [checkoutTotals, setCheckoutTotals] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Active / Tracked Order
  const [activeOrder, setActiveOrder] = useState(null);
  const [trackOrderInput, setTrackOrderInput] = useState('');
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [mpesaPromptSent, setMpesaPromptSent] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? '' : cur));
    }, 3200);
  }

  useEffect(() => {
    localStorage.setItem('dukaflow_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    loadStorefront();
  }, [selectedCategory, searchQuery]);

  async function loadStorefront() {
    try {
      setLoading(true);
      const [shopRes, catsRes, prodsRes] = await Promise.all([
        api.getStorefrontShop(),
        api.getStorefrontCategories(),
        api.getStorefrontProducts(
          `${selectedCategory ? `category=${selectedCategory}&` : ''}${searchQuery ? `search=${searchQuery}&` : ''}inStockOnly=false`
        )
      ]);
      setShop(shopRes.shop);
      setCategories(catsRes.categories);
      setProducts(prodsRes.products);
      if (shopRes.shop?.deliveryZones?.length > 0 && !deliveryZone) {
        setDeliveryZone(shopRes.shop.deliveryZones[0].name);
      }
    } catch (err) {
      console.error('Failed to load storefront:', err);
    } finally {
      setLoading(false);
    }
  }

  // Recalculate totals whenever cart, coupon, or delivery changes
  useEffect(() => {
    if (cart.length === 0) {
      setCheckoutTotals(null);
      return;
    }
    recalculate(appliedCoupon, fulfilmentType, deliveryZone);
  }, [cart, appliedCoupon, fulfilmentType, deliveryZone]);

  async function recalculate(coupon, fulfilment, zone) {
    try {
      const items = cart.map((i) => ({ productId: i.id, quantity: i.quantity }));
      const totals = await api.calculateStorefront({
        items,
        couponCode: coupon,
        fulfilmentType: fulfilment,
        deliveryZoneName: zone
      });
      setCheckoutTotals(totals);
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.message);
    }
  }

  function addToCart(product) {
    if (!product.inStock) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`✓ Added "${product.name}" to your basket.`);
  }

  function updateQuantity(productId, delta) {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.id !== productId));
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    try {
      await recalculate(couponCode.trim(), fulfilmentType, deliveryZone);
      setAppliedCoupon(couponCode.trim());
      setCouponCode('');
      showToast(`Coupon "${couponCode.trim()}" applied!`);
    } catch (err) {
      setErrorMessage(err.message);
    }
  }

  async function applyQuickCoupon(codeToApply) {
    try {
      await recalculate(codeToApply, fulfilmentType, deliveryZone);
      setAppliedCoupon(codeToApply);
      setCouponCode('');
      setErrorMessage('');
      showToast(`Coupon "${codeToApply}" applied!`);
    } catch (err) {
      setErrorMessage(err.message);
    }
  }

  function removeCoupon() {
    setAppliedCoupon('');
    recalculate('', fulfilmentType, deliveryZone);
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName || !customerPhone) {
      setErrorMessage('Please provide your name and phone number.');
      return;
    }

    if (fulfilmentType === 'delivery' && !deliveryStreet) {
      setErrorMessage('Please provide a delivery street address.');
      return;
    }

    try {
      setSubmitting(true);
      const items = cart.map((i) => ({ productId: i.id, quantity: i.quantity }));

      const res = await api.createStorefrontOrder({
        customerName,
        customerPhone,
        customerEmail,
        fulfilmentType,
        deliveryAddress: {
          street: deliveryStreet,
          zone: deliveryZone,
          instructions: deliveryInstructions
        },
        items,
        couponCode: appliedCoupon,
        paymentMethod
      });

      const order = res.order;
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);

      // If M-Pesa selected, initiate STK push
      if (paymentMethod === 'mpesa') {
        const phoneToUse = mpesaPhone || customerPhone;
        const stkRes = await api.initiateMpesa({
          orderId: order._id,
          phoneNumber: phoneToUse
        });
        setCheckoutRequestId(stkRes.checkoutRequestId);
        setMpesaPromptSent(true);
      } else if (paymentMethod === 'simulated') {
        // Auto-pay simulated
        await api.simulatePayment({ orderId: order._id });
        const refreshed = await api.getStorefrontOrder(order.orderNumber);
        order.paymentStatus = refreshed.order.paymentStatus;
      }

      setActiveOrder(order);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSimulateMpesaPinSuccess() {
    if (!checkoutRequestId) return;
    try {
      await api.simulateMpesaSuccess(checkoutRequestId);
      const refreshed = await api.getStorefrontOrder(activeOrder.orderNumber);
      setActiveOrder(refreshed.order);
      setMpesaPromptSent(false);
    } catch (err) {
      alert(`Simulation error: ${err.message}`);
    }
  }

  async function lookupOrder(orderNum) {
    if (!orderNum) return;
    try {
      const res = await api.getStorefrontOrder(orderNum.trim());
      setActiveOrder(res.order);
      setIsTrackModalOpen(false);
    } catch (err) {
      alert(err.message || 'Order not found');
    }
  }

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="storefront-page">
      {/* Top Announcements Banner */}
      <div className="sf-announcement">
        <span>📍 Same-Day Express Delivery across Nairobi & Free In-Store Pickup at Commercial Plaza</span>
        <button onClick={onSwitchToPortal} className="sf-portal-badge">
          Staff Portal & POS →
        </button>
      </div>

      {/* Storefront Header */}
      <header className="sf-header">
        <div className="sf-header-container">
          <div className="sf-brand">
            <span className="sf-brand-icon">D</span>
            <div>
              <span className="sf-brand-title">DukaFlow</span>
              <span className="sf-brand-tag">Smart Retail Store</span>
            </div>
          </div>

          <div className="sf-search-bar">
            <Search size={18} className="sf-search-icon" />
            <input
              type="text"
              placeholder="Search maize meal, fresh tomatoes, milk, cooking oil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="sf-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="sf-header-actions">
            <button
              className="sf-btn-track"
              onClick={() => setIsTrackModalOpen(true)}
              title="Track existing order status"
            >
              <Clock size={16} /> Track Order
            </button>

            <button
              className="sf-btn-cart"
              onClick={() => setIsCartOpen(true)}
              aria-label="View Shopping Cart"
            >
              <ShoppingBag size={18} />
              <span>Cart</span>
              {totalCartCount > 0 && <span className="sf-cart-badge">{totalCartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase */}
      <section className="sf-hero">
        <div className="sf-hero-content">
          <span className="sf-hero-pill">✓ Always Fresh & Authoritative Prices in KES</span>
          <h1>Fresh Groceries & Household Essentials</h1>
          <p>
            Order your everyday kitchen staples and household needs. Pay conveniently with M-Pesa STK Push or Cash on delivery.
          </p>
        </div>
      </section>

      {/* Category Pills Navigation */}
      <nav className="sf-categories-bar">
        <button
          className={`sf-cat-pill ${selectedCategory === '' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('')}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            className={`sf-cat-pill ${selectedCategory === cat.slug ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* Main Catalog Grid */}
      <main className="sf-catalog-section">
        {loading ? (
          <div className="sf-loading-grid">
            <p>Loading fresh items from catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={36} />
            <h2>No products found</h2>
            <p>Try searching for a different item or category.</p>
          </div>
        ) : (
          <div className="sf-product-grid">
            {products.map((prod) => {
              const inCartItem = cart.find((i) => i.id === prod.id);
              return (
                <article key={prod.id} className="sf-product-card">
                  <div
                    className="sf-product-img-wrap"
                    onClick={() => setSelectedProduct(prod)}
                  >
                    <img
                      src={prod.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'}
                      alt={prod.name}
                      loading="lazy"
                    />
                    {prod.isLowStock && <span className="sf-stock-badge low">Only {prod.available} left</span>}
                    {!prod.inStock && <span className="sf-stock-badge out">Out of stock</span>}
                  </div>

                  <div className="sf-product-info">
                    <span className="sf-prod-cat">{prod.categoryName}</span>
                    <h3 onClick={() => setSelectedProduct(prod)}>{prod.name}</h3>
                    <p className="sf-prod-unit">{prod.unit || 'unit'}</p>

                    <div className="sf-prod-footer">
                      <div className="sf-prod-price">
                        <strong>{formatKes(prod.sellingPrice)}</strong>
                      </div>

                      {inCartItem ? (
                        <div className="sf-qty-controller">
                          <button onClick={() => updateQuantity(prod.id, -1)} aria-label="Decrease quantity">
                            <Minus size={13} />
                          </button>
                          <span>{inCartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(prod.id, 1)}
                            disabled={inCartItem.quantity >= prod.available}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="sf-btn-add"
                          onClick={() => addToCart(prod)}
                          disabled={!prod.inStock}
                        >
                          <Plus size={15} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="sf-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <aside className="sf-cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sf-drawer-header">
              <h2>Your Shopping Basket ({totalCartCount})</h2>
              <button className="sf-close-btn" onClick={() => setIsCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="sf-empty-cart">
                <ShoppingBag size={48} className="muted" />
                <p>Your basket is currently empty.</p>
                <button className="primary-button" onClick={() => setIsCartOpen(false)}>
                  Browse Products
                </button>
              </div>
            ) : (
              <>
                <div className="sf-cart-items-list">
                  {cart.map((item) => (
                    <div key={item.id} className="sf-cart-row">
                      <img src={item.imageUrl} alt={item.name} />
                      <div className="sf-cart-row-details">
                        <h4>{item.name}</h4>
                        <span className="sf-cart-unit-price">{formatKes(item.sellingPrice)} / {item.unit}</span>
                        <div className="sf-cart-row-actions">
                          <div className="sf-qty-controller small">
                            <button onClick={() => updateQuantity(item.id, -1)}><Minus size={12} /></button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)}><Plus size={12} /></button>
                          </div>
                          <button className="sf-btn-remove" onClick={() => removeFromCart(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="sf-cart-row-total">
                        <strong>{formatKes(item.sellingPrice * item.quantity)}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Code Input */}
                <div className="sf-coupon-section">
                  {appliedCoupon ? (
                    <div className="sf-applied-coupon">
                      <span>✓ Coupon <b>{appliedCoupon}</b> applied!</span>
                      <button onClick={removeCoupon}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <div className="sf-coupon-input-group">
                        <input
                          type="text"
                          placeholder="Enter coupon code..."
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                        <button onClick={applyCoupon}>Apply</button>
                      </div>
                      <div className="sf-quick-offers">
                        <small className="text-muted">Available Offers (Click to apply):</small>
                        <div className="sf-offer-pills">
                          <button
                            type="button"
                            className="sf-offer-chip"
                            onClick={() => applyQuickCoupon('KARIBU10')}
                          >
                            🏷️ <b>KARIBU10</b> (10% off)
                          </button>
                          <button
                            type="button"
                            className="sf-offer-chip"
                            onClick={() => applyQuickCoupon('DUKA200')}
                          >
                            🏷️ <b>DUKA200</b> (KSh 200 off)
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {errorMessage && <p className="sf-error-msg">{errorMessage}</p>}
                </div>

                {/* Order Summary Totals */}
                {checkoutTotals && (
                  <div className="sf-drawer-totals">
                    <div className="sf-total-row">
                      <span>Subtotal</span>
                      <span>{formatKes(checkoutTotals.subtotal)}</span>
                    </div>
                    {checkoutTotals.discountTotal > 0 && (
                      <div className="sf-total-row discount">
                        <span>Discount ({checkoutTotals.couponCode})</span>
                        <span>-{formatKes(checkoutTotals.discountTotal)}</span>
                      </div>
                    )}
                    <div className="sf-total-row">
                      <span>VAT (16% inclusive/standard)</span>
                      <span>{formatKes(checkoutTotals.taxTotal)}</span>
                    </div>
                    <div className="sf-total-row">
                      <span>Delivery Fee</span>
                      <span>{checkoutTotals.deliveryFee > 0 ? formatKes(checkoutTotals.deliveryFee) : 'Free Pickup'}</span>
                    </div>
                    <div className="sf-total-row grand">
                      <span>Total to Pay</span>
                      <strong>{formatKes(checkoutTotals.grandTotal)}</strong>
                    </div>
                  </div>
                )}

                <div className="sf-drawer-footer">
                  <button
                    className="primary-button full-width"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                  >
                    Proceed to Checkout ({formatKes(checkoutTotals?.grandTotal || 0)})
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card large">
            <div className="sf-drawer-header">
              <h2>Complete Your Order</h2>
              <button className="sf-close-btn" onClick={() => setIsCheckoutOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="sf-checkout-form">
              {errorMessage && <div className="sf-alert danger">{errorMessage}</div>}

              <div className="sf-form-section">
                <h3>1. Customer Contact Details</h3>
                <div className="sf-form-grid">
                  <label>
                    Full Name *
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel Kiprop"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </label>
                  <label>
                    Phone Number (for M-Pesa / Updates) *
                    <input
                      type="tel"
                      required
                      placeholder="07XXXXXXXX or 01XXXXXXXX"
                      value={customerPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerPhone(val);
                        if (!mpesaPhone || mpesaPhone === customerPhone) {
                          setMpesaPhone(val);
                        }
                      }}
                    />
                  </label>
                  <label className="full-col">
                    Email Address (Optional)
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="sf-form-section">
                <h3>2. Fulfilment Method</h3>
                <div className="sf-fulfilment-choices">
                  <label className={`sf-radio-card ${fulfilmentType === 'pickup' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="fulfilment"
                      value="pickup"
                      checked={fulfilmentType === 'pickup'}
                      onChange={() => setFulfilmentType('pickup')}
                    />
                    <div>
                      <strong>Free In-Store Collection</strong>
                      <small>Ready at Biashara Plaza counter in 30 minutes</small>
                    </div>
                  </label>

                  <label className={`sf-radio-card ${fulfilmentType === 'delivery' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="fulfilment"
                      value="delivery"
                      checked={fulfilmentType === 'delivery'}
                      onChange={() => setFulfilmentType('delivery')}
                    />
                    <div>
                      <strong>Doorstep Express Delivery</strong>
                      <small>Delivered straight to your doorstep</small>
                    </div>
                  </label>
                </div>

                {fulfilmentType === 'delivery' && (
                  <div className="sf-delivery-details">
                    <label>
                      Delivery Zone
                      <select
                        value={deliveryZone}
                        onChange={(e) => setDeliveryZone(e.target.value)}
                      >
                        {shop?.deliveryZones?.map((z) => (
                          <option key={z._id} value={z.name}>
                            {z.name} (+{formatKes(z.fee)}) - {z.estimatedTime}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Street Address & Apartment/House No. *
                      <input
                        type="text"
                        required
                        placeholder="e.g. House 4B, Woodley Estate, Jamhuri Rd"
                        value={deliveryStreet}
                        onChange={(e) => setDeliveryStreet(e.target.value)}
                      />
                    </label>

                    <label>
                      Delivery Notes / Landmark
                      <input
                        type="text"
                        placeholder="e.g. Gate 2 near corner shop, ring doorbell"
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="sf-form-section">
                <h3>3. Payment Method</h3>
                <div className="sf-payment-choices">
                  <label className={`sf-radio-card ${paymentMethod === 'mpesa' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mpesa"
                      checked={paymentMethod === 'mpesa'}
                      onChange={() => setPaymentMethod('mpesa')}
                    />
                    <Smartphone size={20} className="sf-pay-icon mpesa" />
                    <div>
                      <strong>M-Pesa STK Push</strong>
                      <small>Receive instant prompt on your Safaricom phone to enter PIN</small>
                    </div>
                  </label>

                  <label className={`sf-radio-card ${paymentMethod === 'cash' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                    />
                    <Banknote size={20} className="sf-pay-icon" />
                    <div>
                      <strong>Cash on {fulfilmentType === 'delivery' ? 'Delivery' : 'Pickup'}</strong>
                      <small>Pay cash directly to the cashier or delivery rider</small>
                    </div>
                  </label>

                  <label className={`sf-radio-card ${paymentMethod === 'simulated' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="simulated"
                      checked={paymentMethod === 'simulated'}
                      onChange={() => setPaymentMethod('simulated')}
                    />
                    <CreditCard size={20} className="sf-pay-icon" />
                    <div>
                      <strong>Instant Card / Online Simulation</strong>
                      <small>Instant debit card or electronic settlement</small>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'mpesa' && (
                  <div className="sf-mpesa-box">
                    <p>Enter the phone number that will receive the STK PIN prompt:</p>
                    <input
                      type="tel"
                      placeholder={customerPhone || '07XXXXXXXX'}
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {checkoutTotals && (
                <div className="sf-checkout-summary-bar">
                  <div>
                    <span>Total Amount:</span>
                    <strong>{formatKes(checkoutTotals.grandTotal)}</strong>
                  </div>
                  <button type="submit" className="primary-button" disabled={submitting}>
                    {submitting ? 'Placing Order...' : 'Confirm & Place Order'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Active Order Confirmation & Tracking Screen */}
      {activeOrder && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card large print-content">
            <div className="sf-order-confirmed-banner">
              <CheckCircle size={44} className="text-emerald" />
              <h2>Order Confirmed!</h2>
              <p className="sf-order-ref">Order Reference: <strong>{activeOrder.orderNumber}</strong></p>
              <p className="muted">Thank you, {activeOrder.customerName}. Your order is recorded in the DukaFlow system.</p>
            </div>

            {/* M-Pesa STK Prompt Simulation for Demo/Sandbox */}
            {mpesaPromptSent && activeOrder.paymentStatus !== 'paid' && (
              <div className="sf-stk-simulation-card">
                <Smartphone size={24} />
                <div>
                  <h4>M-Pesa STK Push Sent!</h4>
                  <p>A Safaricom prompt was triggered to <b>{activeOrder.customerPhone}</b>.</p>
                  <p className="text-xs text-muted">For testing/demo: you can simulate entering PIN and confirming payment.</p>
                </div>
                <button
                  className="sf-btn-simulate-pin"
                  onClick={handleSimulateMpesaPinSuccess}
                >
                  ✓ Simulate Customer Entered PIN
                </button>
              </div>
            )}

            {/* Order Status Stepper */}
            <div className="sf-order-stepper">
              {[
                { key: 'pending', label: 'Order Placed' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'preparing', label: 'Packing Items' },
                { key: 'ready_for_pickup', label: activeOrder.fulfilmentType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup' },
                { key: 'completed', label: 'Completed' }
              ].map((step, idx) => {
                const isCurrent = activeOrder.orderStatus === step.key;
                const isPast = ['completed', 'ready_for_pickup', 'dispatched', 'preparing', 'confirmed'].includes(activeOrder.orderStatus);
                return (
                  <div key={step.key} className={`sf-step-item ${isCurrent ? 'active' : ''}`}>
                    <span className="sf-step-num">{idx + 1}</span>
                    <span className="sf-step-label">{step.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Receipt Summary Table */}
            <div className="sf-receipt-box">
              <div className="sf-receipt-header">
                <h3>{shop?.name || 'DukaFlow Groceries'}</h3>
                <p>{shop?.receiptHeader}</p>
                <div className="sf-receipt-meta">
                  <span>Date: {formatDate(activeOrder.createdAt)}</span>
                  <span>Payment: {activeOrder.paymentMethod.toUpperCase()} ({activeOrder.paymentStatus.toUpperCase()})</span>
                  <span>Fulfilment: {activeOrder.fulfilmentType.toUpperCase()}</span>
                </div>
              </div>

              <table className="sf-receipt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrder.items.map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.productName}</td>
                      <td>{i.quantity}</td>
                      <td>{formatKes(i.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}>{formatKes(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="sf-receipt-footer-totals">
                <div><span>Subtotal:</span> <span>{formatKes(activeOrder.subtotal)}</span></div>
                {activeOrder.discountTotal > 0 && <div><span>Discount:</span> <span>-{formatKes(activeOrder.discountTotal)}</span></div>}
                <div><span>VAT (16%):</span> <span>{formatKes(activeOrder.taxTotal)}</span></div>
                <div><span>Delivery:</span> <span>{formatKes(activeOrder.deliveryFee)}</span></div>
                <div className="sf-receipt-grand"><span>Total:</span> <strong>{formatKes(activeOrder.grandTotal)}</strong></div>
              </div>

              <p className="sf-receipt-footer-notes">{shop?.receiptFooter}</p>
            </div>

            <div className="sf-modal-actions no-print">
              <button className="primary-button" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="outline-button" onClick={() => setActiveOrder(null)}>
                Close & Return to Shop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track Order Modal */}
      {isTrackModalOpen && (
        <div className="sf-modal-overlay" onClick={() => setIsTrackModalOpen(false)}>
          <div className="sf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sf-drawer-header">
              <h2>Track Your Order</h2>
              <button className="sf-close-btn" onClick={() => setIsTrackModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="sf-track-body">
              <p>Enter the Order Reference Number received on checkout (e.g. ORD-202611-1001):</p>
              <input
                type="text"
                placeholder="ORD-YYYYMMDD-XXXX"
                value={trackOrderInput}
                onChange={(e) => setTrackOrderInput(e.target.value.toUpperCase())}
              />
              <button
                className="primary-button full-width"
                onClick={() => lookupOrder(trackOrderInput)}
              >
                Track Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="sf-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="sf-modal-card product-detail" onClick={(e) => e.stopPropagation()}>
            <button className="sf-close-btn top-right" onClick={() => setSelectedProduct(null)}><X size={20} /></button>
            <div className="sf-prod-modal-grid">
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} />
              <div className="sf-prod-modal-info">
                <span className="sf-prod-cat">{selectedProduct.categoryName}</span>
                <h2>{selectedProduct.name}</h2>
                <p className="sf-prod-sku">SKU: {selectedProduct.sku}</p>
                <strong className="sf-modal-price">{formatKes(selectedProduct.sellingPrice)}</strong>
                <p className="sf-prod-desc">{selectedProduct.description || 'High quality fresh retail item.'}</p>
                <div className="sf-modal-stock">
                  {selectedProduct.inStock ? (
                    <span className="text-emerald">✓ In Stock ({selectedProduct.available} available)</span>
                  ) : (
                    <span className="text-danger">Out of stock</span>
                  )}
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={!selectedProduct.inStock}
                >
                  <Plus size={16} /> Add to Basket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Toast Notification */}
      {toastMessage && (
        <aside className="sf-toast-pill" role="status" aria-live="polite">
          <span>{toastMessage}</span>
          <button onClick={() => setIsCartOpen(true)} className="sf-toast-action">
            View Basket ({totalCartCount}) →
          </button>
        </aside>
      )}

      {/* Mobile Floating Sticky Cart Bar */}
      {totalCartCount > 0 && !isCartOpen && !isCheckoutOpen && (
        <div className="sf-mobile-cart-bar">
          <div className="sf-mobile-cart-info">
            <ShoppingBag size={18} />
            <span><b>{totalCartCount}</b> items</span>
            <span className="dot">·</span>
            <strong>{formatKes(checkoutTotals?.grandTotal || cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0))}</strong>
          </div>
          <button className="primary-button" onClick={() => setIsCartOpen(true)}>
            View Basket →
          </button>
        </div>
      )}
    </div>
  );
}
