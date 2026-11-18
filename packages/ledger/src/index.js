/**
 * @flowclaim/ledger
 * Public entrypoint for the PostgreSQL atomic financial ledger and budget manager.
 */

import { runMigrations } from './database/migrator.js';
import { commitClaim, listLedgerEntries } from './transactions/commit-claim.js';
import { upsertBudget, listBudgets } from './budgets/budget-service.js';
import { appendAudit, listAudit } from './audit/audit-service.js';
import { buildClaimCommitKey } from './idempotency/idempotency-check.js';
import { toSafeInteger, generateUuid } from './utils/safe-math.js';

/**
 * Creates the FlowClaim Ledger Service bound to a PostgreSQL connection pool.
 * 
 * @param {{ pool: import('pg').Pool }} options
 * @returns {{
 *   migrate: () => Promise<void>,
 *   commitClaim: (input: import('../../shared-types/src/ledger.js').LedgerCommitInput) => Promise<import('../../shared-types/src/ledger.js').LedgerCommitResult>,
 *   upsertBudget: (params: { employeeId: string, period: string, limitMinor: number, actor: string }) => Promise<import('../../shared-types/src/ledger.js').BudgetDto>,
 *   listBudgets: (params?: { page?: number, pageSize?: number, period?: string, employeeId?: string }) => Promise<import('../../shared-types/src/claim.js').Paginated<import('../../shared-types/src/ledger.js').BudgetDto>>,
 *   listLedgerEntries: (params?: { page?: number, pageSize?: number, claimId?: string, employeeId?: string }) => Promise<import('../../shared-types/src/claim.js').Paginated<import('../../shared-types/src/ledger.js').LedgerEntryDto>>,
 *   appendAudit: (params: { claimId?: string, actor: string, action: string, detail?: Record<string, unknown> }) => Promise<import('../../shared-types/src/ledger.js').AuditEventDto>,
 *   listAudit: (params?: { page?: number, pageSize?: number, claimId?: string }) => Promise<import('../../shared-types/src/claim.js').Paginated<import('../../shared-types/src/ledger.js').AuditEventDto>>
 * }}
 */
export function createLedger({ pool }) {
  if (!pool) {
    throw new Error('A valid PostgreSQL pool instance must be provided to createLedger');
  }

  return {
    async migrate() {
      await runMigrations(pool);
    },

    async commitClaim(input) {
      return commitClaim(pool, input);
    },

    async upsertBudget(params) {
      return upsertBudget(pool, params);
    },

    async listBudgets(params) {
      return listBudgets(pool, params);
    },

    async listLedgerEntries(params) {
      return listLedgerEntries(pool, params);
    },

    async appendAudit(params) {
      return appendAudit(pool, params);
    },

    async listAudit(params) {
      return listAudit(pool, params);
    }
  };
}

export {
  buildClaimCommitKey,
  toSafeInteger,
  generateUuid
};
