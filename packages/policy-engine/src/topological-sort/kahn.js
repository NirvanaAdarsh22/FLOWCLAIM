/**
 * @fileoverview Kahn's Algorithm for topological sorting of Policy Engine rules.
 * Ties are broken deterministically by ruleId ascending.
 * Throws PolicyCycleError if a cycle is detected.
 * Plain JavaScript ESM only.
 */

import { buildPolicyGraph } from '../graph/graph.js';
import { detectCycle } from '../cycle-detection/cycle.js';

export class PolicyCycleError extends Error {
  /**
   * @param {string} message
   * @param {string[] | null} cycle
   */
  constructor(message, cycle = null) {
    super(message);
    this.name = 'PolicyCycleError';
    this.code = 'POLICY_CYCLE_DETECTED';
    this.cycle = cycle;
  }
}

/**
 * Performs Kahn's topological sort on policy rules.
 * Ties are deterministically broken by ruleId ascending.
 *
 * @param {Array<{ ruleId: string, dependsOn: string[] }>} rules
 * @returns {string[]} Ordered list of ruleIds
 * @throws {PolicyCycleError} When a circular dependency is detected
 */
export function topologicalSort(rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return [];
  }

  const { nodes, adjacency, inDegree, missingDependencies } = buildPolicyGraph(rules);

  if (missingDependencies.length > 0) {
    const first = missingDependencies[0];
    throw new Error(
      `Rule '${first.ruleId}' depends on non-existent rule '${first.missing}'`
    );
  }

  // Min-heap or sorted array for tie-breaking: pick ruleId in ascending order
  const zeroInDegreeQueue = [];
  for (const [ruleId, deg] of inDegree.entries()) {
    if (deg === 0) {
      zeroInDegreeQueue.push(ruleId);
    }
  }

  // Sort initially
  zeroInDegreeQueue.sort((a, b) => a.localeCompare(b));

  const sortedOrder = [];

  while (zeroInDegreeQueue.length > 0) {
    // Deterministic selection: smallest ruleId
    const current = zeroInDegreeQueue.shift();
    sortedOrder.push(current);

    const dependents = adjacency.get(current) || [];
    const newlyAvailable = [];

    for (const dependentId of dependents) {
      const remainingDeg = inDegree.get(dependentId) - 1;
      inDegree.set(dependentId, remainingDeg);

      if (remainingDeg === 0) {
        newlyAvailable.push(dependentId);
      }
    }

    if (newlyAvailable.length > 0) {
      zeroInDegreeQueue.push(...newlyAvailable);
      zeroInDegreeQueue.sort((a, b) => a.localeCompare(b));
    }
  }

  if (sortedOrder.length !== nodes.size) {
    const cycle = detectCycle(rules);
    const cycleStr = cycle ? cycle.join(' -> ') : 'unknown';
    throw new PolicyCycleError(
      `Policy graph contains a circular dependency cycle: ${cycleStr}`,
      cycle
    );
  }

  return sortedOrder;
}
