/**
 * @file packages/fraud-engine/src/similarity/hamming.js
 * 64-bit bitwise Hamming distance computation.
 */

/**
 * Computes the Hamming distance (number of bit positions where bits differ)
 * between two 16-character hexadecimal dHash strings.
 *
 * @param {string} aHex - 16-char hex string
 * @param {string} bHex - 16-char hex string
 * @returns {number} Hamming distance in range [0, 64]
 */
export function hammingDistance(aHex, bHex) {
  if (typeof aHex !== 'string' || typeof bHex !== 'string') {
    throw new TypeError('Both hashes must be strings');
  }

  const cleanA = aHex.trim().toLowerCase();
  const cleanB = bHex.trim().toLowerCase();

  if (cleanA.length !== 16 || cleanB.length !== 16) {
    throw new Error(`Hashes must be exactly 16 hex characters. Got lengths ${cleanA.length} and ${cleanB.length}`);
  }

  // Parse as BigInt for 64-bit bitwise XOR
  const valA = BigInt(`0x${cleanA}`);
  const valB = BigInt(`0x${cleanB}`);
  let xor = valA ^ valB;

  // Popcount (Hamming weight) of the 64-bit XOR result
  let distance = 0;
  while (xor > 0n) {
    xor &= xor - 1n; // Clear the lowest set bit
    distance++;
  }

  return distance;
}
