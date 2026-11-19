/**
 * @file frontend/src/context/AuthContext.jsx
 * Authentication state provider and hook for FlowClaim.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, tokenStorage, userStorage } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => tokenStorage.get());
  const [user, setUserState] = useState(() => userStorage.get());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Synchronize initial state from storage
    const savedToken = tokenStorage.get();
    const savedUser = userStorage.get();

    setTokenState(savedToken);
    setUserState(savedUser);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    setTokenState(data.token);
    setUserState(userStorage.get());
    return data;
  };

  const register = async (formData) => {
    return authApi.register(formData);
  };

  const forgotPassword = async (email) => {
    return authApi.forgotPassword(email);
  };

  const resetPassword = async (resetToken, newPassword) => {
    return authApi.resetPassword(resetToken, newPassword);
  };

  const logout = () => {
    authApi.logout();
    setTokenState(null);
    setUserState(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    role: user?.role || 'guest',
    loading,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
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
