/**
 * Distance metrics for feature vectors in multi-dimensional space.
 */

/**
 * Calculates the Euclidean distance between two vectors of the same dimension.
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Euclidean distance
 */
export function euclideanDistance(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: vector 'a' length (${a.length}) !== vector 'b' length (${b.length})`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculates squared Euclidean distance (avoids costly sqrt during nearest neighbor pruning).
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Squared Euclidean distance
 */
export function squaredEuclideanDistance(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: vector 'a' length (${a.length}) !== vector 'b' length (${b.length})`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return sum;
}

/**
 * Calculates Manhattan distance between two vectors.
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Manhattan distance
 */
export function manhattanDistance(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: vector 'a' length (${a.length}) !== vector 'b' length (${b.length})`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
}
