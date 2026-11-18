import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import LandingView from '../views/LandingView.jsx';
import LoginView from '../views/LoginView.jsx';
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
import CouponsView from '../views/CouponsView.jsx';

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
  Check,
  Tag,
  Menu,
  X,
  Lock,
  ArrowRight,
  Globe
} from 'lucide-react';

const allNavItems = [
  { label: 'Overview', path: '/dashboard', icon: BarChart3, roles: ['owner', 'manager'] },
  { label: 'Point of Sale', path: '/pos', icon: ShoppingBag, roles: ['owner', 'manager', 'cashier'] },
  { label: 'Products', path: '/products', icon: Package, roles: ['owner', 'manager'] },
  { label: 'Inventory', path: '/inventory', icon: Boxes, roles: ['owner', 'manager'] },
  { label: 'Orders', path: '/orders', icon: ClipboardList, roles: ['owner', 'manager', 'cashier', 'customer'] },
  { label: 'Coupons', path: '/coupons', icon: Tag, roles: ['owner', 'manager'] },
  { label: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['owner', 'manager'] },
  { label: 'Returns', path: '/returns', icon: RotateCcw, roles: ['owner', 'manager', 'cashier'] },
  { label: 'Customers', path: '/customers', icon: Users, roles: ['owner', 'manager', 'cashier'] },
  { label: 'Staff', path: '/staff', icon: UserCheck, roles: ['owner'] },
  { label: 'Reports', path: '/reports', icon: Activity, roles: ['owner', 'manager'] },
  { label: 'Audit Logs', path: '/audit', icon: ShieldAlert, roles: ['owner'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['owner'] }
];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [shop, setShop] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Online / Offline listeners
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

  // Check initial authentication
  useEffect(() => {
    checkCurrentUser();
    loadShop();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser]);

  async function checkCurrentUser() {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setCurrentUser(res.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecked(true);
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

  async function quickLogin(email, password) {
    try {
      const res = await api.login(email, password);
      if (res?.accessToken) {
        localStorage.setItem('dukaflow_token', res.accessToken);
      }
      setCurrentUser(res.user);
      loadShop();

      if (res.user.role === 'cashier') {
        navigate('/pos');
      } else if (res.user.role === 'customer') {
        navigate('/orders');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Quick login failed:', err);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem('dukaflow_token');
    setCurrentUser(null);
    navigate('/');
  }

  async function markAllNotificationsRead() {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
    } catch {}
  }

  // Route modes:
  const isStorefront = location.pathname.startsWith('/storefront');
  const isLanding = location.pathname === '/' || location.pathname === '/landing';
  const isLoginOrRegister = location.pathname === '/login' || location.pathname === '/register';

  // 1. Customer Storefront
  if (isStorefront) {
    return (
      <Storefront
        currentUser={currentUser}
        onSwitchToPortal={() => {
          if (!currentUser) navigate('/login');
          else if (currentUser.role === 'cashier') navigate('/pos');
          else if (currentUser.role === 'customer') navigate('/orders');
          else navigate('/dashboard');
        }}
      />
    );
  }

  // 2. Landing Page (Public showcase of product)
  if (isLanding) {
    return (
      <LandingView
        currentUser={currentUser}
        onLoginClick={() => navigate('/login')}
      />
    );
  }

  // 3. Login or Registration View
  if (isLoginOrRegister) {
    if (currentUser) {
      // If already logged in, redirect to user's home
      if (currentUser.role === 'cashier') return <Navigate to="/pos" replace />;
      if (currentUser.role === 'customer') return <Navigate to="/orders" replace />;
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadShop();
        }}
      />
    );
  }

  // 4. Route Guard for Protected Backoffice/Staff/Customer Workspace:
  // If user is NOT logged in and attempting to access an internal page, redirect to Login
  if (!currentUser && authChecked) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, message: 'Please sign in to access this workspace.' }}
      />
    );
  }

  // Filter navigation items by role
  const userRole = currentUser?.role || 'customer';
  const visibleNavItems = allNavItems.filter((item) => item.roles.includes(userRole));

  return (
    <div className="shell">
      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileNavOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileNavOpen ? 'open' : ''}`}>
        <div className="sidebar-top-row">
          <Link className="brand" to="/" onClick={() => setIsMobileNavOpen(false)}>
            <span className="brand-mark">D</span>
            <span>Duka<span className="brand-light">Flow</span></span>
          </Link>
          <button
            type="button"
            className="mobile-close-sidebar"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

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

        {/* Shop & Tenant Profile Card */}
        <div className="shop-switch">
          <span className="shop-avatar">{shop?.name?.slice(0, 2).toUpperCase() || 'DF'}</span>
          <div>
            <b>{shop?.name || 'DukaFlow Store'}</b>
            <small>{currentUser?.shopId ? 'Independent Tenant' : 'Single branch'} · Nairobi</small>
          </div>
        </div>

        <p className="nav-label">
          {userRole === 'customer' ? 'CUSTOMER ACCOUNT' : userRole === 'cashier' ? 'CASHIER TERMINAL' : 'ENTERPRISE WORKSPACE'}
        </p>

        <nav>
          {visibleNavItems.map(({ label, path, icon: Icon }) => {
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

        {/* Sidebar Footer with Active User Profile */}
        <div className="sidebar-bottom">
          <div className="profile">
            <div className={`profile-avatar role-${userRole}`}>
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div>
              <b>{currentUser?.name || 'User'}</b>
              <small className={`role-tag role-${userRole}`}>
                {userRole.toUpperCase()}
              </small>
            </div>
            <button className="icon-btn ml-auto" onClick={handleLogout} title="Log Out">
              <LogOut size={15} />
            </button>
          </div>

          <div className="sidebar-public-links mt-2">
            <Link to="/" className="text-xs text-muted d-flex items-center gap-1">
              <Globe size={12} />
              <span>Product Landing Page</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Backoffice Workspace */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>

            <span className="page-title">
              {allNavItems.find((i) => i.path === location.pathname)?.label || 'Workspace'}
            </span>

            {/* Offline / Online Network Indicator */}
            <span className={`network-status-badge ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{isOnline ? 'Cloud Synced' : 'Offline Buffer'}</span>
            </span>

            <span className={`tenant-isolation-pill role-${userRole}`}>
              <Lock size={11} />
              <span>Isolated Account · {userRole.toUpperCase()}</span>
            </span>
          </div>

          <div className="topbar-right">
            {/* Notification Bell (for staff) */}
            {userRole !== 'customer' && (
              <div className="notif-wrapper">
                <button
                  className="icon-btn relative"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>

                {isNotifOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <b>Activity Alerts</b>
                      {unreadCount > 0 && (
                        <button className="text-btn" onClick={markAllNotificationsRead}>
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
            )}

            {/* Role Demo Switcher */}
            <div className="role-switcher">
              <span className="text-xs text-muted">Role:</span>
              <button
                className={`role-pill ${userRole === 'owner' ? 'active' : ''}`}
                onClick={() => quickLogin('owner@dukaflow.co.ke', 'DukaFlow2026!')}
                title="Switch to Owner account"
              >
                Owner
              </button>
              <button
                className={`role-pill ${userRole === 'manager' ? 'active' : ''}`}
                onClick={() => quickLogin('manager@dukaflow.co.ke', 'DukaFlow2026!')}
                title="Switch to Manager account"
              >
                Manager
              </button>
              <button
                className={`role-pill ${userRole === 'cashier' ? 'active' : ''}`}
                onClick={() => quickLogin('cashier@dukaflow.co.ke', 'DukaFlow2026!')}
                title="Switch to Cashier account"
              >
                Cashier
              </button>
              <button
                className={`role-pill ${userRole === 'customer' ? 'active' : ''}`}
                onClick={() => quickLogin('customer@dukaflow.co.ke', 'DukaFlow2026!')}
                title="Switch to Customer account"
              >
                Customer
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Protected Route Pages with Strict Role Guarding */}
        <Routes>
          {/* Dashboard: Owner & Manager only */}
          <Route
            path="/dashboard"
            element={
              ['owner', 'manager'].includes(userRole) ? (
                <DashboardView onNavigate={(p) => navigate(p)} />
              ) : (
                <Navigate to={userRole === 'cashier' ? '/pos' : '/orders'} replace />
              )
            }
          />

          {/* POS: Cashier, Manager & Owner */}
          <Route
            path="/pos"
            element={
              ['owner', 'manager', 'cashier'].includes(userRole) ? (
                <POS currentUser={currentUser} />
              ) : (
                <Navigate to="/orders" replace />
              )
            }
          />

          {/* Catalog & Inventory: Owner & Manager */}
          <Route
            path="/products"
            element={
              ['owner', 'manager'].includes(userRole) ? (
                <ProductsView />
              ) : (
                <Navigate to={userRole === 'cashier' ? '/pos' : '/orders'} replace />
              )
            }
          />
          <Route
            path="/inventory"
            element={
              ['owner', 'manager'].includes(userRole) ? (
                <InventoryView />
              ) : (
                <Navigate to={userRole === 'cashier' ? '/pos' : '/orders'} replace />
              )
            }
          />

          {/* Orders: All authenticated users (scoped by role/customer) */}
          <Route path="/orders" element={<OrdersView currentUser={currentUser} />} />

          {/* Coupons & Promotions: Owner & Manager */}
          <Route
            path="/coupons"
            element={
              ['owner', 'manager'].includes(userRole) ? (
                <CouponsView />
              ) : (
                <Navigate to={userRole === 'cashier' ? '/pos' : '/orders'} replace />
              )
            }
          />

          {/* Supply Chain & Purchasing: Owner & Manager */}
          <Route
            path="/suppliers"
            element={
              ['owner', 'manager'].includes(userRole) ? (
                <SuppliersView />
              ) : (
                <Navigate to={userRole === 'cashier' ? '/pos' : '/orders'} replace />
              )
            }
          />

          {/* Returns: Owner, Manager & Cashier */}
          <Route
            path="/returns"
            element={
              ['owner', 'manager', 'cashier'].includes(userRole) ? (
                <ReturnsView />
              ) : (
                <Navigate to="/orders" replace />
              )
            }
          />

          {/* Customers Directory: Staff only */}
          <Route
            path="/customers"
            element={
              ['owner', 'manager', 'cashier'].includes(userRole) ? (
                <CustomersView />
              ) : (
                <Navigate to="/orders" replace />
              )
            }
          />

          {/* Staff Management: Owner only */}
          <Route
            path="/staff"
            element={
              userRole === 'owner' ? (
                <StaffView />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          {/* Reports & Financial Analytics: Owner & Manager only */}
          <Route
            path="/reports"
            element={
              ['owner', 'manager'].includes(userRole) ? (
                <ReportsView />
              ) : (
                <Navigate to={userRole === 'cashier' ? '/pos' : '/orders'} replace />
              )
            }
          />

          {/* Audit Logs: Owner only */}
          <Route
            path="/audit"
            element={
              userRole === 'owner' ? (
                <AuditView />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          {/* Shop Settings: Owner only */}
          <Route
            path="/settings"
            element={
              userRole === 'owner' ? (
                <SettingsView />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          {/* Fallback */}
          <Route
            path="*"
            element={
              <Navigate
                to={userRole === 'cashier' ? '/pos' : userRole === 'customer' ? '/orders' : '/dashboard'}
                replace
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}
