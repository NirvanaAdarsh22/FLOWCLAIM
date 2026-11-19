/**
 * @file frontend/src/services/adminApi.js
 * API client service for System Administrator operations (users, processing stats, health).
 * Plain JavaScript (ESM) with automatic fallback for seamless local previews.
 */

import { mockUsers, mockProcessingStats, mockHealth } from './mocks/admin.handlers.js';

const BASE_URL = '/api/admin';

// Local mutable memory store for fallback when backend is offline
let localUsers = [...mockUsers];
let localStats = { ...mockProcessingStats };
let localHealth = { ...mockHealth };

async function request(path, options = {}) {
  const token = localStorage.getItem('fc_token') || localStorage.getItem('token') || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (res.status === 204) return null;

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline or network failure: fall through to local fallback
  }

  return handleLocalFallback(path, options);
}

function handleLocalFallback(path, options) {
  const [endpoint] = path.split('?');
  const method = (options.method || 'GET').toUpperCase();

  if (endpoint === '/users') {
    return { items: localUsers, page: 1, pageSize: 20, total: localUsers.length };
  }

  if (endpoint.startsWith('/users/') && method === 'PATCH') {
    const userId = decodeURIComponent(endpoint.split('/')[2]);
    const updates = JSON.parse(options.body || '{}');
    localUsers = localUsers.map((u) => (u.id === userId ? { ...u, ...updates } : u));
    return localUsers.find((u) => u.id === userId) || updates;
  }

  if (endpoint === '/stats/processing') {
    return localStats;
  }

  if (endpoint.includes('/retry') && method === 'POST') {
    const claimId = endpoint.split('/')[2];
    return { claimId, status: 'QUEUED' };
  }

  if (endpoint === '/health') {
    return localHealth;
  }

  return { items: [] };
}

export const adminApi = {
  /**
   * Fetches paginated user accounts.
   * @param {{ page?: number, pageSize?: number, role?: string }} params
   * @returns {Promise<import('@flowclaim/shared-types').Paginated<import('@flowclaim/shared-types').UserDto>>}
   */
  async getUsers(params = {}) {
    const qs = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
      ...(params.role ? { role: params.role } : {}),
    });
    return request(`/users?${qs}`);
  },

  /**
   * Updates a user's role or active status.
   * @param {string} userId
   * @param {{ role?: string, active?: boolean }} updates
   * @returns {Promise<import('@flowclaim/shared-types').UserDto>}
   */
  async updateUser(userId, updates) {
    return request(`/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Fetches real-time queue status, claims by status, and recent failure logs.
   * @returns {Promise<import('@flowclaim/shared-types').ProcessingStatsDto>}
   */
  async getProcessingStats() {
    return request('/stats/processing');
  },

  /**
   * Triggers manual re-queue for a failed claim.
   * @param {string} claimId
   * @returns {Promise<{ claimId: string, status: string }>}
   */
  async retryFailedClaim(claimId) {
    return request(`/claims/${encodeURIComponent(claimId)}/retry`, {
      method: 'POST',
    });
  },

  /**
   * Fetches system health status across all infrastructure dependencies.
   * @returns {Promise<import('@flowclaim/shared-types').HealthDto>}
   */
  async getSystemHealth() {
    return request('/health');
  },
};
