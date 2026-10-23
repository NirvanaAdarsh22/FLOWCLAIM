/**
 * @fileoverview Cycle detection for Policy Engine DAG using 3-color DFS.
 * Returns array of ruleIds forming an exact closed cycle, or null if acyclic.
 * Follows Master Development Document v1.1 (§6.3).
 * Plain JavaScript ESM only.
 */

import { buildPolicyGraph } from '../graph/graph.js';

/**
 * Detects cycles in policy rules.
 *
 * @param {Array<{ ruleId: string, dependsOn: string[] }>} rules
 * @returns {string[] | null} Cycle path (e.g. ['rule-a', 'rule-b', 'rule-a']) or null if acyclic
 */
export function detectCycle(rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return null;
  }

  const { nodes, adjacency } = buildPolicyGraph(rules);

  // States: 0 = unvisited (white), 1 = visiting (gray), 2 = visited (black)
  const state = new Map();
  const parent = new Map();

  for (const node of nodes) {
    state.set(node, 0);
  }

  // Deterministic exploration order by sorting ruleIds
  const sortedNodes = Array.from(nodes).sort((a, b) => a.localeCompare(b));

  for (const startNode of sortedNodes) {
    if (state.get(startNode) === 0) {
      const cyclePath = dfs(startNode);
      if (cyclePath) {
        return cyclePath;
      }
    }
  }

  return null;

  /**
   * @param {string} u
   * @returns {string[] | null}
   */
  function dfs(u) {
    state.set(u, 1);

    const neighbors = (adjacency.get(u) || []).slice().sort((a, b) => a.localeCompare(b));
    for (const v of neighbors) {
      // Self loop check
      if (v === u) {
        return [u, u];
      }

      if (state.get(v) === 1) {
        // Back-edge found from u to v. Reconstruct cycle path starting and ending at v.
        const cycle = [v];
        let curr = u;
        while (curr !== v && parent.has(curr)) {
          cycle.push(curr);
          curr = parent.get(curr);
        }
        cycle.push(v);
        cycle.reverse();
        return cycle;
      }

      if (state.get(v) === 0) {
        parent.set(v, u);
        const sub = dfs(v);
        if (sub) return sub;
      }
    }

    state.set(u, 2);
    return null;
  }
}
