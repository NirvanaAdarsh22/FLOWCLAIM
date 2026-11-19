/**
 * @file frontend/src/pages/FinanceDashboard/index.jsx
 * Finance Administrator Dashboard.
 * Exports FinanceRoutes as a named export per the Master Integration Contract §2.5.
 * Plain React JSX styled with the FlowClaim Light Cream design system.
 */

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/layout/Navbar.jsx';
import { financeApi } from '../../services/financeApi.js';
import {
  Landmark,
  PlusCircle,
  FileSpreadsheet,
  History,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  DollarSign
} from 'lucide-react';

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

  // Summary figures
  const totalBudgetMinor = budgets.reduce((acc, b) => acc + (b.limitMinor || 0), 0);
  const totalSpentMinor = budgets.reduce((acc, b) => acc + (b.spentMinor || 0), 0);
  const remainingMinor = totalBudgetMinor - totalSpentMinor;

  return (
    <div className="fc-dashboard-page">
      <Navbar />

      <main className="fc-dashboard-main">
        {/* Header */}
        <header style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="fc-badge fc-badge-neutral">
              <Landmark size={12} />
              TREASURY & POSTGRESQL LEDGER
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
            Finance Administration Dashboard
          </h1>
          <p style={{ color: 'var(--fc-text-secondary)', margin: 0, fontSize: '14.5px' }}>
            Manage departmental budgets, inspect atomic PostgreSQL ledger entries, and audit transactions.
          </p>
        </header>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--fc-status-danger-bg)',
            color: 'var(--fc-status-danger-text)',
            borderRadius: 'var(--fc-radius-md)',
            border: '1px solid var(--fc-status-danger-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Executive KPI Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="fc-kpi-card">
            <span className="fc-kpi-title">Total Allocated Budget</span>
            <div className="fc-kpi-figure">{formatINR(totalBudgetMinor)}</div>
            <span className="fc-kpi-meta">Across {budgets.length} employee budgets</span>
          </div>

          <div className="fc-kpi-card">
            <span className="fc-kpi-title">Committed Expenditure</span>
            <div className="fc-kpi-figure" style={{ color: 'var(--fc-status-danger-text)' }}>
              {formatINR(totalSpentMinor)}
            </div>
            <span className="fc-kpi-meta">Debited via atomic row locks</span>
          </div>

          <div className="fc-kpi-card">
            <span className="fc-kpi-title">Available Pool</span>
            <div className="fc-kpi-figure" style={{ color: 'var(--fc-status-success-text)' }}>
              {formatINR(remainingMinor)}
            </div>
            <span className="fc-kpi-meta">Remaining uncommitted credit</span>
          </div>
        </div>

        {/* Content Card with Navigation Tabs */}
        <div className="fc-card" style={{ padding: '20px' }}>
          {/* Navigation Tabs */}
          <div className="fc-tab-bar">
            {['budgets', 'ledger', 'audit'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`fc-tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'budgets' ? 'Budgets' : tab === 'ledger' ? 'Ledger' : 'Audit'}
              </button>
            ))}
          </div>

          {loading && (
            <div style={{ color: 'var(--fc-text-muted)', padding: '24px', textAlign: 'center' }}>
              Loading ledger data...
            </div>
          )}

          {/* Budgets Tab */}
          {!loading && activeTab === 'budgets' && (
            <div>
              {/* Form to Upsert Budget */}
              <form
                onSubmit={handleCreateBudget}
                style={{
                  backgroundColor: 'var(--fc-bg-subtle)',
                  padding: '18px',
                  borderRadius: 'var(--fc-radius-md)',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                  border: '1px solid var(--fc-border)',
                }}
              >
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="fc-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="emp-101"
                    className="fc-input"
                    required
                  />
                </div>

                <div style={{ flex: 1, minWidth: '160px' }}>
                  <label className="fc-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                    Fiscal Period
                  </label>
                  <input
                    type="month"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="fc-input"
                    required
                  />
                </div>

                <div style={{ flex: 1, minWidth: '160px' }}>
                  <label className="fc-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                    Budget Limit (INR ₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={limitRupees}
                    onChange={(e) => setLimitRupees(e.target.value)}
                    placeholder="10000"
                    className="fc-input"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingBudget}
                  className="fc-btn fc-btn-primary"
                  style={{ height: '40px' }}
                >
                  <PlusCircle size={15} />
                  <span>{savingBudget ? 'Saving...' : 'Set Budget'}</span>
                </button>
              </form>

              {/* Budgets Table */}
              <div className="fc-table-container">
                <table className="fc-table">
                  <thead>
                    <tr>
                      <th>Budget ID</th>
                      <th>Employee</th>
                      <th>Period</th>
                      <th>Limit</th>
                      <th>Spent</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--fc-text-muted)' }}>
                          No budgets found.
                        </td>
                      </tr>
                    ) : (
                      budgets.map((b) => (
                        <tr key={b.budgetId}>
                          <td>
                            <span className="fc-mono">{b.budgetId}</span>
                          </td>
                          <td>
                            <strong>{b.employeeName || b.employeeId}</strong>
                          </td>
                          <td>{b.period}</td>
                          <td style={{ fontWeight: '600' }}>{formatINR(b.limitMinor)}</td>
                          <td style={{ color: 'var(--fc-status-danger-text)', fontWeight: '600' }}>
                            {formatINR(b.spentMinor)}
                          </td>
                          <td style={{ color: 'var(--fc-status-success-text)', fontWeight: '700' }}>
                            {formatINR(b.limitMinor - b.spentMinor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ledger Tab */}
          {!loading && activeTab === 'ledger' && (
            <div className="fc-table-container">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Entry ID</th>
                    <th>Claim ID</th>
                    <th>Employee</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--fc-text-muted)' }}>
                        No ledger entries committed yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((l) => (
                      <tr key={l.entryId}>
                        <td>
                          <span className="fc-mono">{l.entryId}</span>
                        </td>
                        <td>
                          <span className="fc-mono">{l.claimId}</span>
                        </td>
                        <td>{l.employeeId}</td>
                        <td>
                          <span className="fc-badge fc-badge-neutral">{l.category}</span>
                        </td>
                        <td style={{ fontWeight: '700' }}>{formatINR(l.amountMinor)}</td>
                        <td style={{ color: 'var(--fc-text-muted)', fontSize: '13px' }}>
                          {new Date(l.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Tab */}
          {!loading && activeTab === 'audit' && (
            <div className="fc-table-container">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Claim ID</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--fc-text-muted)' }}>
                        No audit events recorded.
                      </td>
                    </tr>
                  ) : (
                    auditEvents.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="fc-mono">{a.id}</span>
                        </td>
                        <td>
                          <span className="fc-mono">{a.claimId || '-'}</span>
                        </td>
                        <td>{a.actor}</td>
                        <td>
                          <span className="fc-badge fc-badge-info">{a.action}</span>
                        </td>
                        <td style={{ color: 'var(--fc-text-muted)', fontSize: '13px' }}>
                          {new Date(a.at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
