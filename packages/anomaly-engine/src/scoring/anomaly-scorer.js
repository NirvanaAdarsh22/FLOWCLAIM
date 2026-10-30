import { computeHistoricalStats, extractFeatureVector } from '../normalization/normalizer.js';
import { buildKDTree } from '../kd-tree/kd-tree.js';

/**
 * Creates the anomaly detection engine.
 * @param {{ config: { k: number, threshold: number, minHistory?: number } }} options
 * @returns {{ score: (params: { history: Array<any>, candidate: any, now?: string }) => any }}
 */
export function createAnomalyEngine({ config }) {
  const k = config.k ?? 5;
  const threshold = config.threshold ?? 1.5;
  const minHistory = config.minHistory ?? 10;
  const requiredHistory = Math.max(minHistory, k);

  return {
    /**
     * Evaluates a candidate expense against historical approved records.
     * Pure, deterministic calculation.
     * 
     * @param {{
     *   history: Array<{ expenseId: string, claimId: string, employeeId: string, category: string, amountMinor: number, transactionDate: string }>,
     *   candidate: { employeeId: string, category: string, amountMinor: number, transactionDate: string },
     *   now?: string
     * }} params
     * @returns {import('../../../shared-types/src/claim.js').AnomalyResult}
     */
    score({ history = [], candidate, now }) {
      const scoredAt = now || new Date().toISOString();

      // Check for minimum history threshold
      if (history.length < requiredHistory) {
        return {
          status: 'INSUFFICIENT_HISTORY',
          score: 0,
          threshold,
          flagged: false,
          k,
          neighbours: [],
          featureVector: [],
          explanation: `Insufficient historical data for anomaly evaluation (requires at least ${requiredHistory} records, found ${history.length})`,
          scoredAt
        };
      }

      // 1. Compute historical statistics
      const stats = computeHistoricalStats(history);

      // 2. Extract feature vectors for all historical expenses
      const points = [];
      const ids = [];

      for (const item of history) {
        const vec = extractFeatureVector(item, stats);
        points.push(vec);
        ids.push({
          expenseId: item.expenseId,
          claimId: item.claimId
        });
      }

      // 3. Build KD-Tree from historical points
      const tree = buildKDTree(points, ids);

      // 4. Extract feature vector for candidate
      const candidateVector = extractFeatureVector(candidate, stats);

      // 5. Query k-nearest neighbors
      const nearest = tree.nearest(candidateVector, k);

      // 6. Calculate mean k-NN distance (anomaly score)
      const totalDistance = nearest.reduce((sum, n) => sum + n.distance, 0);
      const score = Number((totalDistance / nearest.length).toFixed(6));
      const flagged = score > threshold;

      // 7. Format neighbors
      const neighbours = nearest.map(n => ({
        expenseId: n.id.expenseId,
        claimId: n.id.claimId,
        distance: Number(n.distance.toFixed(6))
      }));

      // 8. Generate deterministic template explanation
      const amountFormatted = (candidate.amountMinor / 100).toFixed(2);
      const explanation = flagged
        ? `Candidate expense of ₹${amountFormatted} in category '${candidate.category}' deviates significantly from historical patterns (k-NN mean distance: ${score.toFixed(4)}, threshold: ${threshold.toFixed(4)}, k: ${k}).`
        : `Candidate expense of ₹${amountFormatted} in category '${candidate.category}' conforms to historical patterns (k-NN mean distance: ${score.toFixed(4)}, threshold: ${threshold.toFixed(4)}, k: ${k}).`;

      return {
        status: 'SCORED',
        score,
        threshold,
        flagged,
        k,
        neighbours,
        featureVector: candidateVector,
        explanation,
        scoredAt
      };
    }
  };
}
