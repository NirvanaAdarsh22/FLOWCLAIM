import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hammingDistance } from '../src/similarity/hamming.js';
import { similarity } from '../src/similarity/similarity.js';

describe('Hamming distance and similarity boundary tests', () => {
  test('identical hashes have distance 0 and similarity 1.0', () => {
    const hash = 'a1b2c3d4e5f67890';
    assert.equal(hammingDistance(hash, hash), 0);
    assert.equal(similarity(hash, hash), 1.0);
  });

  test('completely inverted 64-bit hashes have distance 64 and similarity 0.0', () => {
    const h1 = '0000000000000000';
    const h2 = 'ffffffffffffffff';
    assert.equal(hammingDistance(h1, h2), 64);
    assert.equal(similarity(h1, h2), 0.0);
  });

  test('single bit difference has distance 1 and similarity 63/64', () => {
    const h1 = '0000000000000000';
    const h2 = '0000000000000001';
    assert.equal(hammingDistance(h1, h2), 1);
    assert.equal(similarity(h1, h2), 1 - 1 / 64);
  });

  test('case-insensitivity and whitespace trimming', () => {
    const h1 = '  A1B2C3D4E5F67890  ';
    const h2 = 'a1b2c3d4e5f67890';
    assert.equal(hammingDistance(h1, h2), 0);
  });

  test('throws error for invalid hash lengths', () => {
    assert.throws(() => hammingDistance('1234', '1234567890123456'), /must be exactly 16 hex characters/);
    assert.throws(() => hammingDistance(null, '1234567890123456'), TypeError);
  });

  test('similarity is clamped between 0 and 1', () => {
    const sim = similarity('0000000000000000', 'ffffffffffffffff');
    assert.ok(sim >= 0 && sim <= 1);
  });
});
