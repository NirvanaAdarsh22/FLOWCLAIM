/**
 * @file frontend/src/context/AuthContext.jsx
 * Unified Authentication State Provider and Hook for FlowClaim.
 * Supports backend API authentication as well as local persona switching.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, tokenStorage, userStorage } from '../services/api.js';

const AuthContext = createContext(null);

const DEFAULT_DEMO_USER = {
  id: 'usr-101',
  name: 'Alex Vance',
  email: 'alex.vance@flowclaim.internal',
  role: 'EMPLOYEE',
  employeeId: 'EMP-7489',
  department: 'Engineering',
};

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => tokenStorage.get() || null);
  const [user, setUserState] = useState(() => userStorage.get() || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = tokenStorage.get();
    const savedUser = userStorage.get();
    if (savedToken) setTokenState(savedToken);
    if (savedUser) setUserState(savedUser);
  }, []);

  const login = async (userDataOrEmail, tokenOrPassword) => {
    // If called with (email, password) - authenticates with backend API
    if (typeof userDataOrEmail === 'string' && typeof tokenOrPassword === 'string') {
      const data = await authApi.login({ email: userDataOrEmail, password: tokenOrPassword });
      setTokenState(data.token);
      setUserState(userStorage.get());
      return data;
    }

    // If called with (userObject, tokenString) - e.g. quick demo persona switcher
    const userData = userDataOrEmail;
    const tokenVal = tokenOrPassword;
    tokenStorage.set(tokenVal);
    userStorage.set(userData);
    setTokenState(tokenVal);
    setUserState(userData);
    return { user: userData, token: tokenVal };
  };

  const register = async (formData) => {
    return await authApi.register(formData);
  };

  const forgotPassword = async (email) => {
    return await authApi.forgotPassword(email);
  };

  const resetPassword = async (resetToken, newPassword) => {
    return await authApi.resetPassword(resetToken, newPassword);
  };

  const logout = () => {
    authApi.logout();
    tokenStorage.remove();
    userStorage.remove();
    setTokenState(null);
    setUserState(null);
  };

  const switchRole = (newRole) => {
    const roleProfiles = {
      EMPLOYEE: {
        id: 'usr-101',
        name: 'Alex Vance',
        email: 'alex.vance@flowclaim.internal',
        role: 'EMPLOYEE',
        employeeId: 'EMP-7489',
        department: 'Engineering',
      },
      MANAGER: {
        id: 'usr-202',
        name: 'Sarah Connor',
        email: 'sarah.connor@flowclaim.internal',
        role: 'MANAGER',
        employeeId: 'MGR-3310',
        department: 'Engineering Leadership',
      },
      FINANCE_ADMIN: {
        id: 'user-fin-1',
        name: 'Finance Officer',
        email: 'finance@flowclaim.internal',
        role: 'FINANCE_ADMIN',
        employeeId: 'FIN-1002',
        department: 'Treasury & Accounting',
      },
      SYSTEM_ADMIN: {
        id: 'user-admin-1',
        name: 'Chief SysAdmin',
        email: 'admin@flowclaim.internal',
        role: 'SYSTEM_ADMIN',
        employeeId: 'ADM-0001',
        department: 'Infrastructure Operations',
      },
    };

    const nextUser = roleProfiles[newRole] || {
      ...user,
      role: newRole,
    };
    tokenStorage.set(`jwt-${newRole.toLowerCase()}-token`);
    userStorage.set(nextUser);
    setUserState(nextUser);
    setTokenState(`jwt-${newRole.toLowerCase()}-token`);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    role: user?.role || 'EMPLOYEE',
    loading,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
