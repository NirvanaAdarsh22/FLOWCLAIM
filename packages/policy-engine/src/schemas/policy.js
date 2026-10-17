/**
 * @fileoverview Closed schema definitions and validation for FlowClaim Policy Engine.
 * Follows Master Development Document v1.1 (§3 and §6.3).
 * Plain JavaScript ESM only.
 */

export const FACT_PATHS = Object.freeze([
  'claim.category',
  'claim.claimedAmountMinor',
  'claim.employeeRole',
  'claim.businessPurpose',
  'receipt.merchant',
  'receipt.totalMinor',
  'receipt.taxMinor',
  'receipt.transactionDate',
  'receipt.currency',
  'receipt.lineItemCount',
  'derived.receiptAgeDays',
  'derived.claimedMatchesReceipt',
]);

export const CONDITION_OPS = Object.freeze([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'exists',
]);

export const RULE_SEVERITIES = Object.freeze(['BLOCKING', 'REVIEW', 'INFO']);
export const POLICY_STATUSES = Object.freeze(['ACTIVE', 'ARCHIVED']);
export const RULE_STATUSES = Object.freeze(['PASSED', 'FAILED', 'SKIPPED']);
export const POLICY_OUTCOMES = Object.freeze(['PASS', 'REVIEW_REQUIRED', 'BLOCKED']);

/**
 * Validates condition object structure (closed schema, no dynamic execution).
 * @param {unknown} cond
 * @param {string[]} path
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateConditionShape(cond, path = []) {
  if (!cond || typeof cond !== 'object' || Array.isArray(cond)) {
    return { ok: false, error: `Condition at ${path.join('.')} must be a non-null object` };
  }

  const keys = Object.keys(cond);
  if (keys.length === 0) {
    return { ok: false, error: `Condition at ${path.join('.')} cannot be empty` };
  }

  if ('all' in cond) {
    if (keys.length !== 1 || !Array.isArray(cond.all)) {
      return { ok: false, error: `Condition 'all' must be an array of conditions at ${path.join('.')}` };
    }
    for (let i = 0; i < cond.all.length; i++) {
      const sub = validateConditionShape(cond.all[i], [...path, `all[${i}]`]);
      if (!sub.ok) return sub;
    }
    return { ok: true };
  }

  if ('any' in cond) {
    if (keys.length !== 1 || !Array.isArray(cond.any)) {
      return { ok: false, error: `Condition 'any' must be an array of conditions at ${path.join('.')}` };
    }
    for (let i = 0; i < cond.any.length; i++) {
      const sub = validateConditionShape(cond.any[i], [...path, `any[${i}]`]);
      if (!sub.ok) return sub;
    }
    return { ok: true };
  }

  if ('not' in cond) {
    if (keys.length !== 1 || !cond.not || typeof cond.not !== 'object') {
      return { ok: false, error: `Condition 'not' must be a condition object at ${path.join('.')}` };
    }
    return validateConditionShape(cond.not, [...path, 'not']);
  }

  // Leaf condition: must have field and op
  const allowedKeys = new Set(['field', 'op', 'value']);
  for (const k of keys) {
    if (!allowedKeys.has(k)) {
      return { ok: false, error: `Unknown key '${k}' in condition at ${path.join('.')}` };
    }
  }

  if (typeof cond.field !== 'string' || !FACT_PATHS.includes(cond.field)) {
    return {
      ok: false,
      error: `Invalid condition field '${cond.field}' at ${path.join('.')}. Must be one of: ${FACT_PATHS.join(', ')}`,
    };
  }

  if (typeof cond.op !== 'string' || !CONDITION_OPS.includes(cond.op)) {
    return {
      ok: false,
      error: `Invalid condition op '${cond.op}' at ${path.join('.')}. Must be one of: ${CONDITION_OPS.join(', ')}`,
    };
  }

  if (cond.op === 'in' || cond.op === 'notIn') {
    if (!Array.isArray(cond.value)) {
      return { ok: false, error: `Condition op '${cond.op}' requires an array value at ${path.join('.')}` };
    }
  }

  return { ok: true };
}

/**
 * Validates a single PolicyRule definition against strict closed schema.
 * @param {unknown} rule
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateRuleShape(rule) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    return { ok: false, error: 'Rule must be an object' };
  }

  const allowedKeys = new Set(['ruleId', 'code', 'description', 'severity', 'dependsOn', 'condition']);
  for (const k of Object.keys(rule)) {
    if (!allowedKeys.has(k)) {
      return { ok: false, error: `Unknown key '${k}' in rule ${rule.ruleId || 'unknown'}` };
    }
  }

  if (typeof rule.ruleId !== 'string' || !rule.ruleId.trim()) {
    return { ok: false, error: 'ruleId must be a non-empty string' };
  }

  if (typeof rule.code !== 'string' || !rule.code.trim() || !/^[A-Z0-9_]+$/.test(rule.code)) {
    return { ok: false, error: `Rule ${rule.ruleId} code must be an UPPER_SNAKE string` };
  }

  if (typeof rule.description !== 'string' || !rule.description.trim()) {
    return { ok: false, error: `Rule ${rule.ruleId} description must be a non-empty string` };
  }

  if (!RULE_SEVERITIES.includes(rule.severity)) {
    return {
      ok: false,
      error: `Rule ${rule.ruleId} severity must be one of: ${RULE_SEVERITIES.join(', ')}`,
    };
  }

  if (!Array.isArray(rule.dependsOn) || rule.dependsOn.some((d) => typeof d !== 'string')) {
    return { ok: false, error: `Rule ${rule.ruleId} dependsOn must be an array of ruleId strings` };
  }

  const condValidation = validateConditionShape(rule.condition, [rule.ruleId, 'condition']);
  if (!condValidation.ok) {
    return condValidation;
  }

  return { ok: true };
}
