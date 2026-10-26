import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createScreenFunction } from '../src/duplicate-check/screen.js';
import { createMemoryFingerprintStore } from '../src/bloom-filter/memory-store.js';

describe('Stage 2 Fraud Screening unit tests', () => {
  let store;
  let screen;

  beforeEach(() => {
    store = createMemoryFingerprintStore();
    screen = createScreenFunction(store, { hammingThreshold: 5 });
  });

  test('fresh claim returns CLEAR status', async () => {
    const bytes = Buffer.from('unique receipt 101');
    const result = await screen({ claimId: 'claim-1', bytes, contentType: 'image/png' });

    assert.equal(result.claimId, 'claim-1');
    assert.equal(result.status, 'CLEAR');
    assert.equal(result.bloomPositive, false);
    assert.equal(result.exactDuplicateOf, null);
    assert.equal(result.candidates.length, 0);
  });

  test('duplicate receipt bytes flag CANDIDATE with exactDuplicateOf', async () => {
    const bytes = Buffer.from('shared receipt bytes 999');

    // First submission
    const res1 = await screen({ claimId: 'claim-1', bytes, contentType: 'image/jpeg' });
    assert.equal(res1.status, 'CLEAR');

    // Second submission with different claimId
    const res2 = await screen({ claimId: 'claim-2', bytes, contentType: 'image/jpeg' });
    assert.equal(res2.status, 'CANDIDATE');
    assert.equal(res2.bloomPositive, true);
    assert.equal(res2.exactDuplicateOf, 'claim-1');
  });

  test('idempotent screening of the same claimId does not flag self as duplicate', async () => {
    const bytes = Buffer.from('receipt for retry 555');

    const res1 = await screen({ claimId: 'claim-retry', bytes });
    assert.equal(res1.status, 'CLEAR');

    const res2 = await screen({ claimId: 'claim-retry', bytes });
    assert.equal(res2.status, 'CLEAR');
    assert.equal(res2.exactDuplicateOf, null);
    assert.equal(res2.candidates.length, 0);
  });
});
