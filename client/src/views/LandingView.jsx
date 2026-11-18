import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  Boxes,
  ShieldCheck,
  TrendingUp,
  Truck,
  RotateCcw,
  Zap,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  CreditCard,
  WifiOff,
  Users,
  Smartphone,
  Sparkles,
  HelpCircle,
  Clock,
  Layers,
  Lock
} from 'lucide-react';

export default function LandingView({ onLoginClick, currentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos');
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="landing-page">
      {/* ----------------- Top Navigation ----------------- */}
      <header className="landing-header">
        <div className="landing-container nav-container">
          <Link to="/" className="landing-brand">
            <span className="brand-mark">D</span>
            <span className="brand-text">Duka<span className="brand-accent">Flow</span></span>
            <span className="badge-enterprise">ENTERPRISE</span>
          </Link>

          <nav className="landing-nav-links">
            <a href="#pos">POS Counter</a>
            <a href="#storefront">Storefront</a>
            <a href="#inventory">Stockroom</a>
            <a href="#roles">Team Roles</a>
            <a href="#benefits">Why DukaFlow</a>
            <a href="#faqs">FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            <a href="#faqs" className="nav-faq-btn">
              <HelpCircle size={15} />
              <span>FAQ</span>
            </a>

            <Link to="/storefront" className="nav-storefront-btn" title="Open Customer Online Store">
              <Store size={15} />
              <span>Customer Shop</span>
              <span className="ext-icon">↗</span>
            </Link>

            {currentUser ? (
              <button
                className="nav-portal-btn logged-in"
                onClick={() => navigate(currentUser.role === 'cashier' ? '/pos' : currentUser.role === 'customer' ? '/orders' : '/dashboard')}
              >
                <span>My Workspace ({currentUser.name.split(' ')[0]})</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button className="nav-portal-btn" onClick={() => navigate('/login')}>
                <span>Staff Sign In</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ----------------- Hero Section ----------------- */}
      <section className="landing-hero">
        <div className="landing-container hero-container">
          <div className="hero-pill">
            <Sparkles size={14} className="text-emerald-500" />
            <span>Built for Modern African Retail & Omnichannel Commerce</span>
          </div>

          <h1 className="hero-title">
            The Complete Retail OS for <span className="highlight-gradient">African Commerce</span>
          </h1>

          <p className="hero-subtitle">
            From lightning-fast counter checkout with Kenyan note presets and offline resilience, to an integrated customer e-commerce storefront with M-Pesa STK push, multi-unit stock tracking, and tamper-evident audit trails.
          </p>

          <div className="hero-cta-group">
            <a href="#faqs" className="btn-hero-pill-faq">
              <HelpCircle size={16} />
              <span>FAQ</span>
            </a>
            <Link to="/storefront" className="btn-hero-primary">
              <Store size={18} />
              <span>Customer Shop</span>
              <span className="ext-icon">↗</span>
            </Link>
            {currentUser ? (
              <button
                className="btn-hero-secondary"
                onClick={() => navigate(currentUser.role === 'cashier' ? '/pos' : currentUser.role === 'customer' ? '/orders' : '/dashboard')}
              >
                <ShoppingBag size={18} />
                <span>Return to My Workspace ({currentUser.name.split(' ')[0]})</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="btn-hero-secondary"
                onClick={() => navigate('/login')}
              >
                <ShoppingBag size={18} />
                <span>Staff Sign In</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div className="hero-trust-bar">
            <div className="trust-item">
              <CheckCircle2 size={16} className="trust-icon" />
              <span>16% KRA VAT Automatic Calculations</span>
            </div>
            <div className="trust-item">
              <Smartphone size={16} className="trust-icon" />
              <span>M-Pesa Daraja STK Push Prompts</span>
            </div>
            <div className="trust-item">
              <WifiOff size={16} className="trust-icon" />
              <span>Offline-First PWA POS with Auto-Sync</span>
            </div>
            <div className="trust-item">
              <Lock size={16} className="trust-icon" />
              <span>Independent Accounts & Strict RBAC</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Interactive Platform Tour ----------------- */}
      <section className="landing-interactive-tabs" id="pos">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-kicker">INTERACTIVE TOUR</span>
            <h2 className="section-title">One Platform, Every Step of Retail Operations</h2>
            <p className="section-desc">Experience how DukaFlow synchronizes online shoppers, physical counter cashiers, warehouse inventory, and store executives.</p>
          </div>

          {/* Tab buttons */}
          <div className="tour-tabs-nav">
            <button
              className={`tour-tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
              onClick={() => setActiveTab('pos')}
            >
              <ShoppingBag size={17} />
              <span>High-Speed POS</span>
            </button>
            <button
              className={`tour-tab-btn ${activeTab === 'storefront' ? 'active' : ''}`}
              onClick={() => setActiveTab('storefront')}
            >
              <Store size={17} />
              <span>Customer Storefront</span>
            </button>
            <button
              className={`tour-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Boxes size={17} />
              <span>Inventory & Ledger</span>
            </button>
            <button
              className={`tour-tab-btn ${activeTab === 'purchasing' ? 'active' : ''}`}
              onClick={() => setActiveTab('purchasing')}
            >
              <Truck size={17} />
              <span>Purchasing & Returns</span>
            </button>
            <button
              className={`tour-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <TrendingUp size={17} />
              <span>Valuation & Analytics</span>
            </button>
          </div>

          {/* Tab content panels */}
          <div className="tour-tab-panel">
            {activeTab === 'pos' && (
              <div className="tour-grid">
                <div className="tour-text">
                  <span className="panel-badge">CASHIER DESK & TERMINAL</span>
                  <h3>Counter checkout optimized for African retail speed</h3>
                  <p>Keep your queue moving with lightning-fast barcode lookup, quick Kenyan banknote preset buttons (KES 50 to 2,000), real-time change calculation, and instant thermal receipt generation.</p>
                  <ul className="tour-feature-list">
                    <li><CheckCircle2 size={16} /> <b>Pre-configured KES Denominations:</b> 1-click cash tendering for KES 50, 100, 200, 500, 1,000, and 2,000 notes.</li>
                    <li><CheckCircle2 size={16} /> <b>Real-time Change Due Indicator:</b> Emerald high-contrast change display guarantees zero cashier miscalculations.</li>
                    <li><CheckCircle2 size={16} /> <b>Offline Outbox Resilience:</b> Never stop ringing sales during power or network cuts. Sales queue locally and auto-sync when online.</li>
                    <li><CheckCircle2 size={16} /> <b>Express Barcode & SKU Filtering:</b> Add products to cart via barcode scanner, SKU code, or quick category chips.</li>
                  </ul>
                  <div className="tour-actions">
                    <button className="primary-button" onClick={() => navigate('/login')}>Launch POS Counter</button>
                  </div>
                </div>
                <div className="tour-visual card-mockup">
                  <div className="mockup-header">
                    <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
                    <span className="mockup-title">DukaFlow POS Cashier Terminal</span>
                  </div>
                  <div className="pos-preview-content">
                    <div className="mock-pos-header">
                      <span>Counter Sale #ORD-202611-841</span>
                      <span className="status-pill status-ready_for_pickup">Tendering Active</span>
                    </div>
                    <div className="mock-cart-items">
                      <div className="mock-item-row">
                        <span>Jogoo Maize Meal 2kg × 2</span>
                        <b>KES 440.00</b>
                      </div>
                      <div className="mock-item-row">
                        <span>Menengai Bar Soap 800g × 1</span>
                        <b>KES 150.00</b>
                      </div>
                      <div className="mock-item-row">
                        <span>KCC Fresh Milk 500ml × 2</span>
                        <b>KES 130.00</b>
                      </div>
                    </div>
                    <div className="mock-tender-box">
                      <div className="tender-row">
                        <span>Total Payable:</span>
                        <b className="total-highlight">KES 720.00</b>
                      </div>
                      <div className="preset-chips">
                        <span className="chip">KES 50</span>
                        <span className="chip">KES 100</span>
                        <span className="chip">KES 500</span>
                        <span className="chip active">KES 1,000</span>
                      </div>
                      <div className="change-result">
                        <span>Change to Hand Customer:</span>
                        <b className="change-value">KES 280.00</b>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'storefront' && (
              <div className="tour-grid">
                <div className="tour-text">
                  <span className="panel-badge">E-COMMERCE & M-PESA</span>
                  <h3>Online ordering that syncs stock in real-time</h3>
                  <p>Give your neighborhood shoppers a fast online store. Customers browse goods, select pickup or neighborhood delivery, apply promo discount codes, and complete orders using automated M-Pesa STK prompts.</p>
                  <ul className="tour-feature-list">
                    <li><CheckCircle2 size={16} /> <b>Automated M-Pesa STK Push:</b> Prompts customer phone directly for PIN. Webhook marks payment paid idempotently.</li>
                    <li><CheckCircle2 size={16} /> <b>Atomic Stock Reservations:</b> Placing an order immediately holds inventory, preventing overselling online.</li>
                    <li><CheckCircle2 size={16} /> <b>Kenyan Tax Compliance:</b> Automatically computes 16% VAT on taxable items while preserving 0% on exempt staples.</li>
                    <li><CheckCircle2 size={16} /> <b>Neighborhood Delivery Zones:</b> Set custom delivery fees for local estates (CBD, Westlands, Kilimani, Karen).</li>
                  </ul>
                  <div className="tour-actions">
                    <Link to="/storefront" className="primary-button">View Live Storefront</Link>
                  </div>
                </div>
                <div className="tour-visual card-mockup">
                  <div className="mockup-header">
                    <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
                    <span className="mockup-title">Customer Storefront & Checkout</span>
                  </div>
                  <div className="storefront-preview-content">
                    <div className="mock-sf-cart">
                      <div className="mock-sf-item">
                        <div className="mock-thumb">🌽</div>
                        <div>
                          <b>Unga wa Dola 2kg</b>
                          <small>Dry Foods & Flour · Qty: 2</small>
                        </div>
                        <span className="price">KES 460.00</span>
                      </div>
                      <div className="mock-coupon-badge">
                        <span>Coupon Applied: <b>KARIBU10</b></span>
                        <span className="discount">- KES 46.00 (10%)</span>
                      </div>
                      <div className="mock-stk-box">
                        <Smartphone size={24} className="text-emerald-600" />
                        <div>
                          <b>M-Pesa STK Prompt Sent</b>
                          <p>STK push initiated to <b>0722 *** 122</b>. Customer entering PIN on phone.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="tour-grid">
                <div className="tour-text">
                  <span className="panel-badge">STOCKROOM CONTROL</span>
                  <h3>Atomic inventory ledger with audit compliance</h3>
                  <p>Track every unit with an immutable audit ledger. Support multi-unit conversions (cartons to pieces), track shelf adjustments with mandatory audit reasons, and receive automated restock alerts before running out.</p>
                  <ul className="tour-feature-list">
                    <li><CheckCircle2 size={16} /> <b>Immutable Stock Movement Ledger:</b> Every single purchase, sale, return, and shelf count logged with timestamp and user.</li>
                    <li><CheckCircle2 size={16} /> <b>Zero Overselling:</b> Atomic database reservations ensure online storefront never sells what counter cashier is scanning.</li>
                    <li><CheckCircle2 size={16} /> <b>Reason-Coded Shelf Adjustments:</b> Mandatory reason codes (damaged, expired, count correction, theft) with full notes.</li>
                  </ul>
                  <div className="tour-actions">
                    <button className="primary-button" onClick={() => navigate('/login')}>Open Inventory Manager</button>
                  </div>
                </div>
                <div className="tour-visual card-mockup">
                  <div className="mockup-header">
                    <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
                    <span className="mockup-title">Immutable Stock Ledger</span>
                  </div>
                  <div className="ledger-preview-content">
                    <div className="ledger-row positive">
                      <div>
                        <b>PO Receiving: Menengai Soap</b>
                        <small>Ref: PO-202611-392 · Supplier: Kapa Oil Refineries</small>
                      </div>
                      <span className="delta">+50 units</span>
                    </div>
                    <div className="ledger-row negative">
                      <div>
                        <b>POS Counter Sale</b>
                        <small>Ref: ORD-202611-841 · Cashier: Mercy Wanjiku</small>
                      </div>
                      <span className="delta">-2 units</span>
                    </div>
                    <div className="ledger-row adjustment">
                      <div>
                        <b>Physical Count Correction</b>
                        <small>Reason: Found carton behind rack · User: John Kamau</small>
                      </div>
                      <span className="delta">+5 units</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'purchasing' && (
              <div className="tour-grid">
                <div className="tour-text">
                  <span className="panel-badge">SUPPLY CHAIN & RETURNS</span>
                  <h3>Purchase orders, weighted costing & quarantine restock</h3>
                  <p>Streamline relationships with suppliers like Brookside, Unga Group, and Bidco. Place purchase orders, inspect incoming goods, automatically recompute weighted average cost, and process customer returns.</p>
                  <ul className="tour-feature-list">
                    <li><CheckCircle2 size={16} /> <b>Purchase Order Lifecycle:</b> Draft → Ordered → Partial / Received with automatic stock receipting.</li>
                    <li><CheckCircle2 size={16} /> <b>Returns Quarantine & Inspection:</b> Inspected items can be marked for Restock (auto-increments onHand) or Discarded.</li>
                    <li><CheckCircle2 size={16} /> <b>Supplier Directory & Terms:</b> Track lead times, delivery terms, and minimum order values per supplier.</li>
                  </ul>
                  <div className="tour-actions">
                    <button className="primary-button" onClick={() => navigate('/login')}>Explore Supply Chain</button>
                  </div>
                </div>
                <div className="tour-visual card-mockup">
                  <div className="mockup-header">
                    <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
                    <span className="mockup-title">Purchase Order & Inspection</span>
                  </div>
                  <div className="po-preview-content">
                    <div className="po-card">
                      <div className="po-header">
                        <b>PO-202611-904 · Brookside Dairy</b>
                        <span className="status-pill status-completed">Received & Inspected</span>
                      </div>
                      <div className="po-details">
                        <span>Items: 100 cartons Fresh Milk 500ml</span>
                        <span>Total: KES 58,000.00</span>
                      </div>
                      <div className="inspection-badge">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>100 units inspected & restocked to on-hand inventory</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="tour-grid">
                <div className="tour-text">
                  <span className="panel-badge">EXECUTIVE INTELLIGENCE</span>
                  <h3>Live valuation, margins & 1-click CSV reports</h3>
                  <p>Empower store owners with real-time financial clarity. View daily gross margins, current total stock inventory valuation at cost versus retail, tender breakdowns (Cash vs M-Pesa), and download official CSV logs.</p>
                  <ul className="tour-feature-list">
                    <li><CheckCircle2 size={16} /> <b>Real-time Inventory Valuation:</b> Know exact total cost value and projected retail profit across all active SKUs.</li>
                    <li><CheckCircle2 size={16} /> <b>Tender Breakdown:</b> Transparent cash versus M-Pesa electronic reconciliations for smooth daily cashing up.</li>
                    <li><CheckCircle2 size={16} /> <b>1-Click CSV Exports:</b> Download complete sales ledgers formatted for your accountant or KRA filing.</li>
                  </ul>
                  <div className="tour-actions">
                    <button className="primary-button" onClick={() => navigate('/login')}>View Business Reports</button>
                  </div>
                </div>
                <div className="tour-visual card-mockup">
                  <div className="mockup-header">
                    <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
                    <span className="mockup-title">Executive Revenue & Valuation</span>
                  </div>
                  <div className="reports-preview-content">
                    <div className="kpi-grid">
                      <div className="kpi-box">
                        <small>Total Retail Value</small>
                        <b>KES 1,284,500</b>
                      </div>
                      <div className="kpi-box">
                        <small>Stock Cost Value</small>
                        <b>KES 986,200</b>
                      </div>
                      <div className="kpi-box highlight">
                        <small>Projected Profit Margin</small>
                        <b>KES 298,300 (23.2%)</b>
                      </div>
                    </div>
                    <div className="tender-pie-mock">
                      <div className="bar-item">
                        <span>M-Pesa STK Push (68%)</span>
                        <div className="bar-fill mpesa"></div>
                      </div>
                      <div className="bar-item">
                        <span>Counter Cash (32%)</span>
                        <div className="bar-fill cash"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ----------------- Role-Based Security Section ----------------- */}
      <section className="landing-roles-section" id="roles">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-kicker">STRICT RBAC & INDEPENDENT ACCOUNTS</span>
            <h2 className="section-title">Built for Real Shop Roles & Data Privacy</h2>
            <p className="section-desc">Each user sees strictly what they need. Cashiers focus on ringing sales without viewing owner settings, while customers see only their own receipts.</p>
          </div>

          <div className="roles-grid">
            {/* Owner Role */}
            <div className="role-card">
              <div className="role-icon-box owner">
                <ShieldCheck size={24} />
              </div>
              <h3>Shop Owner</h3>
              <p className="role-tagline">Complete executive visibility & control</p>
              <ul className="role-feature-bullets">
                <li>View financial reports, gross margin & inventory valuation</li>
                <li>Manage shop profile, VAT rates & M-Pesa credentials</li>
                <li>Hire, suspend & assign staff permissions</li>
                <li>Access full tamper-evident audit logs</li>
              </ul>
              <div className="demo-credentials">
                <span>Demo Email: <code>owner@dukaflow.co.ke</code></span>
                <span>Password: <code>DukaFlow2026!</code></span>
              </div>
              <button
                className="btn-role-action"
                onClick={() => navigate('/login?role=owner')}
              >
                Sign In as Owner →
              </button>
            </div>

            {/* Manager Role */}
            <div className="role-card">
              <div className="role-icon-box manager">
                <Boxes size={24} />
              </div>
              <h3>Store Manager</h3>
              <p className="role-tagline">Inventory, purchasing & stock control</p>
              <ul className="role-feature-bullets">
                <li>Adjust physical stock counts with reason codes</li>
                <li>Create and receive supplier purchase orders</li>
                <li>Inspect and restock returned items</li>
                <li>Access sales trends and product catalogs</li>
              </ul>
              <div className="demo-credentials">
                <span>Demo Email: <code>manager@dukaflow.co.ke</code></span>
                <span>Password: <code>DukaFlow2026!</code></span>
              </div>
              <button
                className="btn-role-action"
                onClick={() => navigate('/login?role=manager')}
              >
                Sign In as Manager →
              </button>
            </div>

            {/* Cashier Role */}
            <div className="role-card">
              <div className="role-icon-box cashier">
                <ShoppingBag size={24} />
              </div>
              <h3>POS Cashier</h3>
              <p className="role-tagline">High-speed counter sales & handover</p>
              <ul className="role-feature-bullets">
                <li>Touch-optimized cashier terminal & barcode lookup</li>
                <li>Quick KES cash tender presets & change calculator</li>
                <li>Thermal receipt printing & customer lookup</li>
                <li>Isolated from backoffice settings, staff & reports</li>
              </ul>
              <div className="demo-credentials">
                <span>Demo Email: <code>cashier@dukaflow.co.ke</code></span>
                <span>Password: <code>DukaFlow2026!</code></span>
              </div>
              <button
                className="btn-role-action"
                onClick={() => navigate('/login?role=cashier')}
              >
                Sign In as Cashier →
              </button>
            </div>

            {/* Customer Role */}
            <div className="role-card">
              <div className="role-icon-box customer">
                <Users size={24} />
              </div>
              <h3>Customer Account</h3>
              <p className="role-tagline">Personal orders & M-Pesa tracking</p>
              <ul className="role-feature-bullets">
                <li>Access online shop with 1-click cart addition</li>
                <li>Receive M-Pesa STK prompts on Kenyan line</li>
                <li>Track live delivery & pickup progress</li>
                <li>Strict privacy: never sees other customer records</li>
              </ul>
              <div className="demo-credentials">
                <span>Self-register or browse as Guest</span>
                <span>Public Storefront access</span>
              </div>
              <Link to="/storefront" className="btn-role-action customer-btn">
                Visit Customer Shop →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Why Retailers Choose DukaFlow ----------------- */}
      <section className="landing-benefits-section" id="benefits">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-kicker">BUILT FOR SPEED & RELIABILITY</span>
            <h2 className="section-title">Why Leading Retailers Choose DukaFlow</h2>
            <p className="section-desc">Engineered from the ground up for single-shop and multi-branch retail in Kenya and East Africa.</p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon-box">
                <Zap size={22} className="text-emerald-600" />
              </div>
              <h3>Zero-Latency POS Checkout</h3>
              <p>Scan barcodes or tap products and ring counter sales in under 3 seconds. Kenyan currency note presets and instant change calculations keep queues moving smoothly.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-box">
                <Smartphone size={22} className="text-emerald-600" />
              </div>
              <h3>Automated M-Pesa STK Push</h3>
              <p>Prompts the customer’s Safaricom phone directly for their PIN. Payment webhook callbacks confirm receipts with 100% idempotency—eliminating manual ledger cross-checks.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-box">
                <Boxes size={22} className="text-emerald-600" />
              </div>
              <h3>Atomic Inventory Protection</h3>
              <p>Orders hold live stock reservations at the database level. Counter sales and online orders never double-sell the same carton or piece.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-box">
                <WifiOff size={22} className="text-emerald-600" />
              </div>
              <h3>100% Offline PWA Resilience</h3>
              <p>Power cuts or local Wi-Fi drops won't stop your sales. Cashiers can continue ringing sales offline in the browser outbox, which synchronizes automatically upon reconnecting.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-box">
                <TrendingUp size={22} className="text-emerald-600" />
              </div>
              <h3>KRA 16% VAT Compliance</h3>
              <p>Automatic tax segregation for standard 16% VAT, zero-rated foodstuffs (flour, unflavored milk), and tax-exempt goods. Generate 1-click CSV files ready for accounting.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-box">
                <ShieldCheck size={22} className="text-emerald-600" />
              </div>
              <h3>Individual Account Privacy</h3>
              <p>Every business operates within its own dedicated data boundary. Granular role-based security ensures cashiers focus on sales without viewing confidential financial reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Frequently Asked Questions ----------------- */}
      <section className="landing-faq-section" id="faqs">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-kicker">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="section-title">Answers to Common Questions</h2>
            <p className="section-desc">Everything you need to know about setting up and running DukaFlow in your shop.</p>
          </div>

          <div className="faq-accordion">
            {[
              {
                q: 'What happens to the POS counter if the shop loses internet connection?',
                a: 'DukaFlow is designed offline-first. Our Progressive Web App (PWA) caches your product catalog and stores every tendered sale inside a secure browser outbox buffer. Cashiers continue ringing items, calculating change, and printing receipts uninterrupted. As soon as connectivity returns, sales automatically synchronize with the central server.'
              },
              {
                q: 'How does M-Pesa STK Push payment work for online and in-store orders?',
                a: 'When an order is submitted with M-Pesa, DukaFlow communicates directly with Safaricom Daraja API to prompt the customer’s phone for their PIN with the exact order total. Once approved, the callback confirms the payment idempotently and marks the order confirmed without manual reconciliation.'
              },
              {
                q: 'Are accounts independent? Can one shop see another shop’s inventory or customers?',
                a: 'Accounts are completely isolated. Each shop has its own dedicated data boundary. Furthermore, role-based access control (RBAC) ensures cashiers cannot view financial reports or shop settings, and customers can only view their own receipts.'
              },
              {
                q: 'How does DukaFlow handle Kenyan VAT and tax compliance?',
                a: 'DukaFlow supports standard 16% VAT, zero-rated goods (such as unflavored milk and maize meal), and exempt items. Taxes are automatically segregated on both customer invoices and backoffice sales CSV reports.'
              },
              {
                q: 'What hardware do I need to run DukaFlow?',
                a: 'DukaFlow runs smoothly in any modern web browser on PCs, laptops, Android POS terminals, tablets, and mobile smartphones. It supports standard USB/Bluetooth barcode scanners and ESC/POS thermal receipt printers without proprietary drivers.'
              }
            ].map((faq, i) => (
              <div key={i} className={`faq-card ${activeFaq === i ? 'open' : ''}`}>
                <button className="faq-question" onClick={() => toggleFaq(i)}>
                  <span>{faq.q}</span>
                  <span className="faq-icon">{activeFaq === i ? '−' : '+'}</span>
                </button>
                {activeFaq === i && <div className="faq-answer"><p>{faq.a}</p></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------- Bottom Action Bar ----------------- */}
      <section className="landing-cta-banner">
        <div className="landing-container cta-container">
          <h2>Transform Your Retail Business Today</h2>
          <p>Join thousands of African retailers streamlining counter sales, e-commerce, and stockroom operations with DukaFlow.</p>
          <div className="cta-banner-buttons">
            <a href="#faqs" className="btn-cta-faq">
              <HelpCircle size={18} />
              <span>FAQ</span>
            </a>
            <Link to="/storefront" className="btn-cta-storefront">
              <Store size={18} />
              <span>Customer Shop</span>
              <span className="ext-icon">↗</span>
            </Link>
            {currentUser ? (
              <button
                className="btn-cta-signin"
                onClick={() => navigate(currentUser.role === 'cashier' ? '/pos' : currentUser.role === 'customer' ? '/orders' : '/dashboard')}
              >
                <span>My Workspace ({currentUser.name.split(' ')[0]})</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn-cta-signin" onClick={() => navigate('/login')}>
                <span>Staff Sign In</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ----------------- Footer ----------------- */}
      <footer className="landing-footer">
        <div className="landing-container footer-content">
          <div className="footer-brand-col">
            <div className="landing-brand">
              <span className="brand-mark">D</span>
              <span className="brand-text">Duka<span className="brand-accent">Flow</span></span>
            </div>
            <p className="footer-tagline">
              The Enterprise Retail OS for Single & Multi-Branch Commerce in Kenya and East Africa.
            </p>
            <p className="footer-meta">
              KRA VAT 16% Compliant · Safaricom Daraja Partner · PWA Offline Ready
            </p>
          </div>

          <div className="footer-links-col">
            <b>Product</b>
            <a href="#pos">Point of Sale</a>
            <Link to="/storefront">Customer Storefront</Link>
            <a href="#inventory">Inventory Ledger</a>
            <a href="#purchasing">Purchase Orders</a>
            <a href="#reports">Valuation & Analytics</a>
          </div>

          <div className="footer-links-col">
            <b>Roles & Security</b>
            <button onClick={() => navigate('/login?role=owner')}>Shop Owner Portal</button>
            <button onClick={() => navigate('/login?role=manager')}>Store Manager Portal</button>
            <button onClick={() => navigate('/login?role=cashier')}>POS Cashier Terminal</button>
            <Link to="/storefront">Customer Shopping</Link>
          </div>

          <div className="footer-links-col">
            <b>Company & Support</b>
            <a href="#faqs">Frequently Asked Questions</a>
            <a href="mailto:support@dukaflow.co.ke">support@dukaflow.co.ke</a>
            <span>Biashara Street, Nairobi, Kenya</span>
            <span>+254 700 000 000</span>
          </div>
        </div>

        <div className="landing-container footer-bottom">
          <p>© {new Date().getFullYear()} DukaFlow Technologies Ltd. All rights reserved.</p>
          <div className="footer-legal">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#security">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
