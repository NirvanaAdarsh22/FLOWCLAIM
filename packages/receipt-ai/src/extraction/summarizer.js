/**
 * @fileoverview Post-decision natural language breach summarizer.
 * Hard Rule: AI explains already-made decisions. It never decides, approves, or rejects.
 * Follows Master Development Document v1.1 (§1, §6.2).
 * Plain JavaScript ESM only.
 */

/**
 * Creates a post-decision breach summarizer.
 *
 * @param {object} params
 * @param {import('../gemini/client.js').GeminiClientPort | any} params.client
 * @param {object} params.config
 * @param {string} [params.config.model='gemini-1.5-flash']
 * @returns {{
 *   summarize: (req: {
 *     claimId: string,
 *     decision: { outcome: string, reasonCodes: string[] },
 *     violations: Array<{ code: string, description: string, severity: string }>,
 *     anomaly?: { flagged: boolean, explanation?: string }
 *   }) => Promise<{ text: string, modelId: string, generatedAt: string }>
 * }}
 */
export function createBreachSummarizer({ client, config = {} }) {
  if (!client || typeof client.generateText !== 'function') {
    throw new Error("createBreachSummarizer requires a client implementing 'generateText'");
  }

  const model = config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  return {
    /**
     * Generates a concise natural language summary of the deterministic decision.
     *
     * @param {{
     *   claimId: string,
     *   decision: { outcome: string, reasonCodes: string[] },
     *   violations: Array<{ code: string, description: string, severity: string }>,
     *   anomaly?: { flagged: boolean, explanation?: string }
     * }} req
     * @returns {Promise<{ text: string, modelId: string, generatedAt: string }>}
     */
    async summarize({ claimId, decision, violations = [], anomaly }) {
      const generatedAt = new Date().toISOString();

      // If approved with no violations
      if (decision.outcome === 'APPROVED' && violations.length === 0 && (!anomaly || !anomaly.flagged)) {
        return {
          text: `Claim ${claimId} successfully cleared all automated compliance and budget validations.`,
          modelId: 'system-deterministic',
          generatedAt,
        };
      }

      // Format violations list for prompt and fallback
      const violationLines = violations.map(
        (v) => `• [${v.severity}] ${v.code}: ${v.description}`
      );

      if (anomaly && anomaly.flagged && anomaly.explanation) {
        violationLines.push(`• [ANOMALY] ${anomaly.explanation}`);
      }

      const deterministicFallback =
        violationLines.length > 0
          ? `Decision: ${decision.outcome}. Violations: ${violationLines.join(' ')}`
          : `Decision: ${decision.outcome} due to reason codes: ${decision.reasonCodes.join(', ')}`;

      // System instruction enforcing non-authoritative explanatory summary
      const systemInstruction = `You are an automated corporate compliance assistant explaining a completed expense claim audit.
The deterministic decision has ALREADY been finalized by algorithmic policy checks.
Your task is solely to synthesize the already-detected violations into a polite, clear, 1-2 sentence executive explanation for the employee and manager.
DO NOT approve, reject, or modify the decision under any circumstances.`;

      const prompt = `Summarize these already-determined expense policy violations for Claim ${claimId} (Final Outcome: ${decision.outcome}):
Violations:
${violationLines.join('\n')}

Reason Codes: ${decision.reasonCodes.join(', ')}`;

      try {
        const response = await client.generateText({
          model,
          systemInstruction,
          prompt,
        });

        const text = response.text ? response.text.trim() : deterministicFallback;
        return {
          text,
          modelId: model,
          generatedAt,
        };
      } catch {
        // Best effort: if AI call fails, return the deterministic explanation without error
        return {
          text: deterministicFallback,
          modelId: 'fallback-deterministic',
          generatedAt,
        };
      }
    },
  };
}
