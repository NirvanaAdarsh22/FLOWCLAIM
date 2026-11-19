import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  Sparkles
} from 'lucide-react';
import './Dashboard.css';

const INITIAL_CLAIMS = [
  {
    id: 'CLM-9104',
    title: 'AWS Cloud Infrastructure Q3 Reserve',
    merchant: 'Amazon Web Services Inc.',
    category: 'SOFTWARE',
    amountPaise: 4200000, // ₹42,000.00
    currency: 'INR',
    date: '2026-11-18',
    status: 'AUTO_APPROVED',
    stage: 'Stage 7: Ledger Committed',
    anomalyScore: 0.08,
    dHash: 'e3f019a87b41c602',
    pipeline: { dHashVerified: true, aiExtracted: true, policyDAG: true, anomalyChecked: true, ledgerCommitted: true },
  },
  {
    id: 'CLM-9092',
    title: 'Client Strategy Dinner - 6 Attendees',
    merchant: 'The Oberoi Grand Hotel',
    category: 'MEALS',
    amountPaise: 1850000, // ₹18,500.00
    currency: 'INR',
    date: '2026-11-17',
    status: 'NEEDS_REVIEW',
    stage: 'Stage 8: Pending Manager Sign-off',
    anomalyScore: 0.74,
    dHash: '7a8801b92cd34120',
    pipeline: { dHashVerified: true, aiExtracted: true, policyDAG: false, anomalyChecked: true, ledgerCommitted: false },
    reviewReason: 'Per-diem exceeded daily team meal cap of ₹12,000. Alcohol exclusion check flagged.',
  },
  {
    id: 'CLM-8941',
    title: 'Bengaluru Client Visit - Airfare Return',
    merchant: 'IndiGo Airlines',
    category: 'TRAVEL',
    amountPaise: 1240000, // ₹12,400.00
    currency: 'INR',
    date: '2026-11-15',
    status: 'AUTO_APPROVED',
    stage: 'Stage 7: Ledger Committed',
    anomalyScore: 0.14,
    dHash: '1100fce93284aa19',
    pipeline: { dHashVerified: true, aiExtracted: true, policyDAG: true, anomalyChecked: true, ledgerCommitted: true },
  },
  {
    id: 'CLM-8830',
    title: 'Ergonomic Standing Desk Converter',
    merchant: 'GreenSoul Office Solutions',
    category: 'OFFICE',
    amountPaise: 890000, // ₹8,900.00
    currency: 'INR',
    date: '2026-11-12',
    status: 'AUTO_APPROVED',
    stage: 'Stage 7: Ledger Committed',
    anomalyScore: 0.11,
    dHash: 'f40a1829bc610034',
    pipeline: { dHashVerified: true, aiExtracted: true, policyDAG: true, anomalyChecked: true, ledgerCommitted: true },
  },
  {
    id: 'CLM-8722',
    title: 'Team Coffee & Quick Catch-up',
    merchant: 'Blue Tokai Roasters',
    category: 'MEALS',
    amountPaise: 145000, // ₹1,450.00
    currency: 'INR',
    date: '2026-11-10',
    status: 'AUTO_APPROVED',
    stage: 'Stage 7: Ledger Committed',
    anomalyScore: 0.05,
    dHash: 'c7012984ea2355bb',
    pipeline: { dHashVerified: true, aiExtracted: true, policyDAG: true, anomalyChecked: true, ledgerCommitted: true },
  },
  {
    id: 'CLM-8619',
    title: 'Duplicate Taxi Fare Voucher Submission',
    merchant: 'Uber India Technology Ltd.',
    category: 'TRAVEL',
    amountPaise: 92000, // ₹920.00
    currency: 'INR',
    date: '2026-11-08',
    status: 'POSSIBLE_DUPLICATE',
    stage: 'Stage 4: dHash Collision Flagged',
    anomalyScore: 0.89,
    dHash: '1100fce93284aa19',
    pipeline: { dHashVerified: false, aiExtracted: true, policyDAG: true, anomalyChecked: true, ledgerCommitted: false },
    reviewReason: 'dHash similarity 94% with previously approved claim CLM-8401.',
  },
];

