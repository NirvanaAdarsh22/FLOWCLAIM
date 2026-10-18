/**
 * @file packages/fraud-engine/src/similarity/similarity.js
 * Perceptual similarity calculation between 64-bit dHash strings.
 */

import { hammingDistance } from './hamming.js';

/**
 * Calculates normalized perceptual similarity between two 16-hex character dHash strings.
 * Formula: similarity = 1 - (hammingDistance / 64)
 *
 * @param {string} aHex
 * @param {string} bHex
 * @returns {number} Normalized similarity in range [0.0, 1.0]
 */
export function similarity(aHex, bHex) {
  const dist = hammingDistance(aHex, bHex);
  const sim = 1 - dist / 64;
  // Guard against float precision drift
  return Math.max(0, Math.min(1, Number(sim.toFixed(6))));
}
