import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeDHash } from '../src/dhash/dhash.js';
import { resampleGrayscale } from '../src/dhash/image-utils.js';

describe('dHash computation tests', () => {
  test('computes exactly 16-hex characters for raw 72-byte buffer', async () => {
    const raw = new Uint8Array(72);
    // Create horizontal gradient: left high, right low
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 9; col++) {
        raw[row * 9 + col] = 255 - col * 25;
      }
    }

    const hash = await computeDHash(raw);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 16);
    // Every col comparison left > right should be 1
    // 8 bits of 1 = 0xff, repeated 8 times = "ffffffffffffffff"
    assert.equal(hash, 'ffffffffffffffff');
  });

  test('computes 0000000000000000 when left < right everywhere', async () => {
    const raw = new Uint8Array(72);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 9; col++) {
        raw[row * 9 + col] = col * 25;
      }
    }

    const hash = await computeDHash(raw);
    assert.equal(hash, '0000000000000000');
  });

  test('throws on empty or null buffer', async () => {
    await assert.rejects(async () => computeDHash(new Uint8Array(0)), /cannot be empty/);
    await assert.rejects(async () => computeDHash(null), /cannot be empty/);
  });

  test('resampleGrayscale correctly shrinks 18x16 to 9x8', () => {
    const src = new Uint8Array(18 * 16).fill(128);
    const dst = resampleGrayscale(src, 18, 16, 9, 8);
    assert.equal(dst.length, 72);
    assert.equal(dst[0], 128);
  });
});