function formatINR(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const [claims, setClaims] = useState(INITIAL_CLAIMS);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [actionNotice, setActionNotice] = useState('');

  // Handle new claim creation
  const handleClaimSubmitted = (newClaim) => {
    setClaims([newClaim, ...claims]);
    setActionNotice(`Claim ${newClaim.id} submitted! Evaluated: ${newClaim.status}`);
    setTimeout(() => setActionNotice(''), 5000);
  };

  // Manager Actions
  const handleManagerDecision = (claimId, newStatus) => {
    setClaims(claims.map((c) => {
      if (c.id === claimId) {
        return {
          ...c,
          status: newStatus,
          stage: newStatus === 'APPROVED' ? 'Stage 7: Ledger Committed by Manager' : 'Stage 8: Rejected by Reviewer',
          pipeline: { ...c.pipeline, ledgerCommitted: newStatus === 'APPROVED' },
        };
      }
      return c;
    }));
    setActionNotice(`Claim ${claimId} marked as ${newStatus}. Ledger synchronised.`);
    setTimeout(() => setActionNotice(''), 4000);
  };

  // Filtered claims
  const filteredClaims = claims.filter((claim) => {
    // Tab filter
    if (activeTab === 'review' && claim.status !== 'NEEDS_REVIEW' && claim.status !== 'POSSIBLE_DUPLICATE') {
      return false;
    }
    if (activeTab === 'approved' && claim.status !== 'AUTO_APPROVED' && claim.status !== 'APPROVED') {
      return false;
    }
    // Category filter
    if (categoryFilter !== 'ALL' && claim.category !== categoryFilter) {
      return false;
    }
    // Search filter
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
  const totalAmountPaise = claims.reduce((acc, c) => acc + c.amountPaise, 0);
  const approvedAmountPaise = claims
    .filter((c) => c.status === 'AUTO_APPROVED' || c.status === 'APPROVED')
    .reduce((acc, c) => acc + c.amountPaise, 0);
  const reviewCount = claims.filter((c) => c.status === 'NEEDS_REVIEW' || c.status === 'POSSIBLE_DUPLICATE').length;
  const autoApprovedCount = claims.filter((c) => c.status === 'AUTO_APPROVED').length;
  const autoRate = Math.round((autoApprovedCount / (claims.length || 1)) * 100);

  return (
    <div className="fc-dashboard-page">
      <Navbar />

      <main className="fc-dashboard-main">
        {/* Welcome Header */}
        <section className="fc-dashboard-hero">
          <div className="fc-hero-text">
            <div className="fc-hero-badge">
              <span className="fc-hero-dot" />
              <span>Real-Time Corporate Expense Portal</span>
            </div>
            <h1>Welcome, {user?.name || 'Vance'}</h1>
            <p>
              Autonomous claims processing enabled with perceptual dHash fraud detection, Gemini AI extraction, and PostgreSQL double-entry ledger.
            </p>
          </div>

          <div className="fc-hero-actions">
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
            <div className="fc-kpi-meta">Across {claims.length} verified submissions</div>
          </div>

          <div className="fc-kpi-card">
            <div className="fc-kpi-header">
              <span className="fc-kpi-title">Auto-Approved (Stage 7)</span>
              <div className="fc-kpi-icon-wrap fc-icon-success">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="fc-kpi-figure" style={{ color: 'var(--fc-status-success-text)' }}>
              {formatINR(approvedAmountPaise)}
            </div>
            <div className="fc-kpi-meta">
              <span className="fc-text-success">{autoRate}% autonomous resolution rate</span>
            </div>
          </div>

          <div className="fc-kpi-card">
            <div className="fc-kpi-header">
              <span className="fc-kpi-title">Review Queue</span>
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
          {/* Section Toolbar */}
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
                Approved ({claims.length - reviewCount})
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
                <option value="MEALS">Meals & Dining</option>
                <option value="TRAVEL">Travel & Transport</option>
                <option value="SOFTWARE">Software & Tools</option>
                <option value="OFFICE">Office Supplies</option>
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
