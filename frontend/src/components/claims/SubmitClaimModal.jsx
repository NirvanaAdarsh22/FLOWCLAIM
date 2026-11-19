import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Sparkles,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import './SubmitClaimModal.css';

export default function SubmitClaimModal({ isOpen, onClose, onClaimSubmitted }) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    title: '',
    merchant: '',
    category: 'MEALS',
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    currency: 'INR',
    description: '',
  });

  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [hashStatus, setHashStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { value: 'MEALS', label: 'Meals & Per Diem (Cap: ₹3,500/day)' },
    { value: 'TRAVEL', label: 'Travel & Transport' },
    { value: 'LODGING', label: 'Hotel & Lodging' },
    { value: 'SOFTWARE', label: 'Software & Cloud Subscriptions' },
    { value: 'OFFICE', label: 'Office Equipment & Supplies' },
  ];

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setFilePreview(url);

      // Simulate instantaneous dHash perceptual computation
      setTimeout(() => {
        const simulatedDHash = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
        setHashStatus({
          dHash: simulatedDHash,
          bloomCheck: 'CLEAR',
          similarity: '0.04 (No duplicate candidate)',
        });
      }, 400);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.merchant || !formData.amount) return;

    setSubmitting(true);
    setTimeout(() => {
      const claimAmount = parseFloat(formData.amount);
      const newClaim = {
        id: `CLM-${Math.floor(1000 + Math.random() * 9000)}`,
        title: formData.title || `${formData.category} at ${formData.merchant}`,
        merchant: formData.merchant,
        category: formData.category,
        amountPaise: Math.round(claimAmount * 100),
        currency: formData.currency,
        date: formData.date,
        createdAt: new Date().toISOString(),
        status: claimAmount > 15000 ? 'NEEDS_REVIEW' : 'AUTO_APPROVED',
        receiptUrl: filePreview,
        dHash: hashStatus?.dHash || 'a71b4e99f0321bc4',
        anomalyScore: claimAmount > 15000 ? 0.78 : 0.12,
        stage: claimAmount > 15000 ? 'Stage 8: Pending Human Review' : 'Stage 7: Ledger Committed',
        pipeline: {
          dHashVerified: true,
          aiExtracted: true,
          policyDAG: claimAmount <= 20000,
          anomalyChecked: true,
          ledgerCommitted: claimAmount <= 15000,
        },
      };

      onClaimSubmitted(newClaim);
      setSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fc-modal-overlay" onClick={onClose}>
      <div className="fc-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="fc-modal-header">
          <div className="fc-modal-header-text">
            <h2>Submit New Expense Claim</h2>
            <p>Upload receipts for instant AI extraction, perceptual duplicate check, and policy audit.</p>
          </div>
          <button className="fc-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="fc-modal-form">
          <div className="fc-modal-body-grid">
            {/* Left Column: Receipt Dropzone & Perceptual Check */}
            <div className="fc-modal-upload-col">
              <label className="fc-input-label">Receipt Proof (JPG, PNG, PDF)</label>
              <div className={`fc-dropzone ${file ? 'has-file' : ''}`}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="fc-dropzone-input"
                  id="receipt-file-input"
                />
                {filePreview ? (
                  <div className="fc-preview-box">
                    <img src={filePreview} alt="Receipt preview" className="fc-preview-img" />
                    <label htmlFor="receipt-file-input" className="fc-reupload-label">
                      Change File
                    </label>
                  </div>
                ) : (
                  <label htmlFor="receipt-file-input" className="fc-dropzone-prompt">
                    <div className="fc-upload-icon-circle">
                      <UploadCloud size={24} />
                    </div>
                    <span className="fc-upload-prompt-text">Click or drag receipt image here</span>
                    <span className="fc-upload-subtext">JPEG, PNG or PDF up to 10MB</span>
                  </label>
                )}
              </div>

              {/* Perceptual Hash Screening Preview */}
              {hashStatus && (
                <div className="fc-hash-badge-box">
                  <div className="fc-hash-header">
                    <ShieldCheck size={14} className="fc-hash-icon" />
                    <span className="fc-hash-title">Stage 2: Perceptual dHash Screen</span>
                  </div>
                  <div className="fc-hash-row">
                    <span>Fingerprint:</span>
                    <span className="fc-mono">{hashStatus.dHash}</span>
                  </div>
                  <div className="fc-hash-row">
                    <span>Bloom Check:</span>
                    <span className="fc-hash-pass">✔ PASS (Zero exact duplicate)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Claim Details */}
            <div className="fc-modal-fields-col">
              <div className="fc-input-group">
                <label className="fc-input-label">Claim Title / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Team Dinner with Design Clients"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="fc-input"
                  required
                />
              </div>

              <div className="fc-form-row">
                <div className="fc-input-group" style={{ flex: 1 }}>
                  <label className="fc-input-label">Merchant Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Indigo Airlines, Taj Hotel"
                    value={formData.merchant}
                    onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                    className="fc-input"
                    required
                  />
                </div>

                <div className="fc-input-group" style={{ flex: 1 }}>
                  <label className="fc-input-label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="fc-input"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="fc-form-row">
                <div className="fc-input-group" style={{ flex: 1 }}>
                  <label className="fc-input-label">Expense Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="fc-input"
                    required
                  />
                </div>

                <div className="fc-input-group" style={{ flex: 1 }}>
                  <label className="fc-input-label">Amount (INR ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="fc-input"
                    required
                  />
                </div>
              </div>

              <div className="fc-input-group">
                <label className="fc-input-label">Business Justification</label>
                <textarea
                  rows="2"
                  placeholder="Explain why this expense was incurred for corporate operations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="fc-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Instant Automated Policy Pre-check */}
              <div className="fc-policy-precheck">
                <div className="fc-precheck-title">
                  <Sparkles size={14} />
                  <span>Autonomous Policy Pre-Check</span>
                </div>
                <div className="fc-precheck-grid">
                  <div className="fc-precheck-item">
                    <CheckCircle2 size={13} className="fc-check-icon" />
                    <span>Receipt Attached</span>
                  </div>
                  <div className="fc-precheck-item">
                    <CheckCircle2 size={13} className="fc-check-icon" />
                    <span>Category Limit Check</span>
                  </div>
                  <div className="fc-precheck-item">
                    <CheckCircle2 size={13} className="fc-check-icon" />
                    <span>PostgreSQL Atomic Lock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="fc-modal-footer">
            <button type="button" className="fc-btn fc-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="fc-btn fc-btn-primary" disabled={submitting}>
              {submitting ? 'Running Pipeline Verification...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
