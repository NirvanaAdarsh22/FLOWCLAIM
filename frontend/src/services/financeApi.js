/**
 * @file frontend/src/services/financeApi.js
 * API client service for Finance Administrator operations (budgets, ledger, audit).
 * Plain JavaScript (ESM).
 */

const BASE_URL = '/api/finance';

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
    const error = new Error(data?.error?.message || `Finance API error (HTTP ${res.status})`);
    error.code = data?.error?.code || 'FINANCE_API_ERROR';
    error.httpStatus = res.status;
    error.details = data?.error?.details;
    throw error;
  }
  return data;
}

export const financeApi = {
  /**
   * Fetches paginated budgets with optional filtering.
   * @param {{ page?: number, pageSize?: number, period?: string, employeeId?: string }} params
   * @returns {Promise<import('@flowclaim/shared-types').Paginated<import('@flowclaim/shared-types').BudgetDto>>}
   */
  async getBudgets(params = {}) {
    const qs = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
      ...(params.period ? { period: params.period } : {}),
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    });
    return request(`/budgets?${qs}`);
  },

  /**
   * Upserts or creates a budget limit for an employee in a given period.
   * @param {{ employeeId: string, period: string, limitMinor: number }} payload
   * @returns {Promise<import('@flowclaim/shared-types').BudgetDto>}
   */
  async upsertBudget(payload) {
    return request('/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches paginated ledger entries.
   * @param {{ page?: number, pageSize?: number, claimId?: string, employeeId?: string }} params
   * @returns {Promise<import('@flowclaim/shared-types').Paginated<import('@flowclaim/shared-types').LedgerEntryDto>>}
   */
  async getLedgerEntries(params = {}) {
    const qs = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
      ...(params.claimId ? { claimId: params.claimId } : {}),
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    });
    return request(`/ledger?${qs}`);
  },

  /**
   * Fetches paginated audit events.
   * @param {{ page?: number, pageSize?: number, claimId?: string }} params
   * @returns {Promise<import('@flowclaim/shared-types').Paginated<import('@flowclaim/shared-types').AuditEventDto>>}
   */
  async getAuditEvents(params = {}) {
    const qs = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
      ...(params.claimId ? { claimId: params.claimId } : {}),
    });
    return request(`/audit?${qs}`);
  },
};
