/**
 * @file packages/fraud-engine/src/duplicate-check/hash-utils.js
 * Cryptographic hashing utilities for receipt files.
 */

import crypto from 'node:crypto';

/**
 * Computes standard SHA-256 hash of a buffer/Uint8Array.
 *
 * @param {Uint8Array|Buffer} bytes
 * @returns {string} 64-character lowercase hex string
 */
export function computeSha256(bytes) {
  if (!bytes || bytes.length === 0) {
    throw new Error('Cannot compute SHA-256 of empty bytes');
  }
  return crypto.createHash('sha256').update(bytes).digest('hex').toLowerCase();
}
