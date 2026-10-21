import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryFingerprintStore } from '../src/bloom-filter/memory-store.js';

describe('FingerprintStore contract and operations', () => {
  let store;

  beforeEach(() => {
    store = createMemoryFingerprintStore();
  });

  test('bloomAddSha256 and bloomHasSha256', async () => {
    const sha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    assert.equal(await store.bloomHasSha256(sha), false);
    await store.bloomAddSha256(sha);
    assert.equal(await store.bloomHasSha256(sha), true);
  });

  test('sha256 to claimId mapping', async () => {
    const sha = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    assert.equal(await store.getClaimIdBySha256(sha), null);
    await store.setClaimIdBySha256(sha, 'claim-uuid-001');
    assert.equal(await store.getClaimIdBySha256(sha), 'claim-uuid-001');
  });

  test('dHash candidate lookup by distance threshold', async () => {
    const baseHash = '0000000000000000';
    await store.addDhash('claim-exact', '0000000000000000'); // dist 0
    await store.addDhash('claim-close-1', '0000000000000001'); // dist 1
    await store.addDhash('claim-close-3', '0000000000000007'); // dist 3 (bits: 0111)
    await store.addDhash('claim-far', 'ffffffffffffffff'); // dist 64

    // Threshold 2 should match claim-exact and claim-close-1
    const candidates2 = await store.findDhashCandidates(baseHash, 2);
    assert.equal(candidates2.length, 2);
    assert.equal(candidates2[0].claimId, 'claim-exact');
    assert.equal(candidates2[0].hammingDistance, 0);
    assert.equal(candidates2[1].claimId, 'claim-close-1');
    assert.equal(candidates2[1].hammingDistance, 1);

    // Threshold 5 should match claim-exact, claim-close-1, and claim-close-3
    const candidates5 = await store.findDhashCandidates(baseHash, 5);
    assert.equal(candidates5.length, 3);
  });
});
