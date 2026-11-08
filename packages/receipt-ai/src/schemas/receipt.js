/**
 * @fileoverview Closed schema definitions for Receipt Extraction.
 * Follows Master Development Document v1.1 (§3 receipt.js).
 * Plain JavaScript ESM only.
 */

export const SUPPORTED_CONTENT_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

export const EXTRACTION_FAILURE_CODES = Object.freeze([
  'MALFORMED_OUTPUT',
  'MISSING_FIELD',
  'IMPOSSIBLE_VALUE',
  'INCONSISTENT_TOTALS',
  'UNSUPPORTED_FILE',
  'MODEL_UNAVAILABLE',
]);

/**
 * Validates a single line item structure.
 * @param {unknown} item
 * @param {number} idx
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateLineItemShape(item, idx) {
  if (!item || typeof item !== 'object') {
    return { ok: false, error: `Line item at index ${idx} must be an object` };
  }

  if (typeof item.description !== 'string' || !item.description.trim()) {
    return { ok: false, error: `Line item at index ${idx} must have non-empty description` };
  }

  if (
    typeof item.quantity !== 'number' ||
    !Number.isFinite(item.quantity) ||
    item.quantity <= 0
  ) {
    return { ok: false, error: `Line item at index ${idx} must have positive quantity` };
  }

  if (
    typeof item.amountMinor !== 'number' ||
    !Number.isInteger(item.amountMinor) ||
    item.amountMinor < 0
  ) {
    return { ok: false, error: `Line item at index ${idx} must have non-negative integer amountMinor (paise)` };
  }

  return { ok: true };
}

/**
 * Validates the raw extracted receipt object against strict field requirements.
 * @param {unknown} data
 * @returns {{ ok: boolean, error?: string, code?: string }}
 */
export function validateReceiptShape(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      ok: false,
      code: 'MALFORMED_OUTPUT',
      error: 'Extraction output must be a valid JSON object',
    };
  }

  // 1. Mandatory merchant check
  if (typeof data.merchant !== 'string' || !data.merchant.trim()) {
    return {
      ok: false,
      code: 'MISSING_FIELD',
      error: "Mandatory field 'merchant' is missing or empty",
    };
  }

  // 2. Transaction date check (YYYY-MM-DD)
  if (
    typeof data.transactionDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.transactionDate) ||
    Number.isNaN(Date.parse(data.transactionDate))
  ) {
    return {
      ok: false,
      code: 'IMPOSSIBLE_VALUE',
      error: "Field 'transactionDate' must be a valid ISO date in YYYY-MM-DD format",
    };
  }

  // 3. Currency check
  if (typeof data.currency !== 'string' || data.currency.trim() !== 'INR') {
    return {
      ok: false,
      code: 'IMPOSSIBLE_VALUE',
      error: "Currency must be 'INR'",
    };
  }

  // 4. Total check
  if (
    typeof data.totalMinor !== 'number' ||
    !Number.isInteger(data.totalMinor) ||
    data.totalMinor < 0
  ) {
    return {
      ok: false,
      code: 'IMPOSSIBLE_VALUE',
      error: "'totalMinor' must be a non-negative integer in minor units (paise)",
    };
  }

  // 5. Tax check
  if (
    typeof data.taxMinor !== 'number' ||
    !Number.isInteger(data.taxMinor) ||
    data.taxMinor < 0
  ) {
    return {
      ok: false,
      code: 'IMPOSSIBLE_VALUE',
      error: "'taxMinor' must be a non-negative integer in minor units (paise)",
    };
  }

  // 6. Subtotal check
  if (data.subtotalMinor !== null && data.subtotalMinor !== undefined) {
    if (
      typeof data.subtotalMinor !== 'number' ||
      !Number.isInteger(data.subtotalMinor) ||
      data.subtotalMinor < 0
    ) {
      return {
        ok: false,
        code: 'IMPOSSIBLE_VALUE',
        error: "'subtotalMinor' when present must be a non-negative integer in minor units (paise)",
      };
    }
  }

  // 7. Line items array check
  if (data.lineItems !== undefined && !Array.isArray(data.lineItems)) {
    return {
      ok: false,
      code: 'MALFORMED_OUTPUT',
      error: "'lineItems' must be an array if present",
    };
  }

  if (Array.isArray(data.lineItems)) {
    for (let i = 0; i < data.lineItems.length; i++) {
      const lineRes = validateLineItemShape(data.lineItems[i], i);
      if (!lineRes.ok) {
        return {
          ok: false,
          code: 'IMPOSSIBLE_VALUE',
          error: lineRes.error,
        };
      }
    }
  }

  return { ok: true };
}

/**
 * Strict JSON Schema definition for Gemini response_schema / responseJsonSchema.
 */
export const GEMINI_RECEIPT_JSON_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    merchant: { type: 'string', description: 'Name of the vendor or merchant' },
    transactionDate: { type: 'string', description: 'Date of transaction in YYYY-MM-DD format' },
    currency: { type: 'string', enum: ['INR'], description: 'ISO 4217 Currency code, must be INR' },
    subtotalMinor: { type: 'integer', description: 'Pre-tax amount in minor units (paise). e.g. Rs 100.50 = 10050' },
    taxMinor: { type: 'integer', description: 'Tax amount in minor units (paise). e.g. Rs 5.00 = 500' },
    totalMinor: { type: 'integer', description: 'Final total amount in minor units (paise)' },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          amountMinor: { type: 'integer' },
        },
        required: ['description', 'quantity', 'amountMinor'],
      },
    },
    fieldConfidence: {
      type: 'object',
      description: 'Confidence score (0.0 to 1.0) for extracted fields like merchant, totalMinor',
      properties: {
        merchant: { type: 'number' },
        totalMinor: { type: 'number' },
        transactionDate: { type: 'number' },
      },
    },
  },
  required: ['merchant', 'transactionDate', 'currency', 'taxMinor', 'totalMinor'],
});
