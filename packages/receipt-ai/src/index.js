/**
 * @fileoverview Public entry point for @flowclaim/receipt-ai.
 * Implements Master Development Document v1.1 (§6.2).
 * Plain JavaScript ESM only.
 */

export { createReceiptExtractor } from './extraction/extractor.js';
export { createBreachSummarizer } from './extraction/summarizer.js';
export {
  GeminiUnavailableError,
  MockGeminiClient,
  GoogleGeminiClient,
} from './gemini/client.js';
export {
  createExtractionError,
  isRetryableExtractionCode,
  ExtractionError,
} from './extraction/errors.js';
export { validateExtraction } from './validation/validator.js';
export {
  EXTRACTION_SYSTEM_INSTRUCTION,
  sanitizeText,
  detectPromptInjection,
} from './validation/prompt-safety.js';
export {
  SUPPORTED_CONTENT_TYPES,
  EXTRACTION_FAILURE_CODES,
  GEMINI_RECEIPT_JSON_SCHEMA,
  validateReceiptShape,
  validateLineItemShape,
} from './schemas/receipt.js';
