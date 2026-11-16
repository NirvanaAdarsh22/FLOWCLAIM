/**
 * @fileoverview Unit tests for Receipt Extractor and validation error taxonomy.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createReceiptExtractor } from '../src/extraction/extractor.js';
import { MockGeminiClient } from '../src/gemini/client.js';

describe('Receipt AI: Extractor & Validation Taxonomy', () => {
  const dummyBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF magic number

  test('rejects unsupported content type with UNSUPPORTED_FILE', async () => {
    const client = new MockGeminiClient();
    const extractor = createReceiptExtractor({ client });

    const res = await extractor.extract({
      claimId: 'claim-123',
      bytes: dummyBytes,
      contentType: 'text/csv',
    });

    assert.equal(res.ok, false);
    assert.equal(res.code, 'UNSUPPORTED_FILE');
    assert.equal(res.retryable, false);
  });

  test('rejects empty byte buffer with MALFORMED_OUTPUT', async () => {
    const client = new MockGeminiClient();
    const extractor = createReceiptExtractor({ client });

    const res = await extractor.extract({
      claimId: 'claim-123',
      bytes: new Uint8Array([]),
      contentType: 'application/pdf',
    });

    assert.equal(res.ok, false);
    assert.equal(res.code, 'MALFORMED_OUTPUT');
    assert.equal(res.retryable, false);
  });

  test('successfully extracts and validates compliant receipt', async () => {
    const client = new MockGeminiClient({
      defaultFileResponse: JSON.stringify({
        merchant: 'Uber India Systems',
        transactionDate: '2026-11-10',
        currency: 'INR',
        subtotalMinor: 45000,
        taxMinor: 5000,
        totalMinor: 50000,
        lineItems: [{ description: 'Airport Ride', quantity: 1, amountMinor: 50000 }],
        fieldConfidence: { merchant: 0.99, totalMinor: 0.99 },
      }),
    });
    const extractor = createReceiptExtractor({ client, config: { totalToleranceMinor: 0 } });

    const res = await extractor.extract({
      claimId: 'claim-uber-1',
      bytes: dummyBytes,
      contentType: 'application/pdf',
    });

    assert.equal(res.ok, true);
    assert.equal(res.data.merchant, 'Uber India Systems');
    assert.equal(res.data.totalMinor, 50000);
    assert.equal(res.data.currency, 'INR');
    assert.equal(res.data.lineItems.length, 1);
  });

  test('maps Gemini transport/timeout error to retryable MODEL_UNAVAILABLE', async () => {
    const client = new MockGeminiClient({ simulateUnavailable: true });
    const extractor = createReceiptExtractor({ client });

    const res = await extractor.extract({
      claimId: 'claim-retry-1',
      bytes: dummyBytes,
      contentType: 'image/jpeg',
    });

    assert.equal(res.ok, false);
    assert.equal(res.code, 'MODEL_UNAVAILABLE');
    assert.equal(res.retryable, true);
  });

  test('rejects malformed non-JSON output with non-retryable MALFORMED_OUTPUT', async () => {
    const client = new MockGeminiClient({
      defaultFileResponse: 'Sorry, I cannot read this receipt image clearly.',
    });
    const extractor = createReceiptExtractor({ client });

    const res = await extractor.extract({
      claimId: 'claim-bad-json',
      bytes: dummyBytes,
      contentType: 'image/png',
    });

    assert.equal(res.ok, false);
    assert.equal(res.code, 'MALFORMED_OUTPUT');
    assert.equal(res.retryable, false);
  });

  test('rejects inconsistent totals with INCONSISTENT_TOTALS', async () => {
    const client = new MockGeminiClient({
      defaultFileResponse: JSON.stringify({
        merchant: 'Hotel Taj',
        transactionDate: '2026-11-10',
        currency: 'INR',
        subtotalMinor: 100000,
        taxMinor: 10000,
        totalMinor: 150000, // Expected 110000, discrepancy is 40000
        lineItems: [],
      }),
    });
    const extractor = createReceiptExtractor({ client, config: { totalToleranceMinor: 100 } });

    const res = await extractor.extract({
      claimId: 'claim-math-fail',
      bytes: dummyBytes,
      contentType: 'image/png',
    });

    assert.equal(res.ok, false);
    assert.equal(res.code, 'INCONSISTENT_TOTALS');
    assert.equal(res.retryable, false);
  });

  test('rejects missing mandatory merchant field with MISSING_FIELD', async () => {
    const client = new MockGeminiClient({
      defaultFileResponse: JSON.stringify({
        merchant: '',
        transactionDate: '2026-11-10',
        currency: 'INR',
        taxMinor: 0,
        totalMinor: 25000,
      }),
    });
    const extractor = createReceiptExtractor({ client });

    const res = await extractor.extract({
      claimId: 'claim-no-merchant',
      bytes: dummyBytes,
      contentType: 'image/jpeg',
    });

    assert.equal(res.ok, false);
    assert.equal(res.code, 'MISSING_FIELD');
    assert.equal(res.retryable, false);
  });

  test('rejects future transaction date with IMPOSSIBLE_VALUE', async () => {
    const client = new MockGeminiClient({
      defaultFileResponse: JSON.stringify({
        merchant: 'Future Store',
        transactionDate: '2030-01-01',
        currency: 'INR',
        taxMinor: 0,
        totalMinor: 1000,
      }),
    });
    const extractor = createReceiptExtractor({ client });

    const res = await extractor.extract({
      claimId: 'claim-future-date',
      bytes: dummyBytes,
      contentType: 'image/jpeg',
    });

    assert.equal(res.ok, false);
    assert.equal(res.code, 'IMPOSSIBLE_VALUE');
    assert.equal(res.retryable, false);
  });
});
