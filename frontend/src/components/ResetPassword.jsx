import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Sparkles, Lock, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }).catch(() => null);

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-auth-page">
      <div className="fc-auth-card">
        <div className="fc-auth-header">
          <div className="fc-brand-icon-box" style={{ margin: '0 auto 12px' }}>
            <Sparkles size={20} className="fc-brand-sparkle" />
          </div>
          <h1>Create New Password</h1>
          <p>Choose a secure passphrase of at least 8 characters</p>
        </div>

        {error && <div className="fc-auth-error">{error}</div>}

        {success && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--fc-status-success-bg)',
            color: 'var(--fc-status-success-text)',
            border: '1px solid var(--fc-status-success-border)',
            borderRadius: 'var(--fc-radius-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="fc-auth-form">
          <div className="fc-input-group">
            <label className="fc-input-label">New Password</label>
            <div className="fc-auth-input-wrap">
              <Lock size={16} className="fc-auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="fc-input fc-auth-input"
                required
              />
              <button
                type="button"
                className="fc-auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="fc-input-group">
            <label className="fc-input-label">Confirm New Password</label>
            <div className="fc-auth-input-wrap">
              <Lock size={16} className="fc-auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="fc-input fc-auth-input"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="fc-btn fc-btn-primary fc-auth-submit-btn">
            <span>{loading ? 'Updating Password...' : 'Reset Password'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="fc-auth-footer">
          <Link to="/" className="fc-auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
