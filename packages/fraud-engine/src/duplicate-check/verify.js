/**
 * @file packages/fraud-engine/src/duplicate-check/verify.js
 * Definitive post-extraction duplicate verification logic.
 */

import { normalizeMerchant, normalizeDate, areAmountsEqual } from './normalization.js';

/**
 * Creates the verify function for definitive duplicate checks.
 *
 * @returns {Function}
 */
export function createVerifyFunction() {
  /**
   * Executes definitive post-extraction duplicate verification.
   *
   * @param {object} params
   * @param {string} params.claimId
   * @param {import('@flowclaim/shared-types').FraudScreenResult} params.screen
   * @param {import('@flowclaim/shared-types').ReceiptExtraction} params.extraction
   * @param {import('@flowclaim/shared-types').ClaimLookupPort} params.lookup
   * @returns {Promise<import('@flowclaim/shared-types').DuplicateVerificationResult>}
   */
  return async function verify({ claimId, screen, extraction, lookup }) {
    if (!claimId) throw new Error('claimId is required for duplicate verification');
    if (!screen) throw new Error('Fraud screen result is required');
    if (!extraction) throw new Error('Receipt extraction is required');

    const evidence = [];

    // Rule 1: Exact SHA-256 match to a different claim
    if (screen.exactDuplicateOf && screen.exactDuplicateOf !== claimId) {
      return {
        verdict: 'CONFIRMED_DUPLICATE',
        matchedClaimId: screen.exactDuplicateOf,
        evidence: [
          {
            claimId: screen.exactDuplicateOf,
            hammingDistance: 0,
            merchantMatch: true,
            dateMatch: true,
            totalMatch: true,
          },
        ],
        verifiedAt: new Date().toISOString(),
      };
    }

    // Rule 2: Perceptual dHash candidates comparison with field matching
    let finalVerdict = 'NOT_DUPLICATE';
    let matchedClaimId = null;

    if (screen.candidates && screen.candidates.length > 0 && lookup) {
      const currentNormMerchant = normalizeMerchant(extraction.merchant);
      const currentNormDate = normalizeDate(extraction.transactionDate);

      for (const candidate of screen.candidates) {
        if (!candidate.claimId || candidate.claimId === claimId) continue;

        let candidateExt = null;
        try {
          candidateExt = await lookup.getExtraction(candidate.claimId);
        } catch {
          // If lookup fails, treat as unverified candidate
        }

        if (!candidateExt) continue;

        const candidateNormMerchant = normalizeMerchant(candidateExt.merchant);
        const candidateNormDate = normalizeDate(candidateExt.transactionDate);

        const merchantMatch =
          Boolean(currentNormMerchant) &&
          Boolean(candidateNormMerchant) &&
          currentNormMerchant === candidateNormMerchant;

        const dateMatch =
          Boolean(currentNormDate) &&
          Boolean(candidateNormDate) &&
          currentNormDate === candidateNormDate;

        const totalMatch = areAmountsEqual(extraction.totalMinor, candidateExt.totalMinor);

        const matchCount = (merchantMatch ? 1 : 0) + (dateMatch ? 1 : 0) + (totalMatch ? 1 : 0);

        evidence.push({
          claimId: candidate.claimId,
          hammingDistance: candidate.hammingDistance ?? null,
          merchantMatch,
          dateMatch,
          totalMatch,
        });

        // 3 matches => CONFIRMED_DUPLICATE
        if (matchCount === 3) {
          finalVerdict = 'CONFIRMED_DUPLICATE';
          matchedClaimId = candidate.claimId;
          break; // Definitive match found
        }

        // 2 matches => NEEDS_REVIEW
        if (matchCount === 2 && finalVerdict !== 'CONFIRMED_DUPLICATE') {
          finalVerdict = 'NEEDS_REVIEW';
          matchedClaimId = candidate.claimId;
        }
      }
    }

    return {
      verdict: finalVerdict,
      matchedClaimId,
      evidence,
      verifiedAt: new Date().toISOString(),
    };
  };
}
