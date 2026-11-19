import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQuickDemo = (roleKey) => {
    const personas = {
      employee: {
        email: 'alex.vance@flowclaim.internal',
        password: 'Password123!',
        user: { id: 'usr-101', name: 'Alex Vance', email: 'alex.vance@flowclaim.internal', role: 'EMPLOYEE', department: 'Engineering' },
      },
      manager: {
        email: 'sarah.connor@flowclaim.internal',
        password: 'Password123!',
        user: { id: 'usr-202', name: 'Sarah Connor', email: 'sarah.connor@flowclaim.internal', role: 'MANAGER', department: 'Engineering Leadership' },
      },
      finance: {
        email: 'finance@flowclaim.internal',
        password: 'Password123!',
        user: { id: 'user-fin-1', name: 'Finance Officer', email: 'finance@flowclaim.internal', role: 'FINANCE_ADMIN', department: 'Treasury' },
      },
      admin: {
        email: 'admin@flowclaim.internal',
        password: 'Password123!',
        user: { id: 'user-admin-1', name: 'Chief SysAdmin', email: 'admin@flowclaim.internal', role: 'SYSTEM_ADMIN', department: 'Operations' },
      },
    };

    const p = personas[roleKey] || personas.employee;
    login(p.user, `jwt-token-${roleKey}`);
    if (roleKey === 'finance') navigate('/finance');
    else if (roleKey === 'admin') navigate('/admin');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim() || !formData.password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      const data = await login(formData.email, formData.password);
      const role = data?.user?.role?.toUpperCase();
      if (role === 'ADMIN' || role === 'SYSTEM_ADMIN') {
        navigate('/admin');
      } else if (role === 'FINANCE_ADMIN' || role === 'FINANCE_MANAGER' || role === 'FINANCE') {
        navigate('/finance');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-auth-page">
      <div className="fc-auth-card">
        {/* Brand Header */}
        <div className="fc-auth-header">
          <div className="fc-brand-icon-box" style={{ margin: '0 auto 12px' }}>
            <Sparkles size={20} className="fc-brand-sparkle" />
          </div>
          <h1>FlowClaim</h1>
          <p>Autonomous Corporate Claim & Expense Verification</p>
        </div>

        {/* Demo Fast Login Bar */}
        <div className="fc-quick-demo-box">
          <span className="fc-quick-demo-title">
            <ShieldCheck size={13} />
            ONE-CLICK PERSONA PREVIEW
          </span>
          <div className="fc-quick-demo-btns">
            <button type="button" onClick={() => handleQuickDemo('employee')} className="fc-demo-pill">
              Employee
            </button>
            <button type="button" onClick={() => handleQuickDemo('manager')} className="fc-demo-pill">
              Manager
            </button>
            <button type="button" onClick={() => handleQuickDemo('finance')} className="fc-demo-pill">
              Finance
            </button>
            <button type="button" onClick={() => handleQuickDemo('admin')} className="fc-demo-pill">
              Admin
            </button>
          </div>
        </div>

        {error && <div className="fc-auth-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="fc-auth-form">
          <div className="fc-input-group">
            <label className="fc-input-label">Corporate Email</label>
            <div className="fc-auth-input-wrap">
              <Mail size={16} className="fc-auth-input-icon" />
              <input
                type="email"
                name="email"
                placeholder="name@flowclaim.internal"
                value={formData.email}
                onChange={handleChange}
                className="fc-input fc-auth-input"
                required
              />
            </div>
          </div>

          <div className="fc-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="fc-input-label">Password</label>
              <Link to="/forgot-password" className="fc-auth-forgot-link">
                Forgot password?
              </Link>
            </div>
            <div className="fc-auth-input-wrap">
              <Lock size={16} className="fc-auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={handleChange}
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

          <button type="submit" disabled={loading} className="fc-btn fc-btn-primary fc-auth-submit-btn">
            <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="fc-auth-footer">
          <span>New to FlowClaim?</span>
          <Link to="/register" className="fc-auth-link">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
