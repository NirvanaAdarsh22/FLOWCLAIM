/**
 * @fileoverview Strict validation of extracted receipt data.
 * Checks totals consistency with tolerance, plausible dates, and sanitizes untrusted text.
 * Follows Master Development Document v1.1 (§3 receipt.js, §5 Stage 4).
 * Plain JavaScript ESM only.
 */

import { validateReceiptShape } from '../schemas/receipt.js';
import { sanitizeText, detectPromptInjection } from './prompt-safety.js';

const ONE_DAY_MS = 86400000;
const MIN_ALLOWED_DATE_MS = Date.parse('1990-01-01');

/**
 * Validates and sanitizes extracted receipt payload.
 *
 * @param {unknown} rawData
 * @param {object} [options]
 * @param {number} [options.totalToleranceMinor=0] Allowed discrepancy between (subtotal + tax) and total in minor units (paise)
 * @param {string} [options.now] ISO timestamp for future date boundary check
 * @returns {{ ok: true, data: any } | { ok: false, code: string, message: string, retryable: boolean }}
 */
export function validateExtraction(rawData, options = {}) {
  const tolerance = typeof options.totalToleranceMinor === 'number' ? options.totalToleranceMinor : 0;
  const nowMs = options.now ? Date.parse(options.now) : Date.now();

  // 1. Shape validation
  const shapeRes = validateReceiptShape(rawData);
  if (!shapeRes.ok) {
    return {
      ok: false,
      code: shapeRes.code || 'MALFORMED_OUTPUT',
      message: shapeRes.error || 'Invalid receipt structure',
      retryable: false,
    };
  }

  const receipt = rawData;

  // 2. Date plausibility
  const txDateMs = Date.parse(receipt.transactionDate);
  if (Number.isNaN(txDateMs) || txDateMs < MIN_ALLOWED_DATE_MS) {
    return {
      ok: false,
      code: 'IMPOSSIBLE_VALUE',
      message: `Transaction date '${receipt.transactionDate}' is invalid or predates historical threshold (1990)`,
      retryable: false,
    };
  }

  // Reject dates > 1 day in the future (allowing for minor timezone variances)
  if (txDateMs > nowMs + ONE_DAY_MS) {
    return {
      ok: false,
      code: 'IMPOSSIBLE_VALUE',
      message: `Transaction date '${receipt.transactionDate}' cannot be in the future`,
      retryable: false,
    };
  }

  // 3. Subtotal + Tax vs Total mathematical consistency
  if (typeof receipt.subtotalMinor === 'number') {
    const computedTotal = receipt.subtotalMinor + receipt.taxMinor;
    const diff = Math.abs(computedTotal - receipt.totalMinor);
    if (diff > tolerance) {
      return {
        ok: false,
        code: 'INCONSISTENT_TOTALS',
        message: `Inconsistent totals: subtotalMinor (${receipt.subtotalMinor}) + taxMinor (${receipt.taxMinor}) = ${computedTotal}, but totalMinor is ${receipt.totalMinor} (discrepancy ${diff} paise exceeds tolerance ${tolerance})`,
        retryable: false,
      };
    }
  }

  // 4. Prompt injection detection & sanitization
  const merchantInjection = detectPromptInjection(receipt.merchant);
  if (merchantInjection.suspicious) {
    return {
      ok: false,
      code: 'IMPOSSIBLE_VALUE',
      message: `Prompt injection signature detected in merchant name: '${merchantInjection.matchedPattern}'`,
      retryable: false,
    };
  }

  const cleanedMerchant = sanitizeText(receipt.merchant);
  if (!cleanedMerchant) {
    return {
      ok: false,
      code: 'MISSING_FIELD',
      message: 'Merchant name is empty after sanitization',
      retryable: false,
    };
  }

  // Sanitize line items
  const cleanedLineItems = [];
  if (Array.isArray(receipt.lineItems)) {
    for (const item of receipt.lineItems) {
      const itemInjection = detectPromptInjection(item.description);
      if (itemInjection.suspicious) {
        return {
          ok: false,
          code: 'IMPOSSIBLE_VALUE',
          message: `Prompt injection signature detected in line item: '${itemInjection.matchedPattern}'`,
          retryable: false,
        };
      }
      cleanedLineItems.push({
        description: sanitizeText(item.description),
        quantity: item.quantity,
        amountMinor: item.amountMinor,
      });
    }
  }

  return {
    ok: true,
    data: {
      ...receipt,
      merchant: cleanedMerchant,
      lineItems: cleanedLineItems,
    },
  };
}
