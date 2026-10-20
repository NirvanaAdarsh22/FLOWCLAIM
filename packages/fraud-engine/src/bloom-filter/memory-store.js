/**
 * @file packages/fraud-engine/src/bloom-filter/memory-store.js
 * In-memory implementation of the FingerprintStore contract for fast, zero-dependency testing.
 */

import { hammingDistance } from '../similarity/hamming.js';

/**
 * Creates an in-memory FingerprintStore.
 *
 * @returns {import('../index.js').FingerprintStore}
 */
export function createMemoryFingerprintStore() {
  /** @type {Set<string>} */
  const bloomSet = new Set();
  /** @type {Map<string, string>} sha256 -> claimId */
  const shaMap = new Map();
  /** @type {Map<string, string>} claimId -> dhashHex */
  const dhashMap = new Map();

  return {
    async bloomHasSha256(sha256) {
      return bloomSet.has(sha256);
    },

    async bloomAddSha256(sha256) {
      bloomSet.add(sha256);
    },

    async getClaimIdBySha256(sha256) {
      return shaMap.get(sha256) || null;
    },

    async setClaimIdBySha256(sha256, claimId) {
      shaMap.set(sha256, claimId);
    },

    async addDhash(claimId, dhashHex) {
      dhashMap.set(claimId, dhashHex.toLowerCase());
    },

    async findDhashCandidates(dhashHex, maxDistance) {
      const target = dhashHex.toLowerCase();
      /** @type {{ claimId: string, hammingDistance: number }[]} */
      const candidates = [];

      for (const [storedClaimId, storedHash] of dhashMap.entries()) {
        try {
          const dist = hammingDistance(target, storedHash);
          if (dist <= maxDistance) {
            candidates.push({ claimId: storedClaimId, hammingDistance: dist });
          }
        } catch {
          // Ignore malformed hashes
        }
      }

      // Sort ascending by distance (closest first)
      return candidates.sort((a, b) => a.hammingDistance - b.hammingDistance);
    },

    /** Test helper: clears all store state */
    async clear() {
      bloomSet.clear();
      shaMap.clear();
      dhashMap.clear();
    },
  };
}
