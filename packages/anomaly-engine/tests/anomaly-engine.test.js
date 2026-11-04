import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createAnomalyEngine,
  buildKDTree,
  euclideanDistance,
  computeHistoricalStats,
  extractFeatureVector
} from '../src/index.js';

describe('@flowclaim/anomaly-engine', () => {
  describe('Distance Metrics', () => {
    it('calculates Euclidean distance correctly', () => {
      const a = [0, 0, 0];
      const b = [3, 4, 0];
      assert.equal(euclideanDistance(a, b), 5);
    });

    it('throws error when vector dimensions do not match', () => {
      assert.throws(() => euclideanDistance([1, 2], [1, 2, 3]), /Dimension mismatch/);
    });
  });

  describe('Feature Normalization', () => {
    it('computes correct mean and sample standard deviation', () => {
      const history = [
        { amountMinor: 1000 },
        { amountMinor: 2000 },
        { amountMinor: 3000 }
      ];
      const stats = computeHistoricalStats(history);
      assert.equal(stats.count, 3);
      assert.equal(stats.meanAmount, 2000);
      assert.equal(stats.stdAmount, 1000);
    });

    it('extracts bounded normalized feature vector', () => {
      const stats = { meanAmount: 2000, stdAmount: 1000 };
      const expense = {
        amountMinor: 3000,
        category: 'MEALS',
        transactionDate: '2026-11-18'
      };
      const vec = extractFeatureVector(expense, stats);
      assert.equal(vec.length, 3);
      assert.equal(vec[0], 1.0); // Z-score = (3000 - 2000) / 1000 = 1.0
      assert.ok(vec[1] >= 0 && vec[1] <= 1);
      assert.ok(vec[2] >= 0 && vec[2] <= 1);
    });
  });

  describe('KD-Tree Nearest Neighbor Search', () => {
    it('returns exact same results as brute-force nearest neighbor search', () => {
      // Generate 50 3-dimensional points
      const points = [];
      const ids = [];
      for (let i = 0; i < 50; i++) {
        points.push([
          Math.sin(i) * 10,
          Math.cos(i) * 10,
          (i % 5) * 2
        ]);
        ids.push(`id-${i}`);
      }

      const tree = buildKDTree(points, ids);
      const queryPoint = [2.5, -1.0, 3.0];
      const k = 5;

      // KD-tree search
      const kdResults = tree.nearest(queryPoint, k);

      // Brute-force reference search
      const bruteResults = points
        .map((p, idx) => ({ id: ids[idx], distance: euclideanDistance(queryPoint, p) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, k);

      assert.equal(kdResults.length, k);
      for (let i = 0; i < k; i++) {
        assert.equal(kdResults[i].id, bruteResults[i].id);
        assert.ok(Math.abs(kdResults[i].distance - bruteResults[i].distance) < 1e-9);
      }
    });

    it('handles k greater than total number of points', () => {
      const points = [[1, 2], [3, 4]];
      const ids = ['a', 'b'];
      const tree = buildKDTree(points, ids);

      const results = tree.nearest([0, 0], 10);
      assert.equal(results.length, 2);
    });
  });

  describe('Anomaly Scorer & Deterministic Decision Engine', () => {
    const engine = createAnomalyEngine({
      config: {
        k: 3,
        threshold: 1.5,
        minHistory: 5
      }
    });

    const mockHistory = [
      { expenseId: 'e1', claimId: 'c1', employeeId: 'u1', category: 'MEALS', amountMinor: 50000, transactionDate: '2026-11-10' },
      { expenseId: 'e2', claimId: 'c2', employeeId: 'u1', category: 'MEALS', amountMinor: 52000, transactionDate: '2026-11-11' },
      { expenseId: 'e3', claimId: 'c3', employeeId: 'u1', category: 'MEALS', amountMinor: 48000, transactionDate: '2026-11-12' },
      { expenseId: 'e4', claimId: 'c4', employeeId: 'u1', category: 'MEALS', amountMinor: 51000, transactionDate: '2026-11-13' },
      { expenseId: 'e5', claimId: 'c5', employeeId: 'u1', category: 'MEALS', amountMinor: 49000, transactionDate: '2026-11-14' },
      { expenseId: 'e6', claimId: 'c6', employeeId: 'u1', category: 'MEALS', amountMinor: 53000, transactionDate: '2026-11-15' },
    ];

    it('returns INSUFFICIENT_HISTORY when history count is below threshold', () => {
      const res = engine.score({
        history: mockHistory.slice(0, 2),
        candidate: { employeeId: 'u1', category: 'MEALS', amountMinor: 50000, transactionDate: '2026-11-16' },
        now: '2026-11-18T10:00:00Z'
      });

      assert.equal(res.status, 'INSUFFICIENT_HISTORY');
      assert.equal(res.flagged, false);
      assert.equal(res.score, 0);
      assert.equal(res.neighbours.length, 0);
    });

    it('scores a normal conforming expense without flagging', () => {
      const res = engine.score({
        history: mockHistory,
        candidate: { employeeId: 'u1', category: 'MEALS', amountMinor: 50500, transactionDate: '2026-11-16' },
        now: '2026-11-18T10:00:00Z'
      });

      assert.equal(res.status, 'SCORED');
      assert.equal(res.flagged, false);
      assert.ok(res.score < 1.5, `Expected score < 1.5, got ${res.score}`);
      assert.equal(res.neighbours.length, 3);
      assert.match(res.explanation, /conforms to historical patterns/);
    });

    it('flags an extreme outlier expense as anomalous', () => {
      const res = engine.score({
        history: mockHistory,
        candidate: { employeeId: 'u1', category: 'TRAVEL', amountMinor: 5000000, transactionDate: '2026-11-16' }, // 50,000 INR vs ~500 INR
        now: '2026-11-18T10:00:00Z'
      });

      assert.equal(res.status, 'SCORED');
      assert.equal(res.flagged, true);
      assert.ok(res.score > 1.5, `Expected score > 1.5, got ${res.score}`);
      assert.match(res.explanation, /deviates significantly from historical patterns/);
    });

    it('is completely deterministic on identical inputs', () => {
      const candidate = { employeeId: 'u1', category: 'MEALS', amountMinor: 75000, transactionDate: '2026-11-16' };
      const run1 = engine.score({ history: mockHistory, candidate, now: '2026-11-18T12:00:00Z' });
      const run2 = engine.score({ history: mockHistory, candidate, now: '2026-11-18T12:00:00Z' });

      assert.deepEqual(run1, run2);
    });
  });
});
