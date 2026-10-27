/**
 * @file packages/fraud-engine/src/duplicate-check/normalization.js
 * Normalization helpers for definitive post-extraction duplicate verification.
 */

/**
 * Normalizes merchant names: lowercase, trim, remove punctuation, collapse extra spaces.
 * E.g., "Starbucks Coffee, LLC." -> "starbucks coffee llc"
 *
 * @param {string} merchant
 * @returns {string}
 */
export function normalizeMerchant(merchant) {
  if (!merchant || typeof merchant !== 'string') return '';
  return merchant
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation keeping letters, numbers, spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes an ISO date string to YYYY-MM-DD.
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const match = dateStr.trim().match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : dateStr.trim();
}

/**
 * Compares two monetary amounts (in minor units, paise).
 *
 * @param {number} aMinor
 * @param {number} bMinor
 * @returns {boolean}
 */
export function areAmountsEqual(aMinor, bMinor) {
  if (typeof aMinor !== 'number' || typeof bMinor !== 'number') return false;
  return Math.round(aMinor) === Math.round(bMinor);
}
