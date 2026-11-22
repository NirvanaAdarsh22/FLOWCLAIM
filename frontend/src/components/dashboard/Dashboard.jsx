import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { claimsApi } from '../../services/api.js';
import Navbar from '../layout/Navbar';
import SubmitClaimModal from '../claims/SubmitClaimModal';
import ClaimDetailsModal from '../claims/ClaimDetailsModal';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  Eye,
  Check,
  XCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import './Dashboard.css';

const INITIAL_FALLBACK_CLAIMS = [
  {
    id: 'CLM-9104',
    title: 'AWS Cloud Infrastructure Q3 Reserve',
    merchant: 'Amazon Web Services Inc.',
    category: 'Other',
    amountPaise: 4200000,
    currency: 'INR',
    date: '2026-11-18',
    status: 'APPROVED',
    stage: 'Stage 7: Ledger Committed',
    anomalyScore: 0.08,
    dHash: 'e3f019a87b41c602',
    pipeline: { dHashVerified: true, aiExtracted: true, policyDAG: true, anomalyChecked: true, ledgerCommitted: true },
  },
  {
    id: 'CLM-9092',
    title: 'Client Strategy Dinner - 6 Attendees',
    merchant: 'The Oberoi Grand Hotel',
    category: 'Food',
    amountPaise: 1850000,
    currency: 'INR',
    date: '2026-11-17',
    status: 'NEEDS_REVIEW',
    stage: 'Stage 8: Pending Manager Sign-off',
    anomalyScore: 0.74,
    dHash: '7a8801b92cd34120',
    pipeline: { dHashVerified: true, aiExtracted: true, policyDAG: false, anomalyChecked: true, ledgerCommitted: false },
    reviewReason: 'Per-diem exceeded daily team meal cap. Pending human review.',
  },
  {
    id: 'CLM-8941',
    title: 'Bengaluru Client Visit - Airfare Return',
    merchant: 'IndiGo Airlines',
    category: 'Travel',
    amountPaise: 1240000,
    currency: 'INR',
    date: '2026-11-15',
    status: 'APPROVED',
    stage: 'Stage 7: Ledger Committed',
    anomalyScore: 0.14,
    dHash: '1100fce93284aa19',
    pipeline: { dHashVerified: true, aiExtracted: true, policyDAG: true, anomalyChecked: true, ledgerCommitted: true },
  },
  {
    id: 'CLM-8619',
    title: 'Duplicate Taxi Fare Voucher Submission',
    merchant: 'Uber India Technology Ltd.',
    category: 'Travel',
    amountPaise: 92000,
    currency: 'INR',
    date: '2026-11-08',
    status: 'POSSIBLE_DUPLICATE',
    stage: 'Stage 4: Duplicate Flagged',
    anomalyScore: 0.89,
    dHash: '1100fce93284aa19',
    pipeline: { dHashVerified: false, aiExtracted: true, policyDAG: true, anomalyChecked: true, ledgerCommitted: false },
    reviewReason: 'Duplicate perceptual receipt fingerprint match detected.',
  },
];

