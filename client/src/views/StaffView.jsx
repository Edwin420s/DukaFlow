import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatDate } from '../utils/format.js';
import { Plus, UserPlus, Shield, CheckCircle, Ban } from 'lucide-react';

export default function StaffView() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [error, setError] = useState('');

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      setLoading(true);
      const res = await api.getUsers();
      setStaff(res.users || []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStaff(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createStaff({
        name,
        email,
        phone,
        password,
        role
      });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      loadStaff();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleStatus(member) {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateStaff(member._id, { status: newStatus });
      loadStaff();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Staff & Access Roles</h1>
          <p className="muted">Manage staff accounts, assign capabilities, and monitor access status.</p>
        </div>
        <button className="primary-button" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Add Staff Member
        </button>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Active</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading staff...</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No staff members found.</td></tr>
            ) : (
              staff.map((m) => (
                <tr key={m._id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.email}</td>
                  <td><code>{m.phone || '-'}</code></td>
                  <td>
                    <span className={`badge ${m.role === 'owner' ? 'primary' : m.role === 'manager' ? 'warning' : 'neutral'}`}>
                      {m.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${m.status === 'active' ? 'success' : 'danger'}`}>
                      {m.status.toUpperCase()}
                    </span>
                  </td>
                  <td><small>{m.lastLoginAt ? formatDate(m.lastLoginAt) : 'Never'}</small></td>
                  <td style={{ textAlign: 'right' }}>
                    {m.role !== 'owner' && (
                      <button
                        className={`outline-button small ${m.status === 'active' ? 'text-danger' : 'text-emerald'}`}
                        onClick={() => toggleStatus(m)}
                      >
                        {m.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card">
            <h2>Add Staff Member</h2>
            {error && <div className="sf-alert danger">{error}</div>}

            <form onSubmit={handleCreateStaff} className="admin-modal-form">
              <label>
                Full Name *
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label>
                Email Address *
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              <div className="form-grid-2">
                <label>
                  Phone Number
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label>
                  Initial Password *
                  <input type="password" required minLength="6" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
              </div>

              <label>
                Assigned Role *
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="cashier">Cashier (POS & Sales)</option>
                  <option value="manager">Manager (Operations & Inventory)</option>
                  <option value="inventory">Inventory Staff (Receiving & Counts)</option>
                  <option value="fulfilment">Fulfilment Staff (Picking & Packing)</option>
                </select>
              </label>

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">Create Account</button>
                <button type="button" className="outline-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
