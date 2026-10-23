import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryFingerprintStore } from '../src/bloom-filter/memory-store.js';
import { computeSha256 } from '../src/duplicate-check/hash-utils.js';

describe('Bloom filter pre-screening and exact duplicate tests', () => {
  let store;

  beforeEach(() => {
    store = createMemoryFingerprintStore();
  });

  test('fresh receipt SHA256 passes bloom check with false', async () => {
    const receiptBytes = Buffer.from('receipt content 123');
    const sha = computeSha256(receiptBytes);

    const has = await store.bloomHasSha256(sha);
    assert.equal(has, false, 'Unseen hash should return false from Bloom check');
  });

  test('exact duplicate SHA256 returns original claim ID', async () => {
    const receiptBytes = Buffer.from('monthly uber receipt 987');
    const sha = computeSha256(receiptBytes);

    await store.bloomAddSha256(sha);
    await store.setClaimIdBySha256(sha, 'claim-original-uuid');

    // Second submission with exact same receipt
    const isBloomPositive = await store.bloomHasSha256(sha);
    assert.equal(isBloomPositive, true);

    const originalClaimId = await store.getClaimIdBySha256(sha);
    assert.equal(originalClaimId, 'claim-original-uuid');
  });

  test('bloom filter positive is not auto-rejection', async () => {
    // Contract requirement: Bloom filter can produce false positives.
    // A positive bloom check requires secondary verification, never instant rejection.
    const fakePositiveSha = '0000000000000000000000000000000000000000000000000000000000000001';
    await store.bloomAddSha256(fakePositiveSha);

    const check = await store.bloomHasSha256(fakePositiveSha);
    assert.equal(check, true);
    // Notice: if there is no exact claim mapping, it means it's a false positive or not yet mapped
    const claim = await store.getClaimIdBySha256(fakePositiveSha);
    assert.equal(claim, null);
  });
});
