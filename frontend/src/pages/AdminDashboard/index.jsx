/**
 * @file frontend/src/pages/AdminDashboard/index.jsx
 * System Administrator Dashboard.
 * Exports AdminRoutes as a named export per the Master Integration Contract §2.5.
 * Plain React JSX styled with the FlowClaim Light Cream design system.
 */

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/layout/Navbar.jsx';
import { adminApi } from '../../services/adminApi.js';
import {
  ShieldAlert,
  Users,
  Activity,
  HeartPulse,
  RefreshCw,
  Server,
  Database,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'users') {
        const data = await adminApi.getUsers();
        setUsers(data?.items || []);
      } else if (activeTab === 'processing') {
        const data = await adminApi.getProcessingStats();
        setStats(data);
      } else if (activeTab === 'health') {
        const data = await adminApi.getSystemHealth();
        setHealth(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administrator data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      await adminApi.updateUser(userId, { role: newRole });
      setActionMsg(`Updated user ${userId} to role ${newRole}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to update user role');
    }
  }

  async function handleStatusToggle(userId, currentActive) {
    try {
      await adminApi.updateUser(userId, { active: !currentActive });
      setActionMsg(`Toggled user ${userId} active status`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to toggle user status');
    }
  }

  return (
    <div className="fc-dashboard-page">
      <Navbar />

      <main className="fc-dashboard-main">
        {/* Header */}
        <header style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="fc-badge fc-badge-neutral">
              <ShieldAlert size={12} />
              SYSTEM OPERATIONS CONSOLE
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
            System Administration Dashboard
          </h1>
          <p style={{ color: 'var(--fc-text-secondary)', margin: 0, fontSize: '14.5px' }}>
            Manage user credentials & roles, monitor BullMQ processing queues, and inspect system health.
          </p>
        </header>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--fc-status-danger-bg)',
            color: 'var(--fc-status-danger-text)',
            borderRadius: 'var(--fc-radius-md)',
            border: '1px solid var(--fc-status-danger-border)',
          }}>
            {error}
          </div>
        )}

        {actionMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--fc-status-success-bg)',
            color: 'var(--fc-status-success-text)',
            borderRadius: 'var(--fc-radius-md)',
            border: '1px solid var(--fc-status-success-border)',
          }}>
            {actionMsg}
          </div>
        )}

        {/* Card Container */}
        <div className="fc-card" style={{ padding: '20px' }}>
          {/* Navigation Tabs */}
          <div className="fc-tab-bar">
            {['users', 'processing', 'health'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setActionMsg(''); }}
                className={`fc-tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'processing' ? 'Queue & Processing' : tab}
              </button>
            ))}
          </div>

          {loading && (
            <div style={{ color: 'var(--fc-text-muted)', padding: '24px', textAlign: 'center' }}>
              Loading administrator metrics...
            </div>
          )}

          {/* Users Tab */}
          {!loading && activeTab === 'users' && (
            <div className="fc-table-container">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--fc-text-muted)' }}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <span className="fc-mono">{u.id}</span>
                        </td>
                        <td>
                          <strong>{u.name}</strong>
                        </td>
                        <td style={{ color: 'var(--fc-text-secondary)' }}>{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="fc-input"
                            style={{ padding: '4px 8px', fontSize: '13px', width: 'auto' }}
                          >
                            <option value="EMPLOYEE">EMPLOYEE</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="FINANCE_ADMIN">FINANCE_ADMIN</option>
                            <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                          </select>
                        </td>
                        <td>
                          <span className={`fc-badge ${u.active ? 'fc-badge-success' : 'fc-badge-danger'}`}>
                            {u.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleStatusToggle(u.id, u.active)}
                            className="fc-btn fc-btn-secondary fc-btn-xs"
                          >
                            {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Processing & Queue Tab */}
          {!loading && activeTab === 'processing' && stats && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Layers size={18} style={{ color: 'var(--fc-accent-warm)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                  BullMQ Queue: 'claim-processing'
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '28px' }}>
                {Object.entries(stats.queue || {}).map(([state, count]) => (
                  <div
                    key={state}
                    style={{
                      backgroundColor: 'var(--fc-bg-subtle)',
                      padding: '16px',
                      borderRadius: 'var(--fc-radius-md)',
                      border: '1px solid var(--fc-border)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--fc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' }}>
                      {state}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--fc-text-primary)', marginTop: '4px' }}>
                      {count}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Activity size={18} style={{ color: 'var(--fc-status-info-text)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                  Claims by Status
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {Object.entries(stats.claimsByStatus || {}).map(([st, count]) => (
                  <div
                    key={st}
                    style={{
                      backgroundColor: 'var(--fc-surface)',
                      border: '1px solid var(--fc-border)',
                      padding: '12px 14px',
                      borderRadius: 'var(--fc-radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--fc-text-secondary)' }}>
                      {st}
                    </span>
                    <span style={{ fontWeight: '700', color: 'var(--fc-brand-primary)' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Health Tab */}
          {!loading && activeTab === 'health' && health && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: health.status === 'ok' ? 'var(--fc-status-success-text)' : 'var(--fc-status-danger-text)',
                    boxShadow: '0 0 0 4px rgba(21, 128, 61, 0.2)',
                  }}
                />
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, textTransform: 'uppercase' }}>
                  System Status: {health.status}
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {Object.entries(health.checks || {}).map(([service, isOk]) => (
                  <div
                    key={service}
                    style={{
                      backgroundColor: 'var(--fc-bg-subtle)',
                      padding: '16px',
                      borderRadius: 'var(--fc-radius-md)',
                      border: '1px solid var(--fc-border)',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '600', textTransform: 'capitalize', color: 'var(--fc-text-primary)' }}>
                      {service === 'mongo' ? 'MongoDB Cluster' : service === 'postgres' ? 'PostgreSQL Ledger' : service === 'redis' ? 'Redis & BullMQ' : 'AWS S3 Receipts'}
                    </div>
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '13px',
                        color: isOk ? 'var(--fc-status-success-text)' : 'var(--fc-status-danger-text)',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isOk ? '✔ Operational' : '✖ Unhealthy'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Named route export required by Contract §2.5.
 */
export const AdminRoutes = [
  {
    path: '/admin',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/users',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/processing',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/health',
    element: <AdminDashboard />,
  },
];

export default AdminDashboard;
