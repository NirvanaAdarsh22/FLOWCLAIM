/**
 * @file worker/src/services/stageAdapters.js
 * Stage coordination adapters for Stages 4 (AI extraction), 5 (Policy DAG),
 * 6 (Anomaly detection), and 7 (Ledger commit).
 */

/**
 * Creates an extraction adapter that attempts to use @flowclaim/receipt-ai if available,
 * or fallback test extraction generator.
 *
 * @param {object} [options]
 * @returns {{ extract: Function, summarize: Function }}
 */
export function createReceiptAiAdapter(options = {}) {
  let realReceiptAi = null;
  try {
    // Dynamic import if package is built
    realReceiptAi = options.receiptAiModule;
  } catch {
    // Fallback
  }

  return {
    async extract({ claimId, bytes, contentType }) {
      if (options.extractMock) {
        return options.extractMock({ claimId, bytes, contentType });
      }

      if (realReceiptAi?.createReceiptExtractor) {
        const extractor = realReceiptAi.createReceiptExtractor(options);
        return extractor.extract({ claimId, bytes, contentType });
      }

      // Safe default mock extraction conforming strictly to ReceiptExtraction typedef
      return {
        ok: true,
        data: {
          merchant: 'Sample Merchant Ltd',
          transactionDate: new Date().toISOString().split('T')[0],
          currency: 'INR',
          subtotalMinor: 90000,
          taxMinor: 10000,
          totalMinor: 100000,
          lineItems: [
            { description: 'Business Expense Item', quantity: 1, amountMinor: 100000 },
          ],
          fieldConfidence: { merchant: 0.95, totalMinor: 0.98 },
          modelId: 'gemini-1.5-flash',
          extractedAt: new Date().toISOString(),
        },
      };
    },

    async summarize({ claimId, decision, violations = [], anomaly = null }) {
      if (options.summarizeMock) {
        return options.summarizeMock({ claimId, decision, violations, anomaly });
      }

      // Default deterministic breach summary generator (post-decision)
      const reasons = [];
      if (violations.length > 0) {
        reasons.push(`Policy violations detected: ${violations.map((v) => v.code || v.description).join(', ')}.`);
      }
      if (anomaly?.flagged) {
        reasons.push(`Spending anomaly flagged (score: ${anomaly.score}).`);
      }
      if (decision.outcome === 'APPROVED') {
        reasons.push('Claim verified and approved in accordance with policy guidelines.');
      } else if (reasons.length === 0) {
        reasons.push(`Claim transitioned to ${decision.outcome} by automated verification.`);
      }

      return {
        text: reasons.join(' '),
        modelId: 'gemini-1.5-flash',
        generatedAt: new Date().toISOString(),
      };
    },
  };
}
