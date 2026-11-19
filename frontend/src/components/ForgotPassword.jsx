import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      const data = await forgotPassword(email);
      setMessage(data?.message || `Password reset instructions dispatched to ${email}.`);
    } catch (err) {
      setError(err.message || 'Unable to connect to server.');
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
          <h1>Reset Password</h1>
          <p>Enter your registered corporate email to receive a recovery token</p>
        </div>

        {error && <div className="fc-auth-error">{error}</div>}

        {message && (
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
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="fc-auth-form">
          <div className="fc-input-group">
            <label className="fc-input-label">Corporate Email</label>
            <div className="fc-auth-input-wrap">
              <Mail size={16} className="fc-auth-input-icon" />
              <input
                type="email"
                placeholder="name@flowclaim.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="fc-input fc-auth-input"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="fc-btn fc-btn-primary fc-auth-submit-btn">
            <span>{loading ? 'Sending Link...' : 'Send Reset Link'}</span>
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
