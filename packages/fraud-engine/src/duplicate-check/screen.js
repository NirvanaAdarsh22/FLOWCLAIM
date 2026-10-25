/**
 * @file packages/fraud-engine/src/duplicate-check/screen.js
 * Stage 2 fraud screening logic.
 */

import { computeSha256 } from './hash-utils.js';
import { computeDHash } from '../dhash/dhash.js';

/**
 * Creates the screening function bound to a FingerprintStore and configuration.
 *
 * @param {import('../index.js').FingerprintStore} store
 * @param {object} config
 * @param {number} [config.hammingThreshold=5]
 */
export function createScreenFunction(store, config = {}) {
  const hammingThreshold = config.hammingThreshold ?? 5;

  /**
   * Executes Stage 2 fraud screening on uploaded receipt bytes.
   *
   * @param {object} params
   * @param {string} params.claimId
   * @param {Uint8Array|Buffer} params.bytes
   * @param {string} [params.contentType]
   * @returns {Promise<import('@flowclaim/shared-types').FraudScreenResult>}
   */
  return async function screen({ claimId, bytes, contentType }) {
    if (!claimId) throw new Error('claimId is required for screening');
    if (!bytes || bytes.length === 0) throw new Error('Receipt bytes cannot be empty');

    const sha256 = computeSha256(bytes);
    const dhash = await computeDHash(bytes);

    // 1. Bloom filter pre-screen for exact SHA-256
    const bloomPositive = await store.bloomHasSha256(sha256);
    let exactDuplicateOf = null;

    if (bloomPositive) {
      const matchClaimId = await store.getClaimIdBySha256(sha256);
      if (matchClaimId && matchClaimId !== claimId) {
        exactDuplicateOf = matchClaimId;
      }
    }

    // 2. Perceptual dHash candidate search within hammingThreshold
    const rawCandidates = await store.findDhashCandidates(dhash, hammingThreshold);
    const candidates = rawCandidates
      .filter((c) => c.claimId !== claimId)
      .map((c) => ({
        claimId: c.claimId,
        hammingDistance: c.hammingDistance,
        similarity: Math.max(0, Math.min(1, Number((1 - c.hammingDistance / 64).toFixed(6)))),
      }))
      .sort((a, b) => a.hammingDistance - b.hammingDistance);

    const status = exactDuplicateOf || candidates.length > 0 ? 'CANDIDATE' : 'CLEAR';

    // 3. Register current claim's fingerprints in store (idempotent)
    await store.bloomAddSha256(sha256);
    await store.setClaimIdBySha256(sha256, claimId);
    await store.addDhash(claimId, dhash);

    return {
      claimId,
      sha256,
      dhash,
      exactDuplicateOf,
      bloomPositive,
      candidates,
      status,
      hammingThresholdUsed: hammingThreshold,
      screenedAt: new Date().toISOString(),
    };
  };
}
