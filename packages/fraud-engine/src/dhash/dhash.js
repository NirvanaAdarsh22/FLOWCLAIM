/**
 * @file packages/fraud-engine/src/dhash/dhash.js
 * Implementation of the 64-bit Difference Hash (dHash) algorithm.
 *
 * Algorithm details:
 * 1. Decode and downsample image to a 9x8 grayscale matrix (72 pixels).
 * 2. Compare adjacent horizontal pixels (P[x] > P[x+1]) across each of the 8 rows.
 * 3. 8 rows * 8 comparisons = 64 bits.
 * 4. Encode as a 16-character lowercase hexadecimal string (zero-padded).
 */

import { decodeToGrayscaleGrid } from './image-utils.js';

/**
 * Computes a 64-bit difference hash (dHash) from image bytes.
 *
 * @param {Uint8Array|Buffer} imageBytes
 * @returns {Promise<string>} 16-character hex string representing 64-bit hash
 */
export async function computeDHash(imageBytes) {
  if (!imageBytes || imageBytes.length === 0) {
    throw new Error('Image bytes cannot be empty');
  }

  // Ensure 9x8 grayscale grid (72 pixel luminance values, 0-255)
  const grid = await decodeToGrayscaleGrid(imageBytes, 9, 8);

  let high32 = 0;
  let low32 = 0;
  let bitIndex = 0;

  for (let row = 0; row < 8; row++) {
    const rowOffset = row * 9;
    for (let col = 0; col < 8; col++) {
      const left = grid[rowOffset + col];
      const right = grid[rowOffset + col + 1];
      const bit = left > right ? 1 : 0;

      if (bitIndex < 32) {
        high32 = (high32 << 1) | bit;
      } else {
        low32 = (low32 << 1) | bit;
      }
      bitIndex++;
    }
  }

  // Convert to unsigned 32-bit integers and format as 16-char hex
  const highHex = (high32 >>> 0).toString(16).padStart(8, '0');
  const lowHex = (low32 >>> 0).toString(16).padStart(8, '0');

  return `${highHex}${lowHex}`.toLowerCase();
}
