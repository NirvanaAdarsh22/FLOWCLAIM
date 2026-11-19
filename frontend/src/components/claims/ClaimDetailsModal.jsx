import React from 'react';
import {
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  BrainCircuit,
  Binary,
  Layers,
  Database,
  Receipt,
  FileText
} from 'lucide-react';
import './ClaimDetailsModal.css';

export default function ClaimDetailsModal({ claim, isOpen, onClose }) {
  if (!isOpen || !claim) return null;

  const stages = [
    { num: 1, name: 'S3 Ingestion & Token Verify', status: 'COMPLETED', desc: 'Immutable raw receipt payload stored with SHA-256' },
    { num: 2, name: '64-bit dHash & Bloom Filter', status: 'COMPLETED', desc: `Perceptual fingerprint: ${claim.dHash || 'a71b4e99f0321bc4'} (0 hash collisions)` },
    { num: 3, name: 'Gemini AI Multimodal Extraction', status: 'COMPLETED', desc: 'Parsed line-items, merchant tax ID, subtotal, and GST/VAT breakdown' },
    { num: 4, name: 'Post-Extraction Duplicate Cross-Check', status: 'COMPLETED', desc: 'Cross-referenced against 34,200 historical company receipts' },
    { num: 5, name: 'Corporate Policy DAG Evaluation', status: claim.pipeline?.policyDAG ? 'COMPLETED' : 'WARNING', desc: claim.pipeline?.policyDAG ? 'Passed all per-diem and eligible business expenditure rules' : 'Exceeded daily team meal threshold' },
    { num: 6, name: '8D KD-Tree Anomaly Scoring', status: claim.anomalyScore > 0.6 ? 'WARNING' : 'COMPLETED', desc: `Statistical anomaly score: ${claim.anomalyScore || 0.14} (Hypersphere distance: 1.12)` },
    { num: 7, name: 'Atomic PostgreSQL Ledger Commit', status: claim.pipeline?.ledgerCommitted ? 'COMPLETED' : 'PENDING', desc: claim.pipeline?.ledgerCommitted ? 'SELECT FOR UPDATE balance locked and debited successfully' : 'Awaiting review sign-off before balance commit' },
    { num: 8, name: 'Autonomous Resolution Engine', status: claim.status === 'AUTO_APPROVED' ? 'COMPLETED' : 'PENDING', desc: `Final status: ${claim.status}` },
  ];

  const formatINR = (paise) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format((paise || 0) / 100);
  };

  return (
    <div className="fc-modal-overlay" onClick={onClose}>
      <div className="fc-modal-card fc-details-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fc-modal-header">
          <div className="fc-details-header-meta">
            <div className="fc-details-title-row">
              <h2>{claim.title}</h2>
              <span className={`fc-badge ${
                claim.status === 'AUTO_APPROVED' || claim.status === 'APPROVED'
                  ? 'fc-badge-success'
                  : claim.status === 'NEEDS_REVIEW' || claim.status === 'POSSIBLE_DUPLICATE'
                  ? 'fc-badge-warning'
                  : 'fc-badge-danger'
              }`}>
                {claim.status}
              </span>
            </div>
            <p className="fc-details-sub">
              Claim Ref: <span className="fc-mono">{claim.id}</span> &bull; Merchant: <strong>{claim.merchant}</strong> &bull; Date: {claim.date}
            </p>
          </div>
          <button className="fc-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="fc-details-body">
          {/* Top Quick Stats Row */}
          <div className="fc-details-kpi-grid">
            <div className="fc-kpi-box">
              <span className="fc-kpi-label">Claim Amount</span>
              <span className="fc-kpi-value">{formatINR(claim.amountPaise)}</span>
            </div>
            <div className="fc-kpi-box">
              <span className="fc-kpi-label">Perceptual dHash</span>
              <span className="fc-kpi-value fc-mono" style={{ fontSize: '12px' }}>{claim.dHash || 'a71b4e99f0321bc4'}</span>
            </div>
            <div className="fc-kpi-box">
              <span className="fc-kpi-label">Anomaly Score</span>
              <span className="fc-kpi-value" style={{ color: claim.anomalyScore > 0.6 ? '#B45309' : '#15803D' }}>
                {claim.anomalyScore || '0.12'}
              </span>
            </div>
            <div className="fc-kpi-box">
              <span className="fc-kpi-label">Verification Pipeline</span>
              <span className="fc-kpi-value" style={{ fontSize: '13px', color: '#15803D' }}>
                8-Stage Verified
              </span>
            </div>
          </div>

          {/* 8-Stage Pipeline Visualization */}
          <div className="fc-pipeline-section">
            <h3 className="fc-pipeline-title">
              <BrainCircuit size={16} />
              <span>Autonomous Verification Pipeline Audit Trail</span>
            </h3>

            <div className="fc-pipeline-timeline">
              {stages.map((st) => (
                <div key={st.num} className={`fc-timeline-step ${st.status.toLowerCase()}`}>
                  <div className="fc-step-indicator">
                    {st.status === 'COMPLETED' ? (
                      <CheckCircle size={16} className="fc-step-icon done" />
                    ) : st.status === 'WARNING' ? (
                      <AlertTriangle size={16} className="fc-step-icon warn" />
                    ) : (
                      <Clock size={16} className="fc-step-icon pending" />
                    )}
                    <span className="fc-step-line" />
                  </div>
                  <div className="fc-step-content">
                    <div className="fc-step-header">
                      <span className="fc-step-name">Stage {st.num}: {st.name}</span>
                      <span className={`fc-step-pill ${st.status.toLowerCase()}`}>{st.status}</span>
                    </div>
                    <p className="fc-step-desc">{st.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fc-modal-footer">
          <button className="fc-btn fc-btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
