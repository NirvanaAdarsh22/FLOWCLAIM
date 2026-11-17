/**
 * @file frontend/src/pages/FinanceDashboard/index.jsx
 * Finance Administrator Dashboard.
 * Exports FinanceRoutes as a named export per the Master Integration Contract §2.5.
 * Plain React JSX.
 */

import React, { useState, useEffect } from 'react';
import { financeApi } from '../../services/financeApi.js';

/**
 * Format integer paise into INR currency display.
 * @param {number} paise
 * @returns {string}
 */
function formatINR(paise) {
  if (typeof paise !== 'number') return '₹0.00';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState('budgets');
  const [budgets, setBudgets] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New budget form state
  const [employeeId, setEmployeeId] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [limitRupees, setLimitRupees] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'budgets') {
        const data = await financeApi.getBudgets();
        setBudgets(data?.items || []);
      } else if (activeTab === 'ledger') {
        const data = await financeApi.getLedgerEntries();
        setLedgerEntries(data?.items || []);
      } else if (activeTab === 'audit') {
        const data = await financeApi.getAuditEvents();
        setAuditEvents(data?.items || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBudget(e) {
    e.preventDefault();
    if (!employeeId || !limitRupees) return;
    setSavingBudget(true);
    try {
      const limitMinor = Math.round(parseFloat(limitRupees) * 100);
      await financeApi.upsertBudget({
        employeeId,
        period,
        limitMinor,
      });
      setEmployeeId('');
      setLimitRupees('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to upsert budget');
    } finally {
      setSavingBudget(false);
    }
  }

  return (
    <div className="finance-dashboard-container" style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          Finance Administration Dashboard
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Manage departmental budgets, inspect atomic PostgreSQL ledger entries, and audit transactions.
        </p>
      </header>

      {error && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
        {['budgets', 'ledger', 'audit'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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
            {tab}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#6b7280', padding: '16px 0' }}>Loading data...</div>}

      {/* Budgets Tab */}
      {!loading && activeTab === 'budgets' && (
        <div>
          <form onSubmit={handleCreateBudget} style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="emp-101"
                required
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Period (YYYY-MM)</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Budget Limit (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={limitRupees}
                onChange={(e) => setLimitRupees(e.target.value)}
                placeholder="10000"
                required
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
            <button
              type="submit"
              disabled={savingBudget}
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
            >
              {savingBudget ? 'Saving...' : 'Set Budget'}
            </button>
          </form>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px' }}>Budget ID</th>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Period</th>
                <th style={{ padding: '12px' }}>Limit</th>
                <th style={{ padding: '12px' }}>Spent</th>
                <th style={{ padding: '12px' }}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>No budgets found.</td></tr>
              ) : (
                budgets.map((b) => (
                  <tr key={b.budgetId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{b.budgetId}</td>
                    <td style={{ padding: '12px' }}>{b.employeeName || b.employeeId}</td>
                    <td style={{ padding: '12px' }}>{b.period}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{formatINR(b.limitMinor)}</td>
                    <td style={{ padding: '12px', color: '#dc2626' }}>{formatINR(b.spentMinor)}</td>
                    <td style={{ padding: '12px', color: '#16a34a', fontWeight: 'bold' }}>{formatINR(b.limitMinor - b.spentMinor)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ledger Tab */}
      {!loading && activeTab === 'ledger' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px' }}>Entry ID</th>
              <th style={{ padding: '12px' }}>Claim ID</th>
              <th style={{ padding: '12px' }}>Employee</th>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Amount</th>
              <th style={{ padding: '12px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {ledgerEntries.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>No ledger entries committed yet.</td></tr>
            ) : (
              ledgerEntries.map((l) => (
                <tr key={l.entryId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{l.entryId}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{l.claimId}</td>
                  <td style={{ padding: '12px' }}>{l.employeeId}</td>
                  <td style={{ padding: '12px' }}>{l.category}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{formatINR(l.amountMinor)}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Audit Tab */}
      {!loading && activeTab === 'audit' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px' }}>Audit ID</th>
              <th style={{ padding: '12px' }}>Claim ID</th>
              <th style={{ padding: '12px' }}>Actor</th>
              <th style={{ padding: '12px' }}>Action</th>
              <th style={{ padding: '12px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {auditEvents.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>No audit events recorded.</td></tr>
            ) : (
              auditEvents.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{a.id}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{a.claimId || '-'}</td>
                  <td style={{ padding: '12px' }}>{a.actor}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{a.action}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{new Date(a.at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * Named route export required by Contract §2.5.
 */
export const FinanceRoutes = [
  {
    path: '/finance',
    element: <FinanceDashboard />,
  },
  {
    path: '/finance/budgets',
    element: <FinanceDashboard />,
  },
  {
    path: '/finance/ledger',
    element: <FinanceDashboard />,
  },
  {
    path: '/finance/audit',
    element: <FinanceDashboard />,
  },
];

export default FinanceDashboard;
