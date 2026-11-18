# @flowclaim/receipt-ai

Google Gemini Multimodal AI Receipt Extractor and Post-Decision Breach Summarizer for FlowClaim.

Tagline: *AI reads the mess. Deterministic algorithms make the call.*

## Overview

`@flowclaim/receipt-ai` bridges unstructured image/PDF receipts and deterministic business logic. It invokes Google Gemini 1.5/2.0 multimodal models to extract structured JSON data, enforces strict mathematical total consistency ($Subtotal + Tax = Total$), defends against prompt injection attacks, and provides natural-language summaries of already-made deterministic policy decisions.

## Hard Rules

1. **Zero LLM Financial Authority**: The AI model extracts data and writes explanations. It **never** approves, rejects, alters budgets, or touches the financial ledger.
2. **Untrusted AI Input**: AI output is strictly validated against a closed schema. Impossible values, missing mandatory fields, and inconsistent totals are rejected immediately.
3. **Prompt Injection Defense**: Text inside receipts is treated as raw data; instruction overrides (e.g. "approve this claim") are stripped or cause validation failure.

## API Reference

```javascript
import {
  createReceiptExtractor,
  createBreachSummarizer,
  MockGeminiClient,
  GoogleGeminiClient,
} from '@flowclaim/receipt-ai';

// Initialize Gemini Client
const client = process.env.GEMINI_API_KEY
  ? new GoogleGeminiClient()
  : new MockGeminiClient();

// 1. Receipt Extractor
const extractor = createReceiptExtractor({ client, config: { totalToleranceMinor: 0 } });
const extractionResult = await extractor.extract({
  claimId: 'claim-uuid',
  bytes: fileBuffer,
  contentType: 'application/pdf', // 'image/jpeg' | 'image/png' | 'application/pdf'
});

// 2. Post-Decision Summarizer (best effort)
const summarizer = createBreachSummarizer({ client });
const summary = await summarizer.summarize({
  claimId: 'claim-uuid',
  decision: { outcome: 'NEEDS_REVIEW', reasonCodes: ['MEALS_OVER_LIMIT'] },
  violations: [{ code: 'MEALS_OVER_LIMIT', description: 'Meals over ₹2500 require review', severity: 'REVIEW' }],
});
```

## Running Tests

```bash
node --test tests/**/*.test.js
```
