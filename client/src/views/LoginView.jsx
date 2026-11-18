import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import {
  Lock,
  Mail,
  User,
  Phone,
  Store,
  ShieldCheck,
  ShoppingBag,
  Boxes,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('owner');
  const [shopName, setShopName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pre-fill demo role if in query
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'owner') fillDemo('owner');
    else if (roleParam === 'cashier') fillDemo('cashier');
    else if (roleParam === 'manager') fillDemo('manager');
    else if (roleParam === 'customer') fillDemo('customer');
  }, [searchParams]);

  function fillDemo(roleType) {
    setMode('login');
    setError('');
    if (roleType === 'owner') {
      setEmail('owner@dukaflow.co.ke');
      setPassword('DukaFlow2026!');
    } else if (roleType === 'cashier') {
      setEmail('cashier@dukaflow.co.ke');
      setPassword('DukaFlow2026!');
    } else if (roleType === 'manager') {
      setEmail('manager@dukaflow.co.ke');
      setPassword('DukaFlow2026!');
    } else if (roleType === 'customer') {
      setEmail('customer@dukaflow.co.ke');
      setPassword('DukaFlow2026!');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email.trim(), password);
        if (res?.accessToken) {
          localStorage.setItem('dukaflow_token', res.accessToken);
        }
        onLoginSuccess(res.user);

        // Redirect based on role
        if (res.user.role === 'cashier') {
          navigate('/pos');
        } else if (res.user.role === 'customer') {
          navigate('/storefront');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Register
        const payload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role,
          shopName: role === 'owner' ? shopName.trim() : undefined
        };

        const res = await api.register(payload);
        if (res?.accessToken) {
          localStorage.setItem('dukaflow_token', res.accessToken);
        }
        onLoginSuccess(res.user);

        if (res.user.role === 'cashier') {
          navigate('/pos');
        } else if (res.user.role === 'customer') {
          navigate('/storefront');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Top Navbar */}
      <div className="login-topbar">
        <Link to="/" className="landing-brand">
          <span className="brand-mark">D</span>
          <span className="brand-text">Duka<span className="brand-accent">Flow</span></span>
          <span className="badge-enterprise">ENTERPRISE</span>
        </Link>

        <div className="topbar-right-links">
          <Link to="/" className="back-link">
            <ArrowLeft size={15} />
            <span>Back to Home</span>
          </Link>
          <Link to="/storefront" className="storefront-link">
            <Store size={15} />
            <span>Customer Storefront</span>
          </Link>
        </div>
      </div>

      <div className="login-container">
        {/* Left / Info Panel: Quick Demo Switcher */}
        <div className="login-demo-panel">
          <div className="demo-header">
            <Sparkles size={20} className="text-emerald-500" />
            <div>
              <h3>Test DukaFlow by Role</h3>
              <p>Experience how each independent user role works in an enterprise retail setting.</p>
            </div>
          </div>

          <div className="demo-buttons-list">
            <button
              type="button"
              className="demo-select-btn"
              onClick={() => fillDemo('owner')}
            >
              <div className="demo-btn-icon owner">
                <ShieldCheck size={18} />
              </div>
              <div className="demo-btn-text">
                <b>Shop Owner</b>
                <small>Full Analytics, Staff, Audit, Shop Settings</small>
              </div>
              <span className="fill-pill">1-Click Login</span>
            </button>

            <button
              type="button"
              className="demo-select-btn"
              onClick={() => fillDemo('cashier')}
            >
              <div className="demo-btn-icon cashier">
                <ShoppingBag size={18} />
              </div>
              <div className="demo-btn-text">
                <b>POS Cashier</b>
                <small>Dedicated Touch Counter, Barcodes & Cash Presets</small>
              </div>
              <span className="fill-pill">1-Click Login</span>
            </button>

            <button
              type="button"
              className="demo-select-btn"
              onClick={() => fillDemo('manager')}
            >
              <div className="demo-btn-icon manager">
                <Boxes size={18} />
              </div>
              <div className="demo-btn-text">
                <b>Store Manager</b>
                <small>Stock Adjustments, PO Receiving, Returns Inspection</small>
              </div>
              <span className="fill-pill">1-Click Login</span>
            </button>

            <button
              type="button"
              className="demo-select-btn"
              onClick={() => fillDemo('customer')}
            >
              <div className="demo-btn-icon customer">
                <Store size={18} />
              </div>
              <div className="demo-btn-text">
                <b>Retail Customer</b>
                <small>Online Shopping, M-Pesa STK & Personal Receipts</small>
              </div>
              <span className="fill-pill">1-Click Login</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Authentication Form */}
        <div className="login-form-card">
          <div className="auth-tab-switch">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Open New Shop / Register
            </button>
          </div>

          <div className="auth-card-header">
            <h2>{mode === 'login' ? 'Sign In to Your Workspace' : 'Create an Independent Account'}</h2>
            <p>
              {mode === 'login'
                ? 'Enter your credentials to access your store or customer account.'
                : 'Start your own independent retail store or personal shopping account.'}
            </p>
          </div>

          {error && (
            <div className="auth-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label>Account Type / Role</label>
                  <select
                    className="input-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="owner">Shop Owner (Create & Own a Retail Shop)</option>
                    <option value="customer">Shopper / Customer (Personal Account)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-with-icon">
                    <User size={16} className="field-icon" />
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Mary Wambui"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {role === 'owner' && (
                  <div className="form-group">
                    <label>Retail Shop / Business Name</label>
                    <div className="input-with-icon">
                      <Store size={16} className="field-icon" />
                      <input
                        type="text"
                        className="input-text"
                        placeholder="e.g. Wambui Fresh Groceries"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Kenyan Phone Number</label>
                  <div className="input-with-icon">
                    <Phone size={16} className="field-icon" />
                    <input
                      type="tel"
                      className="input-text"
                      placeholder="e.g. 0722 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  className="input-text"
                  placeholder="name@dukaflow.co.ke"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  type="password"
                  className="input-text"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="primary-button full-width auth-submit-btn" disabled={loading}>
              {loading ? (
                <span>Authenticating...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  <span>Create Account & Setup Duka</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-card-footer">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button type="button" className="link-button" onClick={() => setMode('register')}>
                  Register a new shop
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button type="button" className="link-button" onClick={() => setMode('login')}>
                  Sign In instead
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
