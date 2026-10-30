/**
 * @file packages/fraud-engine/src/index.js
 * Public API for @flowclaim/fraud-engine.
 *
 * Implements perceptual difference hashing (dHash), Hamming distance calculation,
 * Redis / In-Memory Bloom filter pre-screening, and definitive post-extraction
 * duplicate verification.
 */

import { computeDHash } from './dhash/dhash.js';
import { hammingDistance } from './similarity/hamming.js';
import { similarity } from './similarity/similarity.js';
import { createScreenFunction } from './duplicate-check/screen.js';
import { createVerifyFunction } from './duplicate-check/verify.js';
import { createMemoryFingerprintStore } from './bloom-filter/memory-store.js';
import { createRedisFingerprintStore } from './bloom-filter/redis-store.js';
import { normalizeMerchant, normalizeDate, areAmountsEqual } from './duplicate-check/normalization.js';

/**
 * Creates an instance of the FraudEngine bound to a FingerprintStore and configuration.
 *
 * @param {object} params
 * @param {import('./index.js').FingerprintStore} params.store
 * @param {object} [params.config]
 * @param {number} [params.config.hammingThreshold=5]
 * @returns {{
 *   screen: (params: { claimId: string, bytes: Uint8Array|Buffer, contentType?: string }) => Promise<import('@flowclaim/shared-types').FraudScreenResult>,
 *   verify: (params: { claimId: string, screen: import('@flowclaim/shared-types').FraudScreenResult, extraction: import('@flowclaim/shared-types').ReceiptExtraction, lookup: import('@flowclaim/shared-types').ClaimLookupPort }) => Promise<import('@flowclaim/shared-types').DuplicateVerificationResult>
 * }}
 */
export function createFraudEngine({ store, config = {} }) {
  if (!store) {
    throw new Error('A valid FingerprintStore instance must be provided to createFraudEngine');
  }

  const screen = createScreenFunction(store, config);
  const verify = createVerifyFunction();

  return {
    screen,
    verify,
  };
}

// Public exports as required by §6.1 of the Master Shared Integration Contract
export {
  computeDHash,
  hammingDistance,
  similarity,
  createMemoryFingerprintStore,
  createRedisFingerprintStore,
  normalizeMerchant,
  normalizeDate,
  areAmountsEqual,
};
