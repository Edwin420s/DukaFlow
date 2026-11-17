import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Storefront from '../views/Storefront.jsx';
import DashboardView from '../views/DashboardView.jsx';
import POS from '../views/POS.jsx';
import ProductsView from '../views/ProductsView.jsx';
import InventoryView from '../views/InventoryView.jsx';
import OrdersView from '../views/OrdersView.jsx';
import SuppliersView from '../views/SuppliersView.jsx';
import ReturnsView from '../views/ReturnsView.jsx';
import CustomersView from '../views/CustomersView.jsx';
import StaffView from '../views/StaffView.jsx';
import ReportsView from '../views/ReportsView.jsx';
import AuditView from '../views/AuditView.jsx';
import SettingsView from '../views/SettingsView.jsx';

import {
  BarChart3,
  Package,
  Boxes,
  ClipboardList,
  Users,
  Truck,
  RotateCcw,
  Activity,
  ShieldAlert,
  Settings,
  ShoppingBag,
  Bell,
  LogOut,
  Store,
  Wifi,
  WifiOff,
  UserCheck,
  Check
} from 'lucide-react';

const navItems = [
  ['Overview', '/', BarChart3],
  ['Point of Sale', '/pos', ShoppingBag],
  ['Products', '/products', Package],
  ['Inventory', '/inventory', Boxes],
  ['Orders', '/orders', ClipboardList],
  ['Suppliers', '/suppliers', Truck],
  ['Returns', '/returns', RotateCcw],
  ['Customers', '/customers', Users],
  ['Staff', '/staff', UserCheck],
  ['Reports', '/reports', Activity],
  ['Audit Logs', '/audit', ShieldAlert],
  ['Settings', '/settings', Settings]
];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Auth form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Mode: if user navigated to `/storefront`, show customer experience
  const isStorefront = location.pathname.startsWith('/storefront');

  useEffect(() => {
    function handleOnline() { setIsOnline(true); }
    function handleOffline() { setIsOnline(false); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    checkCurrentUser();
    loadShop();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);

  async function checkCurrentUser() {
    try {
      const res = await api.getMe();
      if (res?.user) setCurrentUser(res.user);
    } catch {
      quickLogin('owner@dukaflow.co.ke', 'DukaFlow2026!');
    }
  }

  async function loadShop() {
    try {
      const res = await api.getShop();
      setShop(res.shop);
    } catch (err) {
      console.warn('Could not load shop profile:', err);
    }
  }

  async function loadNotifications() {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {}
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await api.login(loginEmail, loginPassword);
      if (res?.accessToken) {
        localStorage.setItem('dukaflow_token', res.accessToken);
      }
      setCurrentUser(res.user);
      setIsAuthModalOpen(false);
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    }
  }

  async function quickLogin(email, password) {
    try {
      const res = await api.login(email, password);
      if (res?.accessToken) {
        localStorage.setItem('dukaflow_token', res.accessToken);
      }
      setCurrentUser(res.user);
    } catch {}
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem('dukaflow_token');
    setCurrentUser(null);
  }

  async function markAllNotificationsRead() {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
    } catch {}
  }

  if (isStorefront) {
    return <Storefront onSwitchToPortal={() => navigate('/')} />;
  }

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">D</span>
          <span>Duka<span className="brand-light">Flow</span></span>
        </Link>

        {/* Switch to Storefront Button */}
        <button
          className="storefront-switch-pill"
          onClick={() => navigate('/storefront')}
          title="Open Customer-Facing Online Storefront"
        >
          <Store size={15} />
          <span>Customer Storefront</span>
          <span className="external-arrow">↗</span>
        </button>

        <div className="shop-switch">
          <span className="shop-avatar">DF</span>
          <div>
            <b>{shop?.name || 'DukaFlow Store'}</b>
            <small>Single branch · Nairobi</small>
          </div>
        </div>

        <p className="nav-label">ENTERPRISE WORKSPACE</p>
        <nav>
          {navItems.map(([label, path, Icon]) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          {currentUser ? (
            <div className="profile">
              <div className="profile-avatar">{currentUser.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <b>{currentUser.name}</b>
                <small>{currentUser.role.toUpperCase()}</small>
              </div>
              <button className="icon-btn ml-auto" onClick={handleLogout} title="Log Out">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button className="primary-button full-width" onClick={() => setIsAuthModalOpen(true)}>
              Staff Login
            </button>
          )}
        </div>
      </aside>

      {/* Main Backoffice Workspace */}
      <main className="main">
        <header className="topbar">
          <span className="breadcrumb">
            DukaFlow Retail <span>/</span> {navItems.find((n) => n[1] === location.pathname)?.[0] || 'Workspace'}
          </span>

          <div className="topbar-right">
            {/* Online / Offline Status */}
            <span className={`online-indicator ${isOnline ? 'online' : 'offline'}`}>
              <i /> {isOnline ? 'Online Authority' : 'Offline Safe Mode'}
            </span>

            {/* Notifications Popover */}
            <div className="notif-wrapper">
              <button
                className="icon-button relative"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {isNotifOpen && (
                <div className="notif-popover">
                  <div className="notif-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button className="btn-link text-xs" onClick={markAllNotificationsRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <p className="p-3 text-muted text-center">No alerts recorded.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n._id} className={`notif-item ${n.read ? 'read' : 'unread'}`}>
                          <b>{n.title}</b>
                          <p>{n.message}</p>
                          <small>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Demo Role Switcher */}
            <div className="role-switcher">
              <span className="text-xs text-muted">Role:</span>
              <button
                className={`role-pill ${currentUser?.role === 'owner' ? 'active' : ''}`}
                onClick={() => quickLogin('owner@dukaflow.co.ke', 'DukaFlow2026!')}
              >
                Owner
              </button>
              <button
                className={`role-pill ${currentUser?.role === 'manager' ? 'active' : ''}`}
                onClick={() => quickLogin('manager@dukaflow.co.ke', 'DukaFlow2026!')}
              >
                Manager
              </button>
              <button
                className={`role-pill ${currentUser?.role === 'cashier' ? 'active' : ''}`}
                onClick={() => quickLogin('cashier@dukaflow.co.ke', 'DukaFlow2026!')}
              >
                Cashier
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Route Pages */}
        <Routes>
          <Route path="/" element={<DashboardView onNavigate={(p) => navigate(p)} />} />
          <Route path="/pos" element={<POS currentUser={currentUser} />} />
          <Route path="/products" element={<ProductsView />} />
          <Route path="/inventory" element={<InventoryView />} />
          <Route path="/orders" element={<OrdersView />} />
          <Route path="/suppliers" element={<SuppliersView />} />
          <Route path="/returns" element={<ReturnsView />} />
          <Route path="/customers" element={<CustomersView />} />
          <Route path="/staff" element={<StaffView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/audit" element={<AuditView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>

      {/* Staff Login Modal */}
      {isAuthModalOpen && (
        <div className="sf-modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="sf-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Staff Portal Login</h2>
            <p className="muted">Enter your shop credentials to access the management backoffice and POS.</p>
            {loginError && <div className="sf-alert danger">{loginError}</div>}

            <form onSubmit={handleLogin} className="admin-modal-form mt-3">
              <label>
                Email Address
                <input
                  type="email"
                  required
                  placeholder="name@dukaflow.co.ke"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </label>

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Sign In</button>
                <button type="button" className="outline-button" onClick={() => setIsAuthModalOpen(false)}>Cancel</button>
              </div>

              <div className="demo-credentials-box mt-3">
                <p className="text-xs text-muted">Demo Credentials:</p>
                <code className="text-xs">owner@dukaflow.co.ke / DukaFlow2026!</code>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
