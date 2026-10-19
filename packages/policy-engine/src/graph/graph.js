/**
 * @fileoverview Directed graph representation for Policy Engine DAG.
 * Constructs adjacency lists and in-degree maps from rule dependencies.
 * Plain JavaScript ESM only.
 */

/**
 * Builds a directed graph representation from an array of PolicyRule definitions.
 * A rule B that depends on rule A implies a directed edge A -> B (A precedes B).
 *
 * @param {Array<{ ruleId: string, dependsOn: string[] }>} rules
 * @returns {{
 *   nodes: Set<string>,
 *   ruleMap: Map<string, any>,
 *   adjacency: Map<string, string[]>,
 *   reverseAdjacency: Map<string, string[]>,
 *   inDegree: Map<string, number>,
 *   missingDependencies: Array<{ ruleId: string, missing: string }>
 * }}
 */
export function buildPolicyGraph(rules) {
  const nodes = new Set();
  const ruleMap = new Map();
  const adjacency = new Map();
  const reverseAdjacency = new Map();
  const inDegree = new Map();
  const missingDependencies = [];

  // Register all rule nodes
  for (const rule of rules) {
    nodes.add(rule.ruleId);
    ruleMap.set(rule.ruleId, rule);
    adjacency.set(rule.ruleId, []);
    reverseAdjacency.set(rule.ruleId, []);
    inDegree.set(rule.ruleId, 0);
  }

  // Build edges: prerequisite A -> dependent B
  for (const rule of rules) {
    const dependentId = rule.ruleId;
    const prerequisites = rule.dependsOn || [];

    for (const prereqId of prerequisites) {
      if (!nodes.has(prereqId)) {
        missingDependencies.push({ ruleId: dependentId, missing: prereqId });
      } else {
        adjacency.get(prereqId).push(dependentId);
        reverseAdjacency.get(dependentId).push(prereqId);
        inDegree.set(dependentId, (inDegree.get(dependentId) || 0) + 1);
      }
    }
  }

  return {
    nodes,
    ruleMap,
    adjacency,
    reverseAdjacency,
    inDegree,
    missingDependencies,
  };
}
