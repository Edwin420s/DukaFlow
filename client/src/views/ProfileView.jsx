import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate } from '../utils/format.js';
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  Store,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  Save,
  Key
} from 'lucide-react';

export default function ProfileView({ currentUser, onUserUpdated, shop }) {
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setSavingProfile(true);

    try {
      const res = await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      if (res?.user && onUserUpdated) {
        onUserUpdated(res.user);
      }
      setProfileMsg({ type: 'success', text: 'Personal details updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSavingPassword(true);

    try {
      await api.updateProfile({
        currentPassword,
        newPassword
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setSavingPassword(false);
    }
  }

  const userRole = currentUser?.role || 'customer';

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>My Profile & Account Details</h1>
          <p className="muted">Manage your personal information, contact details, security credentials, and view account status.</p>
        </div>
      </div>

      <div className="profile-layout-grid">
        {/* Left Column: Account Summary Card */}
        <div className="profile-summary-card">
          <div className="profile-avatar-large">
            {currentUser?.name?.slice(0, 2).toUpperCase() || 'DF'}
          </div>

          <h2 className="profile-name">{currentUser?.name || 'User'}</h2>
          <span className={`role-badge-large role-${userRole}`}>
            {userRole.toUpperCase()} ACCOUNT
          </span>

          <div className="profile-meta-list">
            <div className="profile-meta-item">
              <Mail size={16} />
              <span>{currentUser?.email}</span>
            </div>
            {currentUser?.phone && (
              <div className="profile-meta-item">
                <Phone size={16} />
                <span>{currentUser.phone}</span>
              </div>
            )}
            {shop?.name && userRole !== 'customer' && (
              <div className="profile-meta-item">
                <Store size={16} />
                <span>{shop.name}</span>
              </div>
            )}
            <div className="profile-meta-item">
              <Calendar size={16} />
              <span>Member since {formatDate(currentUser?.createdAt || new Date())}</span>
            </div>
            {currentUser?.lastLoginAt && (
              <div className="profile-meta-item">
                <Clock size={16} />
                <span>Last login {formatDate(currentUser.lastLoginAt)}</span>
              </div>
            )}
          </div>

          <hr className="profile-divider" />

          {/* Public Links */}
          <div className="profile-quick-links">
            <b>Public Navigation</b>
            <Link to="/storefront" className="profile-action-link">
              <Store size={15} />
              <span>Customer Online Storefront</span>
              <ExternalLink size={13} className="ml-auto" />
            </Link>
            <Link to="/landing" className="profile-action-link">
              <ShieldCheck size={15} />
              <span>Product Overview & Features</span>
              <ArrowRight size={13} className="ml-auto" />
            </Link>
          </div>
        </div>

        {/* Right Column: Forms for Editing Details and Changing Password */}
        <div className="profile-forms-column">
          {/* Form 1: Personal Details */}
          <div className="detail-card">
            <div className="card-header-row">
              <div>
                <h3>Personal Information</h3>
                <p className="muted text-sm">Update your name, email address, and phone number.</p>
              </div>
            </div>

            {profileMsg.text && (
              <div className={`sf-alert ${profileMsg.type === 'success' ? 'success' : 'danger'} mb-3`}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-with-icon">
                    <User size={16} className="field-icon" />
                    <input
                      type="text"
                      className="input-text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="field-icon" />
                    <input
                      type="email"
                      className="input-text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Kenyan Phone Number</label>
                <div className="input-with-icon">
                  <Phone size={16} className="field-icon" />
                  <input
                    type="tel"
                    className="input-text"
                    placeholder="07XX XXX XXX or 2547XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <small className="form-hint">Used for order notifications and M-Pesa STK prompts.</small>
              </div>

              <div className="form-actions-row">
                <button type="submit" className="primary-button" disabled={savingProfile}>
                  <Save size={16} />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Change Password */}
          <div className="detail-card mt-4">
            <div className="card-header-row">
              <div>
                <h3>Security & Password</h3>
                <p className="muted text-sm">Update your login password to keep your account secure.</p>
              </div>
            </div>

            {passwordMsg.text && (
              <div className={`sf-alert ${passwordMsg.type === 'success' ? 'success' : 'danger'} mb-3`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="form-group">
                <label>Current Password</label>
                <div className="input-with-icon">
                  <Key size={16} className="field-icon" />
                  <input
                    type="password"
                    className="input-text"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="field-icon" />
                    <input
                      type="password"
                      className="input-text"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="field-icon" />
                    <input
                      type="password"
                      className="input-text"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions-row">
                <button type="submit" className="primary-button" disabled={savingPassword}>
                  <Lock size={16} />
                  <span>{savingPassword ? 'Updating Password...' : 'Change Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
