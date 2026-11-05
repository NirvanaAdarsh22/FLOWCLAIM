/**
 * @fileoverview Public entry point for @flowclaim/policy-engine.
 * Implements Master Development Document v1.1 (§6.3).
 * Plain JavaScript ESM only.
 */

export { validatePolicy } from './evaluation/validation.js';
export { detectCycle } from './cycle-detection/cycle.js';
export { topologicalSort, PolicyCycleError } from './topological-sort/kahn.js';
export { evaluatePolicy } from './evaluation/engine.js';
export { buildPolicyGraph } from './graph/graph.js';
export { buildFactContext, resolveFact } from './rules/facts.js';
export { evaluateCondition, evaluateLeafCondition } from './rules/condition.js';
export {
  FACT_PATHS,
  CONDITION_OPS,
  RULE_SEVERITIES,
  POLICY_STATUSES,
  RULE_STATUSES,
  POLICY_OUTCOMES,
  validateRuleShape,
  validateConditionShape,
} from './schemas/policy.js';
