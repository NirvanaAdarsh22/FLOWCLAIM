import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  CheckSquare,
  Landmark,
  ShieldAlert,
  LogOut,
  Sparkles,
  User,
  ChevronDown,
  Layers
} from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, role, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roles = [
    { key: 'EMPLOYEE', label: 'Employee', desc: 'Submit claims & track status' },
    { key: 'MANAGER', label: 'Manager', desc: 'Review & approve anomalous claims' },
    { key: 'FINANCE_ADMIN', label: 'Finance Admin', desc: 'Manage budgets & double-entry ledger' },
    { key: 'SYSTEM_ADMIN', label: 'System Admin', desc: 'BullMQ pipeline & system health' },
  ];

  const currentRoleObj = roles.find((r) => r.key === role) || roles[0];

  return (
    <header className="fc-navbar">
      <div className="fc-navbar-container">
        {/* Brand Logo & Tagline */}
        <div className="fc-navbar-brand-section">
          <NavLink to="/dashboard" className="fc-brand-link">
            <div className="fc-brand-icon-box">
              <Sparkles size={18} className="fc-brand-sparkle" />
            </div>
            <div className="fc-brand-text">
              <span className="fc-brand-name">FlowClaim</span>
              <span className="fc-brand-subtitle">Autonomous Claim Engine</span>
            </div>
          </NavLink>
        </div>

        {/* Central Navigation Links */}
        <nav className="fc-navbar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `fc-nav-item ${isActive && !location.pathname.startsWith('/finance') && !location.pathname.startsWith('/admin') ? 'active' : ''}`
            }
          >
            <FileText size={16} />
            <span>Claims Hub</span>
          </NavLink>

          <NavLink
            to="/finance"
            className={({ isActive }) =>
              `fc-nav-item ${isActive || location.pathname.startsWith('/finance') ? 'active' : ''}`
            }
          >
            <Landmark size={16} />
            <span>Finance</span>
          </NavLink>

          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `fc-nav-item ${isActive || location.pathname.startsWith('/admin') ? 'active' : ''}`
            }
          >
            <ShieldAlert size={16} />
            <span>Admin</span>
          </NavLink>
        </nav>

        {/* Right Section: Persona Role Switcher & User Profile */}
        <div className="fc-navbar-actions">
          {/* Persona Switcher Pill */}
          <div className="fc-role-picker-wrapper">
            <button
              type="button"
              className="fc-role-picker-btn"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              title="Click to switch simulated user persona"
            >
              <span className="fc-role-dot" />
              <span className="fc-role-label">{currentRoleObj.label}</span>
              <ChevronDown size={14} className={`fc-role-arrow ${roleMenuOpen ? 'open' : ''}`} />
            </button>

            {roleMenuOpen && (
              <>
                <div className="fc-role-backdrop" onClick={() => setRoleMenuOpen(false)} />
                <div className="fc-role-dropdown">
                  <div className="fc-role-dropdown-header">
                    <span>SWITCH ACTIVE ROLE</span>
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      className={`fc-role-option ${role === r.key ? 'selected' : ''}`}
                      onClick={() => {
                        switchRole(r.key);
                        setRoleMenuOpen(false);
                        if (r.key === 'FINANCE_ADMIN') navigate('/finance');
                        else if (r.key === 'SYSTEM_ADMIN') navigate('/admin');
                        else navigate('/dashboard');
                      }}
                    >
                      <div className="fc-role-option-text">
                        <div className="fc-role-option-title">{r.label}</div>
                        <div className="fc-role-option-desc">{r.desc}</div>
                      </div>
                      {role === r.key && <span className="fc-role-active-check">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* User Profile Pill & Logout */}
          <div className="fc-user-pill">
            <div className="fc-user-avatar">
              <User size={15} />
            </div>
            <div className="fc-user-meta">
              <span className="fc-user-name">{user?.name || 'Authorized User'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="fc-logout-btn"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
