/**
 * @flowclaim/anomaly-engine
 * Public entrypoint for the deterministic KD-Tree anomaly detection engine.
 */

export { createAnomalyEngine } from './scoring/anomaly-scorer.js';
export { buildKDTree, KDTree } from './kd-tree/kd-tree.js';
export { euclideanDistance, squaredEuclideanDistance, manhattanDistance } from './distance/euclidean.js';
export { computeHistoricalStats, extractFeatureVector, CATEGORIES } from './normalization/normalizer.js';
