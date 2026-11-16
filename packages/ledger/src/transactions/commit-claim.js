import { toSafeInteger, generateUuid } from '../utils/safe-math.js';
import { appendAudit } from '../audit/audit-service.js';

/**
 * Executes atomic claim financial deduction and ledger entry creation.
 * Strict guarantees:
 *  - 100% atomic execution in a single PostgreSQL transaction
 *  - SELECT FOR UPDATE row locking prevents concurrent overspending
 *  - Unique idempotency_key prevents duplicate deductions
 *  - Check constraints ensure non-negative balance (spent_minor <= limit_minor)
 * 
 * @param {import('pg').Pool} pool
 * @param {import('../../../shared-types/src/ledger.js').LedgerCommitInput} input
 * @returns {Promise<import('../../../shared-types/src/ledger.js').LedgerCommitResult>}
 */
export async function commitClaim(pool, input) {
  const {
    claimId,
    employeeId,
    amountMinor,
    currency = 'INR',
    category,
    period,
    idempotencyKey,
    policyVersion,
    occurredAt
  } = input;

  const safeAmount = toSafeInteger(amountMinor);
  if (safeAmount <= 0) {
    throw new RangeError('amountMinor must be greater than 0');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Idempotency Check: if this claim has already been committed, return ALREADY_COMMITTED
    const existingEntryRes = await client.query(
      `SELECT entry_id, balance_before_minor, balance_after_minor 
       FROM ledger_entries 
       WHERE idempotency_key = $1`,
      [idempotencyKey]
    );

    if (existingEntryRes.rows.length > 0) {
      const entry = existingEntryRes.rows[0];
      await client.query('COMMIT');
      return {
        status: 'ALREADY_COMMITTED',
        ledgerEntryId: entry.entry_id,
        balanceBeforeMinor: toSafeInteger(entry.balance_before_minor),
        balanceAfterMinor: toSafeInteger(entry.balance_after_minor)
      };
    }

    // 2. Lock Budget Row: SELECT FOR UPDATE
    const budgetRes = await client.query(
      `SELECT budget_id, limit_minor, spent_minor 
       FROM budgets 
       WHERE employee_id = $1 AND period = $2 
       FOR UPDATE`,
      [employeeId, period]
    );

    // If no budget exists for this period
    if (budgetRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        status: 'NO_BUDGET'
      };
    }

    const budget = budgetRes.rows[0];
    const budgetId = budget.budget_id;
    const limitMinor = toSafeInteger(budget.limit_minor);
    const spentMinor = toSafeInteger(budget.spent_minor);
    const balanceBefore = limitMinor - spentMinor;

    // 3. Balance Check: Prevent overspending
    if (safeAmount > balanceBefore) {
      await client.query('ROLLBACK');
      return {
        status: 'INSUFFICIENT_BUDGET',
        budgetId,
        balanceBeforeMinor: balanceBefore
      };
    }

    // 4. Update Budget (Deduct balance)
    const newSpentMinor = spentMinor + safeAmount;
    const balanceAfter = balanceBefore - safeAmount;
    const now = new Date().toISOString();

    await client.query(
      `UPDATE budgets 
       SET spent_minor = $1, updated_at = $2 
       WHERE budget_id = $3`,
      [newSpentMinor, now, budgetId]
    );

    // 5. Append Ledger Entry (Immutable financial ledger)
    const entryId = generateUuid();
    await client.query(
      `INSERT INTO ledger_entries (
        entry_id, claim_id, employee_id, amount_minor, currency, category,
        balance_before_minor, balance_after_minor, idempotency_key, policy_version, occurred_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        entryId,
        claimId,
        employeeId,
        safeAmount,
        currency,
        category,
        balanceBefore,
        balanceAfter,
        idempotencyKey,
        policyVersion ? JSON.stringify(policyVersion) : null,
        occurredAt || now,
        now
      ]
    );

    // 6. Append Audit Record
    await appendAudit(client, {
      claimId,
      actor: 'SYSTEM_LEDGER',
      action: 'CLAIM_COMMITTED',
      detail: {
        entryId,
        budgetId,
        amountMinor: safeAmount,
        balanceBefore,
        balanceAfter,
        idempotencyKey
      }
    });

    // 7. Commit Transaction
    await client.query('COMMIT');

    return {
      status: 'COMMITTED',
      ledgerEntryId: entryId,
      budgetId,
      balanceBeforeMinor: balanceBefore,
      balanceAfterMinor: balanceAfter
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Lists ledger entries with pagination and optional filtering.
 * @param {import('pg').Pool} pool
 * @param {{ page?: number, pageSize?: number, claimId?: string, employeeId?: string }} params
 * @returns {Promise<import('../../../shared-types/src/claim.js').Paginated<any>>}
 */
export async function listLedgerEntries(pool, { page = 1, pageSize = 20, claimId, employeeId } = {}) {
  const offset = (page - 1) * pageSize;
  const whereClauses = [];
  const params = [];

  if (claimId) {
    params.push(claimId);
    whereClauses.push(`claim_id = $${params.length}`);
  }

  if (employeeId) {
    params.push(employeeId);
    whereClauses.push(`employee_id = $${params.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRes = await pool.query(`SELECT COUNT(*) as total FROM ledger_entries ${whereSql}`, params);
  const total = Number(countRes.rows[0].total);

  const dataParams = [...params, pageSize, offset];
  const query = `
    SELECT entry_id, claim_id, employee_id, amount_minor, currency, category,
           balance_before_minor, balance_after_minor, occurred_at, created_at
    FROM ledger_entries
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const { rows } = await pool.query(query, dataParams);

  const items = rows.map(r => ({
    entryId: r.entry_id,
    claimId: r.claim_id,
    employeeId: r.employee_id,
    amountMinor: toSafeInteger(r.amount_minor),
    currency: r.currency,
    category: r.category,
    balanceBeforeMinor: toSafeInteger(r.balance_before_minor),
    balanceAfterMinor: toSafeInteger(r.balance_after_minor),
    createdAt: new Date(r.created_at).toISOString()
  }));

  return {
    items,
    page,
    pageSize,
    total
  };
}