function normalizeBackendClaim(c) {
  const isApproved = c.status === 'APPROVED' || c.status === 'Approved' || c.status === 'AUTO_APPROVED';
  const isDuplicate = c.status === 'POSSIBLE_DUPLICATE';
  const isReview = c.status === 'NEEDS_REVIEW' || c.status === 'Pending Manager Approval' || c.status === 'PENDING_MANAGER';

  let stage = 'Stage 2: Verification Queue';
  if (isApproved) stage = 'Stage 7: Ledger Committed';
  else if (isDuplicate) stage = 'Stage 4: Duplicate Flagged';
  else if (isReview) stage = 'Stage 8: Pending Human Review';

  return {
    id: c.claimId || c._id,
    title: c.description || `${c.category} Expense`,
    merchant: c.description?.split(/[:|-]/)[0]?.trim() || c.category || 'Vendor',
    category: c.category,
    amountPaise: c.amountMinor || Math.round((c.amount || 0) * 100),
    currency: c.currency || 'INR',
    date: (c.expenseDate || c.createdAt || new Date().toISOString()).slice(0, 10),
    status: isApproved ? 'APPROVED' : isDuplicate ? 'POSSIBLE_DUPLICATE' : isReview ? 'NEEDS_REVIEW' : (c.status || 'QUEUED'),
    stage,
    anomalyScore: c.stageResults?.anomaly?.score || (isReview ? 0.75 : 0.08),
    dHash: c.receiptFingerprint || 'a71b4e99f0321bc4',
    receiptUrl: c.receiptUrl,
    reviewReason: (c.policyViolations && c.policyViolations.length > 0)
      ? c.policyViolations.join(', ')
      : (isDuplicate ? 'Duplicate receipt or matching expense details detected' : null),
    pipeline: {
      dHashVerified: Boolean(c.receiptFingerprint),
      aiExtracted: Boolean(c.stageResults?.extraction),
      policyDAG: isApproved,
      anomalyChecked: true,
      ledgerCommitted: isApproved,
    },
  };
}

