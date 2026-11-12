/**
 * Utilities for formatting and validating ledger idempotency keys.
 */

/**
 * Builds standard claim commit idempotency key.
 * Format: claim:${claimId}:commit
 * @param {string} claimId
 * @returns {string}
 */
export function buildClaimCommitKey(claimId) {
  if (!claimId) {
    throw new Error('claimId is required to generate commit key');
  }
  return `claim:${claimId}:commit`;
}
