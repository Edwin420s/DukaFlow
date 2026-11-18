import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import LandingView from '../views/LandingView.jsx';
import LoginView from '../views/LoginView.jsx';
import ProfileView from '../views/ProfileView.jsx';
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
  Globe,
  User
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
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['owner'] },
  { label: 'My Profile', path: '/profile', icon: User, roles: ['owner', 'manager', 'cashier', 'customer'] }
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
  const isExplicitLanding = location.pathname === '/landing' || location.pathname === '/about';
  const isRoot = location.pathname === '/';
  const isLoginOrRegister = location.pathname === '/login' || location.pathname === '/register';

  // 1. Customer Storefront (Requires Customer Authentication)
  if (isStorefront) {
    if (!currentUser) {
      if (authChecked) {
        return (
          <Navigate
            to="/login?redirect=/storefront"
            replace
            state={{ from: location, message: 'Please sign in to access the customer store.' }}
          />
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', color: '#64748b' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p>Verifying authentication...</p>
        </div>
      );
    }
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

  // 2. Explicit Landing Page (Only for unauthenticated visitors)
  if (isExplicitLanding) {
    if (currentUser) {
      if (currentUser.role === 'cashier') return <Navigate to="/pos" replace />;
      if (currentUser.role === 'customer') return <Navigate to="/storefront" replace />;
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <LandingView
        currentUser={currentUser}
        onLoginClick={() => navigate('/login')}
      />
    );
  }

  // 3. Root Path "/" Handling:
  // If not logged in -> Show Landing Page
  // If logged in -> DO NOT show Landing Page; redirect straight to appropriate workspace
  if (isRoot) {
    if (!currentUser) {
      return (
        <LandingView
          currentUser={currentUser}
          onLoginClick={() => navigate('/login')}
        />
      );
    }
    // Logged in: navigate straight to authorized workspace
    if (currentUser.role === 'cashier') return <Navigate to="/pos" replace />;
    if (currentUser.role === 'customer') return <Navigate to="/storefront" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Login or Registration View
  if (isLoginOrRegister) {
    if (currentUser) {
      const redirectParam = new URLSearchParams(location.search).get('redirect');
      if (currentUser.role === 'cashier') return <Navigate to="/pos" replace />;
      if (currentUser.role === 'customer') {
        return <Navigate to={redirectParam && redirectParam.startsWith('/storefront') ? redirectParam : '/storefront'} replace />;
      }
      return <Navigate to={redirectParam && !redirectParam.startsWith('/pos') && !redirectParam.startsWith('/login') ? redirectParam : '/dashboard'} replace />;
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

  // 5. Route Guard for Protected Backoffice/Staff/Customer Workspace:
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
          <Link className="brand" to={userRole === 'cashier' ? '/pos' : userRole === 'customer' ? '/orders' : '/dashboard'} onClick={() => setIsMobileNavOpen(false)}>
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
            <small>Single branch · Nairobi</small>
          </div>
        </div>

        <p className="nav-label">
          {userRole === 'customer' ? 'MY ACCOUNT' : userRole === 'cashier' ? 'CASHIER TERMINAL' : 'ENTERPRISE WORKSPACE'}
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
          <div className="profile cursor-pointer" onClick={() => navigate('/profile')} title="Click to view & edit profile">
            <div className={`profile-avatar role-${userRole}`}>
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div>
              <b>{currentUser?.name || 'User'}</b>
              <small className={`role-tag role-${userRole}`}>
                {userRole.toUpperCase()}
              </small>
            </div>
            <button
              className="icon-btn ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              title="Log Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Backoffice Workspace */}
      <main className="main main-content">
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

            {/* Clean User Profile Quick Action */}
            <button
              className="topbar-user-pill"
              onClick={() => navigate('/profile')}
              title="View & Edit My Profile"
            >
              <div className={`avatar-circle-sm role-${userRole}`}>
                {currentUser?.name?.slice(0, 2).toUpperCase() || 'US'}
              </div>
              <span className="topbar-user-name">{currentUser?.name}</span>
              <span className={`role-badge-sm role-${userRole}`}>
                {userRole.toUpperCase()}
              </span>
            </button>

            <button
              className="icon-btn"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Dynamic Protected Route Pages with Strict Role Guarding */}
        <Routes>
          {/* Profile Details for All Users */}
          <Route
            path="/profile"
            element={
              <ProfileView
                currentUser={currentUser}
                onUserUpdated={(u) => setCurrentUser(u)}
                shop={shop}
              />
            }
          />

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