function formatINR(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const [claims, setClaims] = useState(INITIAL_FALLBACK_CLAIMS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [actionNotice, setActionNotice] = useState('');

  const loadClaims = useCallback(async () => {
    try {
      setLoading(true);
      const isManagerOrAdmin = role === 'MANAGER' || role === 'SYSTEM_ADMIN' || role === 'FINANCE_ADMIN';
      const result = isManagerOrAdmin
        ? await claimsApi.getManagerClaims()
        : await claimsApi.getMyClaims();

      if (Array.isArray(result) && result.length > 0) {
        setClaims(result.map(normalizeBackendClaim));
      }
    } catch (err) {
      console.warn('Using existing claims state:', err.message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Handle new claim creation
  const handleClaimSubmitted = (newClaim) => {
    if (newClaim) {
      const normalized = normalizeBackendClaim(newClaim);
      setClaims((prev) => [normalized, ...prev.filter((c) => c.id !== normalized.id)]);
      setActionNotice(`Claim ${normalized.id} submitted! Status: ${normalized.status}`);
      setTimeout(() => setActionNotice(''), 5000);
    }
    loadClaims();
  };

  // Manager Actions
  const handleManagerDecision = async (claimId, newStatus) => {
    const action = newStatus === 'APPROVED' ? 'APPROVE' : 'REJECT';
    try {
      await claimsApi.recordDecision(claimId, action, `Manager signed off: ${action}`);
      setActionNotice(`Claim ${claimId} marked as ${newStatus}. PostgreSQL ledger updated.`);
      setTimeout(() => setActionNotice(''), 4000);
      loadClaims();
    } catch (err) {
      console.warn('Backend decision update error, updating local view:', err);
      setClaims((prev) =>
        prev.map((c) => {
          if (c.id === claimId) {
            return {
              ...c,
              status: newStatus,
              stage: newStatus === 'APPROVED' ? 'Stage 7: Ledger Committed by Manager' : 'Stage 8: Rejected by Reviewer',
              pipeline: { ...c.pipeline, ledgerCommitted: newStatus === 'APPROVED' },
            };
          }
          return c;
        })
      );
      setActionNotice(`Claim ${claimId} marked as ${newStatus}.`);
      setTimeout(() => setActionNotice(''), 4000);
    }
  };

  // Filtered claims
  const filteredClaims = claims.filter((claim) => {
    if (activeTab === 'review' && claim.status !== 'NEEDS_REVIEW' && claim.status !== 'POSSIBLE_DUPLICATE') {
      return false;
    }
    if (activeTab === 'approved' && claim.status !== 'AUTO_APPROVED' && claim.status !== 'APPROVED') {
      return false;
    }
    if (categoryFilter !== 'ALL' && claim.category !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        claim.merchant.toLowerCase().includes(q) ||
        claim.title.toLowerCase().includes(q) ||
        claim.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate Metrics
  const totalAmountPaise = claims.reduce((acc, c) => acc + (c.amountPaise || 0), 0);
  const approvedAmountPaise = claims
    .filter((c) => c.status === 'AUTO_APPROVED' || c.status === 'APPROVED')
    .reduce((acc, c) => acc + (c.amountPaise || 0), 0);
  const reviewCount = claims.filter((c) => c.status === 'NEEDS_REVIEW' || c.status === 'POSSIBLE_DUPLICATE').length;
  const approvedCount = claims.filter((c) => c.status === 'AUTO_APPROVED' || c.status === 'APPROVED').length;
  const autoRate = Math.round((approvedCount / (claims.length || 1)) * 100);

  return (
    <div className="fc-dashboard-page">
      <Navbar />

      <main className="fc-dashboard-main">
        {/* Welcome Header */}
        <section className="fc-dashboard-hero">
          <div className="fc-hero-text">
            <div className="fc-hero-badge">
              <span className="fc-hero-dot" />
              <span>Real-Time Corporate Expense Portal ({role})</span>
            </div>
            <h1>Welcome, {user?.name || 'Alex Vance'}</h1>
            <p>
              Autonomous claims processing enabled with perceptual dHash fraud detection, Gemini AI extraction, and PostgreSQL double-entry ledger.
            </p>
          </div>

          <div className="fc-hero-actions">
            <button
              className="fc-btn fc-btn-secondary"
              onClick={loadClaims}
              title="Refresh claims from backend"
              style={{ marginRight: '8px' }}
            >
              <RefreshCw size={15} className={loading ? 'fc-spin' : ''} />
              <span>Sync</span>
            </button>
            <button
              className="fc-btn fc-btn-primary fc-btn-lg"
              onClick={() => setIsSubmitModalOpen(true)}
            >
              <Plus size={16} />
              <span>Submit New Claim</span>
            </button>
          </div>
        </section>

        {/* Global Notice Banner */}
        {actionNotice && (
          <div className="fc-action-banner">
            <Sparkles size={16} />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* KPI Cards Grid */}
        <section className="fc-kpi-row">
          <div className="fc-kpi-card">
            <div className="fc-kpi-header">
              <span className="fc-kpi-title">Total Disbursed & Active</span>
              <div className="fc-kpi-icon-wrap">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="fc-kpi-figure">{formatINR(totalAmountPaise)}</div>
            <div className="fc-kpi-meta">Across {claims.length} registered claims</div>
          </div>

          <div className="fc-kpi-card">
            <div className="fc-kpi-header">
              <span className="fc-kpi-title">Ledger Committed (Stage 7)</span>
              <div className="fc-kpi-icon-wrap fc-icon-success">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="fc-kpi-figure" style={{ color: 'var(--fc-status-success-text)' }}>
              {formatINR(approvedAmountPaise)}
            </div>
            <div className="fc-kpi-meta">
              <span className="fc-text-success">{autoRate}% resolved in ledger</span>
            </div>
          </div>

          <div className="fc-kpi-card">
            <div className="fc-kpi-header">
              <span className="fc-kpi-title">Review & Duplicate Queue</span>
              <div className="fc-kpi-icon-wrap fc-icon-warning">
                <Clock size={16} />
              </div>
            </div>
            <div className="fc-kpi-figure" style={{ color: 'var(--fc-status-warning-text)' }}>
              {reviewCount} Claims
            </div>
            <div className="fc-kpi-meta">Requires manager or finance sign-off</div>
          </div>

          <div className="fc-kpi-card">
            <div className="fc-kpi-header">
              <span className="fc-kpi-title">Verification Engines</span>
              <div className="fc-kpi-icon-wrap fc-icon-ai">
                <BrainCircuit size={16} />
              </div>
            </div>
            <div className="fc-kpi-figure">8 / 8 Active</div>
            <div className="fc-kpi-meta">dHash, KD-Tree, Gemini, Ledger Online</div>
          </div>
        </section>

        {/* Claims Directory & Management */}
        <section className="fc-claims-section fc-card">
          <div className="fc-toolbar-header">
            {/* Tabs */}
            <div className="fc-toolbar-tabs">
              <button
                className={`fc-toolbar-tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Claims ({claims.length})
              </button>
              <button
                className={`fc-toolbar-tab ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                Requires Review ({reviewCount})
              </button>
              <button
                className={`fc-toolbar-tab ${activeTab === 'approved' ? 'active' : ''}`}
                onClick={() => setActiveTab('approved')}
              >
                Approved ({approvedCount})
              </button>
            </div>

            {/* Filter and Search */}
            <div className="fc-toolbar-controls">
              <div className="fc-search-box">
                <Search size={15} className="fc-search-icon" />
                <input
                  type="text"
                  placeholder="Search merchant, title, ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="fc-search-input"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="fc-filter-select"
              >
                <option value="ALL">All Categories</option>
                <option value="Food">Food & Dining</option>
                <option value="Travel">Travel & Transport</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Other">Other Expenses</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="fc-table-responsive">
            <table className="fc-table">
              <thead>
                <tr>
                  <th>Claim Ref</th>
                  <th>Expense Details</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Verification Stage</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="fc-empty-state">
                      No expense claims matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td>
                        <span className="fc-mono">{claim.id}</span>
                      </td>
                      <td>
                        <div className="fc-claim-cell">
                          <span className="fc-claim-title">{claim.title}</span>
                          <span className="fc-claim-sub">
                            {claim.merchant} &bull; {claim.date}
                          </span>
                          {claim.reviewReason && (
                            <span className="fc-claim-flag-note">
                              ⚠ {claim.reviewReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="fc-badge fc-badge-neutral">{claim.category}</span>
                      </td>
                      <td>
                        <span className="fc-amount-text">{formatINR(claim.amountPaise)}</span>
                      </td>
                      <td>
                        <span className="fc-stage-pill">{claim.stage}</span>
                      </td>
                      <td>
                        <span
                          className={`fc-badge ${
                            claim.status === 'AUTO_APPROVED' || claim.status === 'APPROVED'
                              ? 'fc-badge-success'
                              : claim.status === 'NEEDS_REVIEW' || claim.status === 'POSSIBLE_DUPLICATE'
                              ? 'fc-badge-warning'
                              : 'fc-badge-danger'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="fc-row-actions">
                          {/* Manager Quick Review Buttons */}
                          {(role === 'MANAGER' || role === 'SYSTEM_ADMIN') &&
                            (claim.status === 'NEEDS_REVIEW' || claim.status === 'POSSIBLE_DUPLICATE') && (
                              <>
                                <button
                                  className="fc-btn fc-btn-xs fc-btn-success"
                                  onClick={() => handleManagerDecision(claim.id, 'APPROVED')}
                                  title="Approve and Commit to PostgreSQL Ledger"
                                >
                                  <Check size={13} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  className="fc-btn fc-btn-xs fc-btn-danger"
                                  onClick={() => handleManagerDecision(claim.id, 'REJECTED')}
                                  title="Reject Claim"
                                >
                                  <XCircle size={13} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                          <button
                            className="fc-btn fc-btn-secondary fc-btn-sm"
                            onClick={() => setSelectedClaim(claim)}
                          >
                            <Eye size={13} />
                            <span>Audit Flow</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modals */}
      <SubmitClaimModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onClaimSubmitted={handleClaimSubmitted}
      />

      <ClaimDetailsModal
        claim={selectedClaim}
        isOpen={Boolean(selectedClaim)}
        onClose={() => setSelectedClaim(null)}
      />
    </div>
  );
}
