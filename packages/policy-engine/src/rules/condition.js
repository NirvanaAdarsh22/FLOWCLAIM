/**
 * @fileoverview Pure AST Condition evaluator for Policy Engine.
 * Evaluates comparison, set, and logical operators with fail-closed semantics.
 * Strict closed schema: NO eval or dynamic code execution ever.
 * Plain JavaScript ESM only.
 */

import { resolveFact } from './facts.js';

/**
 * Evaluates a single leaf condition against the fact context.
 *
 * @param {{ field: string, op: string, value?: any }} cond
 * @param {Record<string, any>} factContext
 * @returns {{ passed: boolean, reason?: string }}
 */
export function evaluateLeafCondition(cond, factContext) {
  const { field, op, value: targetValue } = cond;
  const { found, value: factValue } = resolveFact(factContext, field);

  // Special operator: 'exists'
  if (op === 'exists') {
    const exists = found && factValue !== null && factValue !== undefined;
    const shouldExist = targetValue !== false;
    const passed = exists === shouldExist;
    return passed
      ? { passed: true }
      : { passed: false, reason: `Field '${field}' ${shouldExist ? 'does not exist' : 'exists unexpectedly'}` };
  }

  // Fail-closed if field was not found
  if (!found || factValue === undefined) {
    return {
      passed: false,
      reason: `Fact path '${field}' was not found in evaluation context`,
    };
  }

  switch (op) {
    case 'eq': {
      const passed = factValue === targetValue;
      return passed
        ? { passed: true }
        : { passed: false, reason: `'${field}' (${factValue}) does not equal expected (${targetValue})` };
    }

    case 'neq': {
      const passed = factValue !== targetValue;
      return passed
        ? { passed: true }
        : { passed: false, reason: `'${field}' (${factValue}) unexpectedly equals (${targetValue})` };
    }

    case 'gt': {
      if (typeof factValue !== typeof targetValue || typeof factValue !== 'number') {
        return { passed: false, reason: `Type mismatch or non-numeric values for 'gt' operator on '${field}'` };
      }
      const passed = factValue > targetValue;
      return passed
        ? { passed: true }
        : { passed: false, reason: `'${field}' (${factValue}) is not greater than ${targetValue}` };
    }

    case 'gte': {
      if (typeof factValue !== typeof targetValue || typeof factValue !== 'number') {
        return { passed: false, reason: `Type mismatch or non-numeric values for 'gte' operator on '${field}'` };
      }
      const passed = factValue >= targetValue;
      return passed
        ? { passed: true }
        : { passed: false, reason: `'${field}' (${factValue}) is not greater than or equal to ${targetValue}` };
    }

    case 'lt': {
      if (typeof factValue !== typeof targetValue || typeof factValue !== 'number') {
        return { passed: false, reason: `Type mismatch or non-numeric values for 'lt' operator on '${field}'` };
      }
      const passed = factValue < targetValue;
      return passed
        ? { passed: true }
        : { passed: false, reason: `'${field}' (${factValue}) is not less than ${targetValue}` };
    }

    case 'lte': {
      if (typeof factValue !== typeof targetValue || typeof factValue !== 'number') {
        return { passed: false, reason: `Type mismatch or non-numeric values for 'lte' operator on '${field}'` };
      }
      const passed = factValue <= targetValue;
      return passed
        ? { passed: true }
        : { passed: false, reason: `'${field}' (${factValue}) is not less than or equal to ${targetValue}` };
    }

    case 'in': {
      if (!Array.isArray(targetValue)) {
        return { passed: false, reason: `Target value for 'in' operator on '${field}' must be an array` };
      }
      const passed = targetValue.includes(factValue);
      return passed
        ? { passed: true }
        : { passed: false, reason: `'${field}' (${factValue}) is not in allowed list [${targetValue.join(', ')}]` };
    }

    case 'notIn': {
      if (!Array.isArray(targetValue)) {
        return { passed: false, reason: `Target value for 'notIn' operator on '${field}' must be an array` };
      }
      const passed = !targetValue.includes(factValue);
      return passed
        ? { passed: true }
        : { passed: false, reason: `'${field}' (${factValue}) is disallowed in [${targetValue.join(', ')}]` };
    }

    default:
      return {
        passed: false,
        reason: `Unsupported condition operator '${op}' on '${field}'`,
      };
  }
}
