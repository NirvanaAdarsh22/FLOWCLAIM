/**
 * @fileoverview Multimodal receipt extractor factory using Google Gemini API.
 * Follows Master Development Document v1.1 (§6.2).
 * Plain JavaScript ESM only.
 */

import {
  SUPPORTED_CONTENT_TYPES,
  GEMINI_RECEIPT_JSON_SCHEMA,
} from '../schemas/receipt.js';
import { EXTRACTION_SYSTEM_INSTRUCTION } from '../validation/prompt-safety.js';
import { validateExtraction } from '../validation/validator.js';
import { createExtractionError } from './errors.js';
import { GeminiUnavailableError } from '../gemini/client.js';

/**
 * Creates a receipt extractor instance adhering to GeminiClientPort and ExtractionResult contracts.
 *
 * @param {object} params
 * @param {import('../gemini/client.js').GeminiClientPort | any} params.client
 * @param {object} params.config
 * @param {string} [params.config.model='gemini-1.5-flash']
 * @param {number} [params.config.totalToleranceMinor=0]
 * @returns {{
 *   extract: (req: { claimId: string, bytes: Uint8Array, contentType: string }) => Promise<any>
 * }}
 */
export function createReceiptExtractor({ client, config = {} }) {
  if (!client || typeof client.generateFromFile !== 'function') {
    throw new Error("createReceiptExtractor requires a client implementing 'generateFromFile'");
  }

  const model = config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const totalToleranceMinor = typeof config.totalToleranceMinor === 'number' ? config.totalToleranceMinor : 0;

  return {
    /**
     * Extracts structured receipt data from image/pdf bytes.
     *
     * @param {{ claimId: string, bytes: Uint8Array, contentType: string }} req
     * @returns {Promise<import('@flowclaim/shared-types').ExtractionResult | any>}
     */
    async extract({ claimId, bytes, contentType }) {
      // 1. Verify content type
      if (!contentType || !SUPPORTED_CONTENT_TYPES.includes(contentType)) {
        return createExtractionError(
          'UNSUPPORTED_FILE',
          `Unsupported receipt content type '${contentType}'. Allowed types: ${SUPPORTED_CONTENT_TYPES.join(', ')}`,
          false
        );
      }

      // 2. Verify bytes buffer
      if (!bytes || !(bytes instanceof Uint8Array) || bytes.length === 0) {
        return createExtractionError(
          'MALFORMED_OUTPUT',
          'Receipt file bytes buffer is missing or empty',
          false
        );
      }

      // 3. Invoke multimodal Gemini model
      let response;
      try {
        const prompt = `Extract all financial details from this receipt for Claim ${claimId}. Return exact values in minor units (paise) conforming strictly to the requested schema.`;
        response = await client.generateFromFile({
          model,
          systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
          prompt,
          file: {
            bytes,
            mimeType: contentType,
          },
          responseJsonSchema: GEMINI_RECEIPT_JSON_SCHEMA,
        });
      } catch (err) {
        if (err instanceof GeminiUnavailableError || err.retryable || err.code === 'MODEL_UNAVAILABLE') {
          return createExtractionError(
            'MODEL_UNAVAILABLE',
            `Gemini multimodal extraction service unavailable: ${err.message}`,
            true
          );
        }
        return createExtractionError(
          'MODEL_UNAVAILABLE',
          `Extraction model error: ${err.message}`,
          true
        );
      }

      // 4. Parse JSON text
      let rawJson;
      try {
        const rawText = response.text ? response.text.trim() : '';
        // Handle code block wrapping if model returned markdown fenced JSON
        const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        rawJson = JSON.parse(cleanedText);
      } catch (parseErr) {
        return createExtractionError(
          'MALFORMED_OUTPUT',
          `Failed to parse model response as JSON: ${parseErr.message}`,
          false
        );
      }

      // 5. Strict schema, mathematical totals & prompt safety validation
      const validation = validateExtraction(rawJson, {
        totalToleranceMinor,
        now: new Date().toISOString(),
      });

      if (!validation.ok) {
        return createExtractionError(
          validation.code,
          validation.message,
          false
        );
      }

      const validData = validation.data;

      // 6. Return standardized ReceiptExtraction
      return {
        ok: true,
        data: {
          merchant: validData.merchant,
          transactionDate: validData.transactionDate,
          currency: 'INR',
          subtotalMinor: typeof validData.subtotalMinor === 'number' ? validData.subtotalMinor : null,
          taxMinor: validData.taxMinor,
          totalMinor: validData.totalMinor,
          lineItems: Array.isArray(validData.lineItems) ? validData.lineItems : [],
          fieldConfidence: validData.fieldConfidence || {
            merchant: 0.95,
            totalMinor: 0.98,
            transactionDate: 0.92,
          },
          modelId: model,
          extractedAt: new Date().toISOString(),
        },
      };
    },
  };
}
