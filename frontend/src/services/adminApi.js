/**
 * @file frontend/src/services/adminApi.js
 * API client service for System Administrator operations (users, processing stats, health).
 * Plain JavaScript (ESM).
 */

const BASE_URL = '/api/admin';

async function request(path, options = {}) {
  const token = localStorage.getItem('fc_token') || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error?.message || `Admin API error (HTTP ${res.status})`);
    error.code = data?.error?.code || 'ADMIN_API_ERROR';
    error.httpStatus = res.status;
    error.details = data?.error?.details;
    throw error;
  }
  return data;
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
