/**
 * @fileoverview Policy evaluation engine executing DAG in topological order with branch pruning.
 * Follows Master Development Document v1.1 (§6.3).
 * Pure, deterministic, NO eval, NO I/O, NO clock reads.
 * Plain JavaScript ESM only.
 */

import { topologicalSort } from '../topological-sort/kahn.js';
import { buildFactContext } from '../rules/facts.js';
import { evaluateCondition } from '../rules/condition.js';

/**
 * Evaluates a policy against a set of facts.
 *
 * @param {{
 *   policy: {
 *     policyId: string,
 *     version: number,
 *     rules: Array<{
 *       ruleId: string,
 *       code: string,
 *       description: string,
 *       severity: 'BLOCKING' | 'REVIEW' | 'INFO',
 *       dependsOn: string[],
 *       condition: any
 *     }>
 *   },
 *   facts: {
 *     claim: {
 *       category: string,
 *       claimedAmountMinor: number,
 *       employeeRole: string,
 *       businessPurpose: string
 *     },
 *     receipt: any,
 *     now: string
 *   }
 * }} input
 * @returns {{
 *   policyId: string,
 *   policyVersion: number,
 *   outcome: 'PASS' | 'REVIEW_REQUIRED' | 'BLOCKED',
 *   executionOrder: string[],
 *   ruleResults: Array<{
 *     ruleId: string,
 *     code: string,
 *     status: 'PASSED' | 'FAILED' | 'SKIPPED',
 *     severity: 'BLOCKING' | 'REVIEW' | 'INFO',
 *     message: string,
 *     skippedBecause?: string
 *   }>,
 *   violations: Array<{
 *     code: string,
 *     description: string,
 *     severity: 'BLOCKING' | 'REVIEW' | 'INFO',
 *     ruleId: string
 *   }>,
 *   evaluatedAt: string
 * }}
 */
export function evaluatePolicy({ policy, facts }) {
  if (!policy || typeof policy !== 'object') {
    throw new Error('Policy definition must be an object');
  }

  const { policyId, version, rules } = policy;
  if (!Array.isArray(rules)) {
    throw new Error('Policy must contain a rules array');
  }

  // 1. Build fact lookup context and derived facts
  const factContext = buildFactContext(facts);

  // 2. Determine execution order via Kahn's algorithm
  const executionOrder = topologicalSort(rules);

  // Map rules by ruleId for fast lookup
  const ruleMap = new Map();
  for (const r of rules) {
    ruleMap.set(r.ruleId, r);
  }

  const ruleResults = [];
  const ruleStatusMap = new Map(); // ruleId -> 'PASSED' | 'FAILED' | 'SKIPPED'
  const violations = [];

  // 3. Execute rules in topological order
  for (const ruleId of executionOrder) {
    const rule = ruleMap.get(ruleId);
    const prerequisites = rule.dependsOn || [];

    // Check prerequisites
    let unpassedPrereq = null;
    for (const prereqId of prerequisites) {
      const prereqStatus = ruleStatusMap.get(prereqId);
      if (prereqStatus !== 'PASSED') {
        unpassedPrereq = prereqId;
        break;
      }
    }

    if (unpassedPrereq) {
      // Prerequisite not passed -> SKIPPED (short-circuit / prune branch)
      ruleStatusMap.set(ruleId, 'SKIPPED');
      ruleResults.push({
        ruleId: rule.ruleId,
        code: rule.code,
        status: 'SKIPPED',
        severity: rule.severity,
        message: `Prerequisite rule '${unpassedPrereq}' did not pass`,
        skippedBecause: unpassedPrereq,
      });
      continue;
    }

    // Evaluate rule condition
    let evaluation;
    try {
      evaluation = evaluateCondition(rule.condition, factContext);
    } catch (err) {
      evaluation = { passed: false, reason: `Evaluation error: ${err.message}` };
    }

    if (evaluation.passed) {
      ruleStatusMap.set(ruleId, 'PASSED');
      ruleResults.push({
        ruleId: rule.ruleId,
        code: rule.code,
        status: 'PASSED',
        severity: rule.severity,
        message: 'Rule condition satisfied',
      });
    } else {
      ruleStatusMap.set(ruleId, 'FAILED');
      const failMessage = evaluation.reason || rule.description;
      ruleResults.push({
        ruleId: rule.ruleId,
        code: rule.code,
        status: 'FAILED',
        severity: rule.severity,
        message: failMessage,
      });

      violations.push({
        code: rule.code,
        description: rule.description,
        severity: rule.severity,
        ruleId: rule.ruleId,
      });
    }
  }

  // 4. Calculate final outcome
  // Rule: any FAILED with BLOCKING -> BLOCKED
  // Else any FAILED with REVIEW -> REVIEW_REQUIRED
  // Else PASS (FAILED INFO rules never change outcome)
  let outcome = 'PASS';
  const hasBlocking = violations.some((v) => v.severity === 'BLOCKING');
  const hasReview = violations.some((v) => v.severity === 'REVIEW');

  if (hasBlocking) {
    outcome = 'BLOCKED';
  } else if (hasReview) {
    outcome = 'REVIEW_REQUIRED';
  }

  return {
    policyId,
    policyVersion: version,
    outcome,
    executionOrder,
    ruleResults,
    violations,
    evaluatedAt: facts.now,
  };
}
