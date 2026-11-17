import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatDate } from '../utils/format.js';
import { ShieldAlert, Search } from 'lucide-react';

export default function AuditView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  async function loadLogs() {
    try {
      setLoading(true);
      const res = await api.getAuditLogs(actionFilter ? `action=${actionFilter}` : '');
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>System Audit Trail</h1>
          <p className="muted">Append-only compliance log of sensitive operational actions, actors, IP addresses and entity state changes.</p>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Details / Change Snapshot</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading audit logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No audit records found.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td><small>{formatDate(log.createdAt)}</small></td>
                  <td><span className="badge primary">{log.action}</span></td>
                  <td>
                    <b>{log.actorName}</b>
                    <small className="muted d-block">{log.actorRole}</small>
                  </td>
                  <td><span className="badge neutral">{log.entityType}</span></td>
                  <td><code>{log.entityId}</code></td>
                  <td>
                    <pre className="audit-json-snippet">
                      {JSON.stringify(log.after || log.before || {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
