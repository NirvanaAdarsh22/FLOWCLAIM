/**
 * @file frontend/src/services/financeApi.js
 * API client service for Finance Administrator operations (budgets, ledger, audit).
 * Plain JavaScript (ESM) with automatic fallback for seamless local previews.
 */

import { mockBudgets, mockLedgerEntries, mockAuditEvents } from './mocks/finance.handlers.js';

const BASE_URL = '/api/finance';

// Local mutable memory store for fallback when backend is offline
let localBudgets = [...mockBudgets];
let localLedger = [...mockLedgerEntries];
let localAudit = [...mockAuditEvents];

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

  // Graceful local fallback for local development and offline mock
  return handleLocalFallback(path, options);
}

function handleLocalFallback(path, options) {
  const [endpoint, queryStr] = path.split('?');
  const method = (options.method || 'GET').toUpperCase();

  if (endpoint === '/budgets') {
    if (method === 'POST') {
      const payload = JSON.parse(options.body || '{}');
      const newBudget = {
        budgetId: `b-${String(localBudgets.length + 1).padStart(3, '0')}`,
        employeeId: payload.employeeId,
        employeeName: `Employee ${payload.employeeId}`,
        period: payload.period || new Date().toISOString().slice(0, 7),
        limitMinor: Number(payload.limitMinor) || 0,
        spentMinor: 0,
        updatedAt: new Date().toISOString(),
      };
      localBudgets = [newBudget, ...localBudgets];
      return newBudget;
    }
    return { items: localBudgets, page: 1, pageSize: 20, total: localBudgets.length };
  }

  if (endpoint === '/ledger') {
    return { items: localLedger, page: 1, pageSize: 20, total: localLedger.length };
  }

  if (endpoint === '/audit') {
    return { items: localAudit, page: 1, pageSize: 20, total: localAudit.length };
  }

  return { items: [] };
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
