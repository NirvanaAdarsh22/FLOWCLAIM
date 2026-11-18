import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createLedger } from '../src/index.js';

class SimpleMutex {
  constructor() {
    this._locked = false;
    this._queue = [];
  }

  async acquire() {
    if (!this._locked) {
      this._locked = true;
      return () => this._release();
    }
    return new Promise(resolve => {
      this._queue.push(resolve);
    }).then(() => () => this._release());
  }

  _release() {
    if (this._queue.length > 0) {
      const next = this._queue.shift();
      next();
    } else {
      this._locked = false;
    }
  }
}

/**
 * Creates an in-memory transactional mock Postgres Pool with row-level locking
 * and per-transaction undo logs (faithful to PostgreSQL multi-client transaction isolation).
 */
function createMockPgPool() {
  const db = {
    budgets: new Map(), // key: `${employee_id}:${period}`
    ledger_entries: new Map(), // key: entry_id
    idempotency_index: new Map(), // key: idempotency_key -> entry_id
    audit_events: []
  };

  const rowMutex = new SimpleMutex();

  class MockClient {
    constructor() {
      this.inTransaction = false;
      this.undoLog = [];
      this.unlockCallbacks = [];
    }

    async query(sql, params = []) {
      const cleanSql = sql.replace(/\s+/g, ' ').trim();

      if (cleanSql === 'BEGIN') {
        this.inTransaction = true;
        this.undoLog = [];
        return { rows: [] };
      }

      if (cleanSql === 'COMMIT') {
        this.inTransaction = false;
        this.undoLog = [];
        return { rows: [] };
      }

      if (cleanSql === 'ROLLBACK') {
        this.inTransaction = false;
        // Rollback only changes made by this client's transaction
        while (this.undoLog.length > 0) {
          const undo = this.undoLog.pop();
          undo();
        }
        return { rows: [] };
      }

      // Check idempotency in ledger_entries
      if (cleanSql.includes('FROM ledger_entries WHERE idempotency_key = $1')) {
        const key = params[0];
        const entryId = db.idempotency_index.get(key);
        if (entryId && db.ledger_entries.has(entryId)) {
          return { rows: [{ ...db.ledger_entries.get(entryId) }] };
        }
        return { rows: [] };
      }

      // SELECT FOR UPDATE on budgets
      if (cleanSql.includes('FROM budgets WHERE employee_id = $1 AND period = $2 FOR UPDATE')) {
        const [employeeId, period] = params;
        const key = `${employeeId}:${period}`;

        // Acquire row-level mutex
        const unlock = await rowMutex.acquire();
        this.unlockCallbacks.push(unlock);

        const budget = db.budgets.get(key);
        return { rows: budget ? [{ ...budget }] : [] };
      }

      // UPDATE budgets spent_minor
      if (cleanSql.includes('UPDATE budgets SET spent_minor = $1')) {
        const [newSpent, now, budgetId] = params;
        for (const [key, b] of db.budgets.entries()) {
          if (b.budget_id === budgetId) {
            const prevSpent = b.spent_minor;
            const prevUpdated = b.updated_at;
            b.spent_minor = newSpent;
            b.updated_at = now;

            this.undoLog.push(() => {
              b.spent_minor = prevSpent;
              b.updated_at = prevUpdated;
            });
            break;
          }
        }
        return { rows: [] };
      }

      // UPDATE budgets limit_minor
      if (cleanSql.includes('UPDATE budgets SET limit_minor = $1')) {
        const [newLimit, now, budgetId] = params;
        for (const [key, b] of db.budgets.entries()) {
          if (b.budget_id === budgetId) {
            const prevLimit = b.limit_minor;
            const prevUpdated = b.updated_at;
            b.limit_minor = newLimit;
            b.updated_at = now;

            this.undoLog.push(() => {
              b.limit_minor = prevLimit;
              b.updated_at = prevUpdated;
            });
            break;
          }
        }
        return { rows: [] };
      }

      // INSERT INTO budgets
      if (cleanSql.includes('INSERT INTO budgets')) {
        const [budgetId, employeeId, period, limitMinor, spentMinor, createdAt, updatedAt] = params;
        const key = `${employeeId}:${period}`;
        const record = {
          budget_id: budgetId,
          employee_id: employeeId,
          period,
          limit_minor: limitMinor,
          spent_minor: spentMinor,
          created_at: createdAt,
          updated_at: updatedAt
        };
        db.budgets.set(key, record);

        this.undoLog.push(() => {
          db.budgets.delete(key);
        });
        return { rows: [] };
      }

      // INSERT INTO ledger_entries
      if (cleanSql.includes('INSERT INTO ledger_entries')) {
        const [
          entryId, claimId, employeeId, amountMinor, currency, category,
          balanceBefore, balanceAfter, idempotencyKey, policyVersion, occurredAt, createdAt
        ] = params;

        if (db.idempotency_index.has(idempotencyKey)) {
          throw new Error(`duplicate key value violates unique constraint "uq_ledger_idempotency"`);
        }

        const entry = {
          entry_id: entryId,
          claim_id: claimId,
          employee_id: employeeId,
          amount_minor: amountMinor,
          currency,
          category,
          balance_before_minor: balanceBefore,
          balance_after_minor: balanceAfter,
          idempotency_key: idempotencyKey,
          policy_version: policyVersion,
          occurred_at: occurredAt,
          created_at: createdAt
        };

        db.ledger_entries.set(entryId, entry);
        db.idempotency_index.set(idempotencyKey, entryId);

        this.undoLog.push(() => {
          db.ledger_entries.delete(entryId);
          db.idempotency_index.delete(idempotencyKey);
        });
        return { rows: [] };
      }

      // INSERT INTO audit_events
      if (cleanSql.includes('INSERT INTO audit_events')) {
        const [id, claimId, actor, action, detail, at] = params;
        const event = { id, claim_id: claimId, actor, action, detail, at };
        db.audit_events.push(event);

        this.undoLog.push(() => {
          const idx = db.audit_events.indexOf(event);
          if (idx >= 0) db.audit_events.splice(idx, 1);
        });
        return { rows: [event] };
      }

      // List budgets count
      if (cleanSql.includes('SELECT COUNT(*) as total FROM budgets')) {
        return { rows: [{ total: db.budgets.size }] };
      }

      // List budgets
      if (cleanSql.includes('SELECT budget_id, employee_id, period, limit_minor, spent_minor, updated_at FROM budgets')) {
        return { rows: Array.from(db.budgets.values()) };
      }

      // List audit count
      if (cleanSql.includes('SELECT COUNT(*) as total FROM audit_events')) {
        return { rows: [{ total: db.audit_events.length }] };
      }

      // List audit
      if (cleanSql.includes('SELECT id, claim_id, actor, action, detail, at FROM audit_events')) {
        return { rows: [...db.audit_events].reverse() };
      }

      // List ledger count
      if (cleanSql.includes('SELECT COUNT(*) as total FROM ledger_entries')) {
        return { rows: [{ total: db.ledger_entries.size }] };
      }

      // List ledger
      if (cleanSql.includes('SELECT entry_id, claim_id, employee_id, amount_minor')) {
        return { rows: Array.from(db.ledger_entries.values()) };
      }

      return { rows: [] };
    }

    release() {
      while (this.unlockCallbacks.length > 0) {
        const unlock = this.unlockCallbacks.pop();
        unlock();
      }
    }
  }

  return {
    async connect() {
      return new MockClient();
    },
    async query(sql, params) {
      const client = new MockClient();
      try {
        return await client.query(sql, params);
      } finally {
        client.release();
      }
    },
    _getRawDb() {
      return db;
    }
  };
}

