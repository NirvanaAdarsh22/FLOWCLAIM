/**
 * @fileoverview Policy definition validator for FlowClaim Policy Engine.
 * Validates closed schema, rule uniqueness, dependency existence, and graph acyclicity.
 * Follows Master Development Document v1.1 (§6.3).
 * Plain JavaScript ESM only.
 */

import { validateRuleShape, POLICY_STATUSES } from '../schemas/policy.js';
import { detectCycle } from '../cycle-detection/cycle.js';

/**
 * Validates a complete PolicyDefinition object.
 *
 * @param {unknown} policy
 * @returns {{ ok: true } | { ok: false, errors: Array<{ code: string, message: string, ruleId?: string }> }}
 */
export function validatePolicy(policy) {
  const errors = [];

  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return {
      ok: false,
      errors: [{ code: 'INVALID_POLICY_ROOT', message: 'Policy definition must be a non-null object' }],
    };
  }

  const allowedKeys = new Set(['policyId', 'version', 'name', 'status', 'rules', 'createdAt', 'createdBy']);
  for (const k of Object.keys(policy)) {
    if (!allowedKeys.has(k)) {
      errors.push({ code: 'UNKNOWN_FIELD', message: `Unknown field '${k}' in policy definition` });
    }
  }

  if (typeof policy.policyId !== 'string' || !policy.policyId.trim()) {
    errors.push({ code: 'INVALID_POLICY_ID', message: 'policyId must be a non-empty string' });
  }

  if (typeof policy.version !== 'number' || !Number.isInteger(policy.version) || policy.version < 1) {
    errors.push({ code: 'INVALID_VERSION', message: 'version must be a positive integer >= 1' });
  }

  if (typeof policy.name !== 'string' || !policy.name.trim()) {
    errors.push({ code: 'INVALID_NAME', message: 'name must be a non-empty string' });
  }

  if (!POLICY_STATUSES.includes(policy.status)) {
    errors.push({
      code: 'INVALID_STATUS',
      message: `status must be one of: ${POLICY_STATUSES.join(', ')}`,
    });
  }

  if (!Array.isArray(policy.rules)) {
    errors.push({ code: 'INVALID_RULES', message: 'rules must be an array' });
    return { ok: false, errors };
  }

  // Check unique ruleIds
  const seenRuleIds = new Set();
  for (const rule of policy.rules) {
    const shape = validateRuleShape(rule);
    if (!shape.ok) {
      errors.push({
        code: 'INVALID_RULE_SHAPE',
        message: shape.error,
        ruleId: rule?.ruleId,
      });
      continue;
    }

    if (seenRuleIds.has(rule.ruleId)) {
      errors.push({
        code: 'DUPLICATE_RULE_ID',
        message: `Duplicate ruleId '${rule.ruleId}' detected`,
        ruleId: rule.ruleId,
      });
    } else {
      seenRuleIds.add(rule.ruleId);
    }
  }

  // Check dependency existence
  for (const rule of policy.rules) {
    if (Array.isArray(rule.dependsOn)) {
      for (const prereqId of rule.dependsOn) {
        if (!seenRuleIds.has(prereqId)) {
          errors.push({
            code: 'MISSING_DEPENDENCY',
            message: `Rule '${rule.ruleId}' depends on non-existent rule '${prereqId}'`,
            ruleId: rule.ruleId,
          });
        }
      }
    }
  }

  // Check acyclicity only if all rules have valid shapes and dependencies exist
  if (errors.length === 0) {
    const cycle = detectCycle(policy.rules);
    if (cycle) {
      errors.push({
        code: 'CYCLE_DETECTED',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
