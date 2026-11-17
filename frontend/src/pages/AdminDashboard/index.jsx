/**
 * @file frontend/src/pages/AdminDashboard/index.jsx
 * System Administrator Dashboard.
 * Exports AdminRoutes as a named export per the Master Integration Contract §2.5.
 * Plain React JSX.
 */

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi.js';

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
    <div className="admin-dashboard-container" style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          System Administration Dashboard
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Manage user credentials & roles, monitor BullMQ processing queues, and inspect system health.
        </p>
      </header>

      {error && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {actionMsg && (
        <div style={{ padding: '12px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '16px' }}>
          {actionMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
        {['users', 'processing', 'health'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setActionMsg(''); }}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              fontWeight: activeTab === tab ? '600' : 'normal',
              color: activeTab === tab ? '#2563eb' : '#4b5563',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'processing' ? 'Queue & Processing' : tab}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#6b7280', padding: '16px 0' }}>Loading data...</div>}

      {/* Users Tab */}
      {!loading && activeTab === 'users' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px' }}>User ID</th>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th style={{ padding: '12px' }}>Role</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{u.id}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{u.name}</td>
                  <td style={{ padding: '12px' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="FINANCE_ADMIN">FINANCE_ADMIN</option>
                      <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: u.active ? '#dcfce7' : '#fee2e2',
                      color: u.active ? '#15803d' : '#b91c1c',
                    }}>
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => handleStatusToggle(u.id, u.active)}
                      style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Processing & Queue Tab */}
      {!loading && activeTab === 'processing' && stats && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>BullMQ Queue: 'claim-processing'</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {Object.entries(stats.queue || {}).map(([state, count]) => (
              <div key={state} style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>{state}</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{count}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Claims by Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {Object.entries(stats.claimsByStatus || {}).map(([st, count]) => (
              <div key={st} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{st}</span>
                <span style={{ float: 'right', fontWeight: 'bold', color: '#2563eb' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Health Tab */}
      {!loading && activeTab === 'health' && health && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: health.status === 'ok' ? '#16a34a' : health.status === 'degraded' ? '#eab308' : '#dc2626',
              display: 'inline-block',
            }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
              System Status: {health.status}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {Object.entries(health.checks || {}).map(([service, isOk]) => (
              <div key={service} style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', textTransform: 'capitalize' }}>{service}</div>
                <div style={{ marginTop: '8px', fontSize: '13px', color: isOk ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                  {isOk ? '✔ Operational' : '✖ Unhealthy'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
