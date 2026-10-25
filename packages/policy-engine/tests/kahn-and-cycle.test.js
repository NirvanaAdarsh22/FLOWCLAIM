/**
 * @fileoverview Unit tests for Kahn's topological sorting and cycle detection.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { topologicalSort, PolicyCycleError } from '../src/topological-sort/kahn.js';
import { detectCycle } from '../src/cycle-detection/cycle.js';

describe("Kahn's Topological Sort & Cycle Detection", () => {
  test('returns empty array for empty rule set', () => {
    assert.deepEqual(topologicalSort([]), []);
    assert.equal(detectCycle([]), null);
  });

  test('sorts independent rules in ascending order of ruleId', () => {
    const rules = [
      { ruleId: 'rule-gamma', dependsOn: [] },
      { ruleId: 'rule-alpha', dependsOn: [] },
      { ruleId: 'rule-beta', dependsOn: [] },
    ];

    const order = topologicalSort(rules);
    assert.deepEqual(order, ['rule-alpha', 'rule-beta', 'rule-gamma']);
    assert.equal(detectCycle(rules), null);
  });

  test('sorts linear dependency chain correctly', () => {
    const rules = [
      { ruleId: 'step-3', dependsOn: ['step-2'] },
      { ruleId: 'step-1', dependsOn: [] },
      { ruleId: 'step-2', dependsOn: ['step-1'] },
    ];

    const order = topologicalSort(rules);
    assert.deepEqual(order, ['step-1', 'step-2', 'step-3']);
  });

  test('sorts diamond DAG with ascending tie-breaking', () => {
    // A -> B, A -> C; B -> D, C -> D
    const rules = [
      { ruleId: 'rule-D', dependsOn: ['rule-B', 'rule-C'] },
      { ruleId: 'rule-C', dependsOn: ['rule-A'] },
      { ruleId: 'rule-B', dependsOn: ['rule-A'] },
      { ruleId: 'rule-A', dependsOn: [] },
    ];

    const order = topologicalSort(rules);
    // After A, both B and C become available. 'rule-B' < 'rule-C', so B comes before C.
    assert.deepEqual(order, ['rule-A', 'rule-B', 'rule-C', 'rule-D']);
  });

  test('detects self-loop cycle', () => {
    const rules = [{ ruleId: 'self-rule', dependsOn: ['self-rule'] }];

    const cycle = detectCycle(rules);
    assert.ok(cycle !== null);
    assert.deepEqual(cycle, ['self-rule', 'self-rule']);

    assert.throws(
      () => topologicalSort(rules),
      (err) => err instanceof PolicyCycleError && err.code === 'POLICY_CYCLE_DETECTED'
    );
  });

  test('detects 2-node cycle', () => {
    const rules = [
      { ruleId: 'node-A', dependsOn: ['node-B'] },
      { ruleId: 'node-B', dependsOn: ['node-A'] },
    ];

    const cycle = detectCycle(rules);
    assert.ok(cycle !== null);
    assert.ok(cycle.includes('node-A') && cycle.includes('node-B'));

    assert.throws(
      () => topologicalSort(rules),
      (err) => err instanceof PolicyCycleError
    );
  });

  test('detects 3-node cycle in larger graph', () => {
    const rules = [
      { ruleId: 'init', dependsOn: [] },
      { ruleId: 'node-1', dependsOn: ['init', 'node-3'] },
      { ruleId: 'node-2', dependsOn: ['node-1'] },
      { ruleId: 'node-3', dependsOn: ['node-2'] },
      { ruleId: 'end', dependsOn: ['node-3'] },
    ];

    const cycle = detectCycle(rules);
    assert.ok(cycle !== null);
    assert.throws(
      () => topologicalSort(rules),
      (err) => err instanceof PolicyCycleError
    );
  });

  test('throws error when dependency does not exist in rule set', () => {
    const rules = [
      { ruleId: 'rule-1', dependsOn: ['non-existent-rule'] },
    ];

    assert.throws(
      () => topologicalSort(rules),
      /depends on non-existent rule/
    );
  });
});
