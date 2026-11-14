import { toSafeInteger, generateUuid } from '../utils/safe-math.js';
import { appendAudit } from '../audit/audit-service.js';

/**
 * Creates or updates an employee budget for a given period.
 * Guarantees that limitMinor cannot be set below currently spent amount.
 * 
 * @param {import('pg').Pool} pool
 * @param {{ employeeId: string, period: string, limitMinor: number, actor: string }} params
 * @returns {Promise<import('../../../shared-types/src/ledger.js').BudgetDto>}
 */
export async function upsertBudget(pool, { employeeId, period, limitMinor, actor }) {
  if (!employeeId || !period) {
    throw new Error('employeeId and period are required');
  }

  const safeLimit = toSafeInteger(limitMinor);
  if (safeLimit < 0) {
    throw new RangeError('limitMinor cannot be negative');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock existing budget if present
    const existingRes = await client.query(
      `SELECT budget_id, spent_minor, limit_minor FROM budgets WHERE employee_id = $1 AND period = $2 FOR UPDATE`,
      [employeeId, period]
    );

    let budgetId;
    let spentMinor = 0;
    const now = new Date().toISOString();

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      budgetId = existing.budget_id;
      spentMinor = toSafeInteger(existing.spent_minor);

      if (safeLimit < spentMinor) {
        throw new Error(`Cannot update budget: new limit (${safeLimit}) is lower than already spent amount (${spentMinor})`);
      }

      await client.query(
        `UPDATE budgets SET limit_minor = $1, updated_at = $2 WHERE budget_id = $3`,
        [safeLimit, now, budgetId]
      );
    } else {
      budgetId = generateUuid();
      await client.query(
        `INSERT INTO budgets (budget_id, employee_id, period, limit_minor, spent_minor, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [budgetId, employeeId, period, safeLimit, 0, now, now]
      );
    }

    // Append audit record
    await appendAudit(client, {
      actor,
      action: 'BUDGET_UPSERT',
      detail: { budgetId, employeeId, period, limitMinor: safeLimit, spentMinor }
    });

    await client.query('COMMIT');

    return {
      budgetId,
      employeeId,
      period,
      limitMinor: safeLimit,
      spentMinor,
      updatedAt: now
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Lists budgets with pagination and optional filtering.
 * @param {import('pg').Pool} pool
 * @param {{ page?: number, pageSize?: number, period?: string, employeeId?: string }} params
 * @returns {Promise<import('../../../shared-types/src/claim.js').Paginated<any>>}
 */
export async function listBudgets(pool, { page = 1, pageSize = 20, period, employeeId } = {}) {
  const offset = (page - 1) * pageSize;
  const whereClauses = [];
  const params = [];

  if (period) {
    params.push(period);
    whereClauses.push(`period = $${params.length}`);
  }

  if (employeeId) {
    params.push(employeeId);
    whereClauses.push(`employee_id = $${params.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRes = await pool.query(`SELECT COUNT(*) as total FROM budgets ${whereSql}`, params);
  const total = Number(countRes.rows[0].total);

  const dataParams = [...params, pageSize, offset];
  const query = `
    SELECT budget_id, employee_id, period, limit_minor, spent_minor, updated_at
    FROM budgets
    ${whereSql}
    ORDER BY period DESC, employee_id ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const { rows } = await pool.query(query, dataParams);

  const items = rows.map(r => ({
    budgetId: r.budget_id,
    employeeId: r.employee_id,
    period: r.period,
    limitMinor: toSafeInteger(r.limit_minor),
    spentMinor: toSafeInteger(r.spent_minor),
    updatedAt: new Date(r.updated_at).toISOString()
  }));

  return {
    items,
    page,
    pageSize,
    total
  };
}
