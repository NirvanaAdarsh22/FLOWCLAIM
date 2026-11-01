/**
 * @file worker/src/services/claimStateClient.js
 * Implementation of the ClaimStatePort HTTP client communicating with backend2 /internal routes.
 */

import { config } from '../config/index.js';

/**
 * Creates an HTTP client implementing ClaimStatePort and auxiliary backend ports.
 *
 * @param {object} [customConfig]
 * @returns {import('@flowclaim/shared-types').ClaimStatePort & {
 *   getExtraction: (claimId: string) => Promise<any>,
 *   getActivePolicy: () => Promise<any>,
 *   getApprovedExpenses: (params: { category: string, limit: number }) => Promise<any[]>,
 *   getPendingReconcileClaims: (params: { updatedBefore: string }) => Promise<string[]>
 * }}
 */
export function createClaimStateClient(customConfig = {}) {
  const baseUrl = customConfig.internalApiUrl || config.internalApiUrl;
  const token = customConfig.internalApiToken || config.internalApiToken;

  async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 204) {
      return null;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const err = new Error(data?.error?.message || `Internal API HTTP ${res.status} on ${path}`);
      err.code = data?.error?.code || 'INTERNAL_API_ERROR';
      err.httpStatus = res.status;
      err.details = data?.error?.details;
      throw err;
    }

    return data;
  }

  return {
    async getProcessingContext(claimId) {
      return request(`/claims/${encodeURIComponent(claimId)}/context`);
    },

    async transition({ claimId, from, to, transitionKey, reason, actor = 'SYSTEM' }) {
      return request(`/claims/${encodeURIComponent(claimId)}/transitions`, {
        method: 'POST',
        body: JSON.stringify({ from, to, transitionKey, reason, actor }),
      });
    },

    async saveStageResult(claimId, stage, result) {
      await request(`/claims/${encodeURIComponent(claimId)}/stages/${encodeURIComponent(stage)}`, {
        method: 'PUT',
        body: JSON.stringify(result),
      });
    },

    async recordFailure(claimId, err) {
      await request(`/claims/${encodeURIComponent(claimId)}/failures`, {
        method: 'POST',
        body: JSON.stringify(err),
      });
    },

    async getExtraction(claimId) {
      try {
        return await request(`/claims/${encodeURIComponent(claimId)}/extraction`);
      } catch (err) {
        if (err.httpStatus === 404) return null;
        throw err;
      }
    },

    async getActivePolicy() {
      return request('/policies/active');
    },

    async getApprovedExpenses({ category, limit = 100 }) {
      const qs = new URLSearchParams({ category: category || '', limit: String(limit) });
      return request(`/history/approved?${qs}`);
    },

    async getPendingReconcileClaims({ updatedBefore }) {
      const qs = new URLSearchParams({ updatedBefore: updatedBefore || '' });
      const res = await request(`/claims?${qs}`);
      return res?.claimIds || [];
    },
  };
}
