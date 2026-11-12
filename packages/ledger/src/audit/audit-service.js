import { generateUuid } from '../utils/safe-math.js';

/**
 * Appends an audit event to the ledger audit trail.
 * @param {import('pg').Pool | import('pg').PoolClient} client
 * @param {{ claimId?: string, actor: string, action: string, detail?: Record<string, unknown> }} params
 * @returns {Promise<import('../../../shared-types/src/ledger.js').AuditEventDto>}
 */
export async function appendAudit(client, { claimId = null, actor, action, detail = null }) {
  const id = generateUuid();
  const at = new Date().toISOString();

  const query = `
    INSERT INTO audit_events (id, claim_id, actor, action, detail, at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, claim_id, actor, action, detail, at
  `;

  const values = [id, claimId, actor, action, detail ? JSON.stringify(detail) : null, at];
  const { rows } = await client.query(query, values);
  const row = rows[0];

  return {
    id: row.id,
    claimId: row.claim_id || undefined,
    actor: row.actor,
    action: row.action,
    detail: typeof row.detail === 'string' ? JSON.parse(row.detail) : row.detail,
    at: new Date(row.at).toISOString()
  };
}

/**
 * Lists audit events with pagination and optional filtering by claimId.
 * @param {import('pg').Pool} pool
 * @param {{ page?: number, pageSize?: number, claimId?: string }} params
 * @returns {Promise<import('../../../shared-types/src/claim.js').Paginated<any>>}
 */
export async function listAudit(pool, { page = 1, pageSize = 20, claimId } = {}) {
  const offset = (page - 1) * pageSize;
  const whereClauses = [];
  const params = [];

  if (claimId) {
    params.push(claimId);
    whereClauses.push(`claim_id = $${params.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countRes = await pool.query(`SELECT COUNT(*) as total FROM audit_events ${whereSql}`, params);
  const total = Number(countRes.rows[0].total);

  // Fetch paginated rows
  const dataParams = [...params, pageSize, offset];
  const limitClause = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const query = `
    SELECT id, claim_id, actor, action, detail, at
    FROM audit_events
    ${whereSql}
    ORDER BY at DESC
    ${limitClause}
  `;

  const { rows } = await pool.query(query, dataParams);

  const items = rows.map(row => ({
    id: row.id,
    claimId: row.claim_id || undefined,
    actor: row.actor,
    action: row.action,
    detail: typeof row.detail === 'string' ? JSON.parse(row.detail) : row.detail,
    at: new Date(row.at).toISOString()
  }));

  return {
    items,
    page,
    pageSize,
    total
  };
}
