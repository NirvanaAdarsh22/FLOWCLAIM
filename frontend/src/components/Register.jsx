import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, User, Mail, Lock, ArrowRight } from 'lucide-react';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    department: 'Engineering',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (Object.values(formData).some((v) => !v.trim())) {
      setError('Please fill in all fields.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    try {
      setLoading(true);
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-auth-page">
      <div className="fc-auth-card" style={{ maxWidth: '480px' }}>
        <div className="fc-auth-header">
          <div className="fc-brand-icon-box" style={{ margin: '0 auto 12px' }}>
            <Sparkles size={20} className="fc-brand-sparkle" />
          </div>
          <h1>Create FlowClaim Account</h1>
          <p>Join your organization's autonomous expense verification platform</p>
        </div>

        {error && <div className="fc-auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="fc-auth-form">
          <div className="fc-input-group">
            <label className="fc-input-label">Full Legal Name</label>
            <div className="fc-auth-input-wrap">
              <User size={16} className="fc-auth-input-icon" />
              <input
                type="text"
                name="name"
                placeholder="Jane Doe"
                value={formData.name}
                onChange={handleChange}
                className="fc-input fc-auth-input"
                required
              />
            </div>
          </div>

          <div className="fc-input-group">
            <label className="fc-input-label">Corporate Email</label>
            <div className="fc-auth-input-wrap">
              <Mail size={16} className="fc-auth-input-icon" />
              <input
                type="email"
                name="email"
                placeholder="jane.doe@flowclaim.internal"
                value={formData.email}
                onChange={handleChange}
                className="fc-input fc-auth-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="fc-input-group">
              <label className="fc-input-label">Employee ID</label>
              <input
                type="text"
                name="employeeId"
                placeholder="EMP-8021"
                value={formData.employeeId}
                onChange={handleChange}
                className="fc-input"
                required
              />
            </div>

            <div className="fc-input-group">
              <label className="fc-input-label">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="fc-input"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product & Design</option>
                <option value="Sales">Sales & Marketing</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
          </div>

          <div className="fc-input-group">
            <label className="fc-input-label">Create Password (min. 8 chars)</label>
            <div className="fc-auth-input-wrap">
              <Lock size={16} className="fc-auth-input-icon" />
              <input
                type="password"
                name="password"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={handleChange}
                className="fc-input fc-auth-input"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="fc-btn fc-btn-primary fc-auth-submit-btn">
            <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="fc-auth-footer">
          <span>Already have an account?</span>
          <Link to="/" className="fc-auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
