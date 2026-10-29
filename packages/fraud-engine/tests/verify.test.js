import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createVerifyFunction } from '../src/duplicate-check/verify.js';

describe('Post-Extraction Duplicate Verification unit tests', () => {
  const verify = createVerifyFunction();

  const currentExtraction = {
    merchant: 'Starbucks Coffee, LLC',
    transactionDate: '2026-10-15',
    currency: 'INR',
    subtotalMinor: 45000,
    taxMinor: 5000,
    totalMinor: 50000,
    lineItems: [],
    fieldConfidence: { merchant: 0.99, totalMinor: 0.99 },
    modelId: 'test-model',
    extractedAt: '2026-10-15T10:00:00Z',
  };

  test('exact sha256 duplicate returns CONFIRMED_DUPLICATE immediately', async () => {
    const screen = {
      claimId: 'claim-new',
      sha256: 'abc123sha',
      dhash: '0000000000000000',
      exactDuplicateOf: 'claim-existing-1',
      bloomPositive: true,
      candidates: [],
      status: 'CANDIDATE',
      hammingThresholdUsed: 5,
      screenedAt: '2026-10-15T10:00:00Z',
    };

    const res = await verify({
      claimId: 'claim-new',
      screen,
      extraction: currentExtraction,
      lookup: null,
    });

    assert.equal(res.verdict, 'CONFIRMED_DUPLICATE');
    assert.equal(res.matchedClaimId, 'claim-existing-1');
  });

  test('dHash candidate with all 3 fields matching yields CONFIRMED_DUPLICATE', async () => {
    const screen = {
      claimId: 'claim-new',
      sha256: 'unique-sha',
      dhash: '0000000000000000',
      exactDuplicateOf: null,
      bloomPositive: false,
      candidates: [{ claimId: 'claim-candidate-1', hammingDistance: 2, similarity: 0.96875 }],
      status: 'CANDIDATE',
      hammingThresholdUsed: 5,
      screenedAt: '2026-10-15T10:00:00Z',
    };

    const lookup = {
      async getExtraction(cId) {
        if (cId === 'claim-candidate-1') {
          return {
            merchant: 'starbucks coffee llc.', // punctuation & case normalization
            transactionDate: '2026-10-15',
            totalMinor: 50000, // exact same total
          };
        }
        return null;
      },
    };

    const res = await verify({
      claimId: 'claim-new',
      screen,
      extraction: currentExtraction,
      lookup,
    });

    assert.equal(res.verdict, 'CONFIRMED_DUPLICATE');
    assert.equal(res.matchedClaimId, 'claim-candidate-1');
  });

  test('dHash candidate with 2 matching fields yields NEEDS_REVIEW', async () => {
    const screen = {
      claimId: 'claim-new',
      sha256: 'unique-sha',
      dhash: '0000000000000000',
      exactDuplicateOf: null,
      bloomPositive: false,
      candidates: [{ claimId: 'claim-candidate-2', hammingDistance: 3, similarity: 0.953125 }],
      status: 'CANDIDATE',
      hammingThresholdUsed: 5,
      screenedAt: '2026-10-15T10:00:00Z',
    };

    const lookup = {
      async getExtraction(cId) {
        if (cId === 'claim-candidate-2') {
          return {
            merchant: 'Starbucks Coffee, LLC', // match 1 (merchant)
            transactionDate: '2026-09-01', // DIFFERENT date
            totalMinor: 50000, // match 2 (total amount)
          };
        }
        return null;
      },
    };

    const res = await verify({
      claimId: 'claim-new',
      screen,
      extraction: currentExtraction,
      lookup,
    });

    assert.equal(res.verdict, 'NEEDS_REVIEW');
    assert.equal(res.matchedClaimId, 'claim-candidate-2');
  });

  test('dHash candidate with only 1 matching field yields NOT_DUPLICATE', async () => {
    const screen = {
      claimId: 'claim-new',
      sha256: 'unique-sha',
      dhash: '0000000000000000',
      exactDuplicateOf: null,
      bloomPositive: false,
      candidates: [{ claimId: 'claim-candidate-3', hammingDistance: 4, similarity: 0.9375 }],
      status: 'CANDIDATE',
      hammingThresholdUsed: 5,
      screenedAt: '2026-10-15T10:00:00Z',
    };

    const lookup = {
      async getExtraction() {
        return {
          merchant: 'Different Merchant Corp',
          transactionDate: '2026-08-01',
          totalMinor: 50000, // only 1 match (amount)
        };
      },
    };

    const res = await verify({
      claimId: 'claim-new',
      screen,
      extraction: currentExtraction,
      lookup,
    });

    assert.equal(res.verdict, 'NOT_DUPLICATE');
    assert.equal(res.matchedClaimId, null);
  });
});
