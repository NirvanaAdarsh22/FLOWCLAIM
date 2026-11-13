/**
 * @fileoverview Error taxonomy and retryable classification for Receipt Extraction.
 * Follows Master Development Document v1.1 (§3 receipt.js).
 * Plain JavaScript ESM only.
 */

import { EXTRACTION_FAILURE_CODES } from '../schemas/receipt.js';

/**
 * Returns true if the extraction failure code is transient and retryable by BullMQ.
 * Contract hard rule: ONLY 'MODEL_UNAVAILABLE' is retryable!
 *
 * @param {string} code
 * @returns {boolean}
 */
export function isRetryableExtractionCode(code) {
  return code === 'MODEL_UNAVAILABLE';
}

/**
 * Formats a standardized ExtractionResult error payload.
 *
 * @param {string} code
 * @param {string} message
 * @param {boolean} [retryable]
 * @returns {{ ok: false, code: string, message: string, retryable: boolean }}
 */
export function createExtractionError(code, message, retryable) {
  const isRetryable =
    typeof retryable === 'boolean' ? retryable : isRetryableExtractionCode(code);

  return {
    ok: false,
    code: EXTRACTION_FAILURE_CODES.includes(code) ? code : 'MALFORMED_OUTPUT',
    message,
    retryable: isRetryable,
  };
}

export class ExtractionError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {boolean} [retryable]
   */
  constructor(code, message, retryable) {
    super(message);
    this.name = 'ExtractionError';
    this.code = code;
    this.retryable = isRetryableExtractionCode(code);
  }
}
