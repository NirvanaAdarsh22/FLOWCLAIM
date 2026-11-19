/**
 * @file frontend/src/services/api.js
 * Centralized API client and authentication services for FlowClaim frontend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Storage keys used across FlowClaim.
 * We sync both 'token' and 'fc_token' for full compatibility across modules.
 */
const TOKEN_KEY = 'fc_token';
const LEGACY_TOKEN_KEY = 'token';
const USER_KEY = 'fc_user';
const LEGACY_USER_KEY = 'user';

export const tokenStorage = {
  get() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || null;
  },
  set(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(LEGACY_TOKEN_KEY, token);
    }
  },
  remove() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  },
};

export const userStorage = {
  get() {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(user) {
    if (user) {
      const normalized = {
        ...user,
        name: user.name || user.full_name,
        full_name: user.full_name || user.name,
        employeeId: user.employeeId || user.employee_id,
        employee_id: user.employee_id || user.employeeId,
      };
      const json = JSON.stringify(normalized);
      localStorage.setItem(USER_KEY, json);
      localStorage.setItem(LEGACY_USER_KEY, json);
    }
  },
  remove() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  },
};

/**
 * Unified fetch wrapper that injects Authorization headers and standardizes errors.
 */
export async function apiRequest(endpoint, options = {}) {
  const token = tokenStorage.get();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg =
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ||
      `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const authApi = {
  /**
   * Register a new employee account.
   * Backend returns: { success: true, message: string, user: Object }
   */
  async register(data) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name?.trim(),
        email: data.email?.trim(),
        password: data.password,
        employeeId: data.employeeId?.trim(),
        department: data.department?.trim() || 'General',
      }),
    });
  },

  /**
   * Log in user with credentials.
   * Backend returns: { success: true, message: string, token: string, user: Object }
   */
  async login(credentials) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email?.trim(),
        password: credentials.password,
      }),
    });

    if (data?.token) {
      tokenStorage.set(data.token);
    }
    if (data?.user) {
      userStorage.set(data.user);
    }

    return data;
  },

  /**
   * Request password reset link to user's email.
   * Backend returns: { success: true, message: string }
   */
  async forgotPassword(email) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  },

  /**
   * Reset password with reset token.
   * Backend returns: { success: true, message: string }
   */
  async resetPassword(token, password) {
    return apiRequest(`/auth/reset-password/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  /**
   * Fetch authenticated user's profile.
   * Backend returns: { success: true, user: { id, role } }
   */
  async getProfile() {
    return apiRequest('/profile', {
      method: 'GET',
    });
  },

  /**
   * Test finance dashboard endpoint (role protected).
   */
  async getFinanceTestDashboard() {
    return apiRequest('/finance/dashboard', {
      method: 'GET',
    });
  },

  /**
   * Clear session tokens and user data.
   */
  logout() {
    tokenStorage.remove();
    userStorage.remove();
  },
};

export default {
  apiRequest,
  authApi,
  tokenStorage,
  userStorage,
};