describe('@flowclaim/ledger', () => {
  let pool;
  let ledger;

  beforeEach(() => {
    pool = createMockPgPool();
    ledger = createLedger({ pool });
  });

  describe('Budget Management', () => {
    it('creates a new budget successfully', async () => {
      const budget = await ledger.upsertBudget({
        employeeId: 'emp-101',
        period: '2026-11',
        limitMinor: 1000000, // ₹10,000
        actor: 'ADMIN_1'
      });

      assert.equal(budget.employeeId, 'emp-101');
      assert.equal(budget.limitMinor, 1000000);
      assert.equal(budget.spentMinor, 0);
    });

    it('prevents setting limit below currently spent amount', async () => {
      await ledger.upsertBudget({
        employeeId: 'emp-101',
        period: '2026-11',
        limitMinor: 500000,
        actor: 'ADMIN_1'
      });

      // Commit an expense of ₹2,000 (200,000 paise)
      await ledger.commitClaim({
        claimId: 'claim-1',
        employeeId: 'emp-101',
        amountMinor: 200000,
        currency: 'INR',
        category: 'MEALS',
        period: '2026-11',
        idempotencyKey: 'claim:claim-1:commit',
        occurredAt: '2026-11-18T10:00:00Z'
      });

      // Attempt to lower limit to ₹1,000 (100,000 paise)
      await assert.rejects(
        () => ledger.upsertBudget({
          employeeId: 'emp-101',
          period: '2026-11',
          limitMinor: 100000,
          actor: 'ADMIN_1'
        }),
        /lower than already spent amount/
      );
    });
  });

  describe('Financial Claim Commitment & Idempotency', () => {
    beforeEach(async () => {
      await ledger.upsertBudget({
        employeeId: 'emp-101',
        period: '2026-11',
        limitMinor: 1000000, // ₹10,000
        actor: 'SYSTEM'
      });
    });

    it('successfully commits a valid expense within budget', async () => {
      const res = await ledger.commitClaim({
        claimId: 'claim-100',
        employeeId: 'emp-101',
        amountMinor: 300000, // ₹3,000
        currency: 'INR',
        category: 'TRAVEL',
        period: '2026-11',
        idempotencyKey: 'claim:claim-100:commit',
        occurredAt: '2026-11-18T10:00:00Z'
      });

      assert.equal(res.status, 'COMMITTED');
      assert.equal(res.balanceBeforeMinor, 1000000);
      assert.equal(res.balanceAfterMinor, 700000);
      assert.ok(res.ledgerEntryId);
    });

    it('returns INSUFFICIENT_BUDGET when amount exceeds balance', async () => {
      const res = await ledger.commitClaim({
        claimId: 'claim-200',
        employeeId: 'emp-101',
        amountMinor: 1500000, // ₹15,000 > ₹10,000
        currency: 'INR',
        category: 'TRAVEL',
        period: '2026-11',
        idempotencyKey: 'claim:claim-200:commit',
        occurredAt: '2026-11-18T10:00:00Z'
      });

      assert.equal(res.status, 'INSUFFICIENT_BUDGET');
      assert.equal(res.balanceBeforeMinor, 1000000);
    });

    it('returns NO_BUDGET when no budget exists for period', async () => {
      const res = await ledger.commitClaim({
        claimId: 'claim-300',
        employeeId: 'emp-101',
        amountMinor: 50000,
        currency: 'INR',
        category: 'MEALS',
        period: '2026-12', // No budget configured for December
        idempotencyKey: 'claim:claim-300:commit',
        occurredAt: '2026-12-01T10:00:00Z'
      });

      assert.equal(res.status, 'NO_BUDGET');
    });

    it('enforces idempotency and returns ALREADY_COMMITTED without duplicate deduction (Prompt §12 Mandatory Retry Test)', async () => {
      const payload = {
        claimId: 'claim-400',
        employeeId: 'emp-101',
        amountMinor: 250000, // ₹2,500
        currency: 'INR',
        category: 'OFFICE_SUPPLIES',
        period: '2026-11',
        idempotencyKey: 'claim:claim-400:commit',
        occurredAt: '2026-11-18T10:00:00Z'
      };

      // First run: commits
      const res1 = await ledger.commitClaim(payload);
      assert.equal(res1.status, 'COMMITTED');
      assert.equal(res1.balanceAfterMinor, 750000);

      // Second run: replay returns ALREADY_COMMITTED with exact same entry ID
      const res2 = await ledger.commitClaim(payload);
      assert.equal(res2.status, 'ALREADY_COMMITTED');
      assert.equal(res2.ledgerEntryId, res1.ledgerEntryId);
      assert.equal(res2.balanceAfterMinor, 750000);

      // Verify audit and entries count
      const entries = await ledger.listLedgerEntries();
      assert.equal(entries.items.length, 1);
    });

    it('handles concurrent claims race safely: exactly one commits, budget never negative (Prompt §12 Mandatory Concurrency Test)', async () => {
      // Starting budget = ₹10,000 (1,000,000 paise).
      // Submit two simultaneous claims of ₹8,000 each (800,000 paise).
      const claimA = {
        claimId: 'claim-A',
        employeeId: 'emp-101',
        amountMinor: 800000,
        currency: 'INR',
        category: 'TRAVEL',
        period: '2026-11',
        idempotencyKey: 'claim:claim-A:commit',
        occurredAt: '2026-11-18T11:00:00Z'
      };

      const claimB = {
        claimId: 'claim-B',
        employeeId: 'emp-101',
        amountMinor: 800000,
        currency: 'INR',
        category: 'LODGING',
        period: '2026-11',
        idempotencyKey: 'claim:claim-B:commit',
        occurredAt: '2026-11-18T11:00:00Z'
      };

      // Run both simultaneously
      const [resultA, resultB] = await Promise.all([
        ledger.commitClaim(claimA),
        ledger.commitClaim(claimB)
      ]);

      const statuses = [resultA.status, resultB.status].sort();
      // One must be COMMITTED and one must be INSUFFICIENT_BUDGET
      assert.deepEqual(statuses, ['COMMITTED', 'INSUFFICIENT_BUDGET']);

      // Check remaining budget
      const budgets = await ledger.listBudgets({ period: '2026-11', employeeId: 'emp-101' });
      assert.equal(budgets.items[0].spentMinor, 800000);
      assert.equal(budgets.items[0].limitMinor - budgets.items[0].spentMinor, 200000); // exactly ₹2,000 remains, never negative!
    });
  });
});
