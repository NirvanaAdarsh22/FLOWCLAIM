/**
 * @file worker/src/processors/processClaim.js
 * Core processor for the 'process-claim' job.
 * Coordinates multi-stage expense claim processing through Stage 8 (AI Summary).
 */

import { resolveDeterministicDecision } from '../services/decision/decisionResolver.js';

/**
 * Creates the processClaim job processor.
 *
 * @param {object} dependencies
 * @param {import('@flowclaim/shared-types').ClaimStatePort} dependencies.claimState
 * @param {import('@flowclaim/shared-types').ReceiptStoragePort} dependencies.storage
 * @param {any} dependencies.fraudEngine
 * @param {any} dependencies.receiptAi
 * @param {any} [dependencies.policyEngine]
 * @param {any} [dependencies.anomalyEngine]
 * @param {any} [dependencies.ledger]
 * @returns {Function} BullMQ processor function
 */
export function createProcessClaimProcessor(dependencies) {
  const {
    claimState,
    storage,
    fraudEngine,
    receiptAi,
    policyEngine,
    anomalyEngine,
    ledger,
  } = dependencies;

  return async function processClaimJob(job) {
    const { claimId } = job.data;
    if (!claimId) throw new Error('Missing claimId in process-claim job payload');

    // 1. Fetch current claim context
    const context = await claimState.getProcessingContext(claimId);
    if (!context) {
      throw new Error(`Claim '${claimId}' not found in backend`);
    }

    if (['APPROVED', 'REJECTED', 'PROCESSING_FAILED'].includes(context.status)) {
      return { claimId, status: context.status, skipped: true };
    }

    // 2. Stage 2: Transition QUEUED -> SCREENING
    if (context.status === 'QUEUED') {
      await claimState.transition({
        claimId,
        from: 'QUEUED',
        to: 'SCREENING',
        transitionKey: `claim:${claimId}:transition:QUEUED-SCREENING`,
        actor: 'SYSTEM',
      });
    }

    const receiptObj = await storage.getObject(context.receipt.objectKey);
    const fraudScreen = await fraudEngine.screen({
      claimId,
      bytes: receiptObj.bytes,
      contentType: receiptObj.contentType || context.receipt.contentType,
    });

    await claimState.saveStageResult(claimId, 'fraud', { screen: fraudScreen });

    // 3. Stage 4: Transition SCREENING -> PARSING
    await claimState.transition({
      claimId,
      from: 'SCREENING',
      to: 'PARSING',
      transitionKey: `claim:${claimId}:transition:SCREENING-PARSING`,
      actor: 'SYSTEM',
    });

    const extractionResult = await receiptAi.extract({
      claimId,
      bytes: receiptObj.bytes,
      contentType: receiptObj.contentType || context.receipt.contentType,
    });

    await claimState.saveStageResult(claimId, 'extraction', extractionResult);

    if (!extractionResult.ok) {
      if (extractionResult.retryable) {
        throw new Error(`Retryable extraction failure: ${extractionResult.message}`);
      }
      await claimState.transition({
        claimId,
        from: 'PARSING',
        to: 'NEEDS_REVIEW',
        transitionKey: `claim:${claimId}:transition:PARSING-NEEDS_REVIEW:extraction-invalid`,
        reason: `EXTRACTION_INVALID: ${extractionResult.message}`,
        actor: 'SYSTEM',
      });
      return { claimId, status: 'NEEDS_REVIEW', reason: 'EXTRACTION_INVALID' };
    }

    // 4. Duplicate Verification
    const duplicateVerification = await fraudEngine.verify({
      claimId,
      screen: fraudScreen,
      extraction: extractionResult.data,
      lookup: claimState,
    });

    await claimState.saveStageResult(claimId, 'fraud', {
      screen: fraudScreen,
      verification: duplicateVerification,
    });

    if (
      duplicateVerification.verdict === 'CONFIRMED_DUPLICATE' ||
      duplicateVerification.verdict === 'NEEDS_REVIEW'
    ) {
      await claimState.transition({
        claimId,
        from: 'PARSING',
        to: 'POSSIBLE_DUPLICATE',
        transitionKey: `claim:${claimId}:transition:PARSING-POSSIBLE_DUPLICATE`,
        reason: `Duplicate detected (${duplicateVerification.verdict}) against claim ${duplicateVerification.matchedClaimId}`,
        actor: 'SYSTEM',
      });
      return { claimId, status: 'POSSIBLE_DUPLICATE', duplicateVerification };
    }

    // 5. Stage 5: Policy Evaluation
    await claimState.transition({
      claimId,
      from: 'PARSING',
      to: 'POLICY_CHECK',
      transitionKey: `claim:${claimId}:transition:PARSING-POLICY_CHECK`,
      actor: 'SYSTEM',
    });

    let policyResult = {
      policyId: 'default-active-policy',
      policyVersion: 1,
      outcome: 'PASS',
      executionOrder: [],
      ruleResults: [],
      violations: [],
      evaluatedAt: new Date().toISOString(),
    };

    if (policyEngine?.evaluatePolicy) {
      const activePolicy = await claimState.getActivePolicy();
      policyResult = policyEngine.evaluatePolicy({
        policy: activePolicy,
        facts: {
          claim: {
            category: context.category,
            claimedAmountMinor: context.claimedAmountMinor,
            employeeRole: context.employeeRole,
            businessPurpose: context.businessPurpose,
          },
          receipt: extractionResult.data,
          now: new Date().toISOString(),
        },
      });
    }

    await claimState.saveStageResult(claimId, 'policy', policyResult);

    if (policyResult.outcome === 'BLOCKED') {
      await claimState.transition({
        claimId,
        from: 'POLICY_CHECK',
        to: 'REJECTED',
        transitionKey: `claim:${claimId}:transition:POLICY_CHECK-REJECTED`,
        reason: `Policy BLOCKED: ${policyResult.violations.map((v) => v.code).join(', ')}`,
        actor: 'SYSTEM',
      });
      return { claimId, status: 'REJECTED', policyResult };
    }

    if (policyResult.outcome === 'REVIEW_REQUIRED') {
      await claimState.transition({
        claimId,
        from: 'POLICY_CHECK',
        to: 'NEEDS_REVIEW',
        transitionKey: `claim:${claimId}:transition:POLICY_CHECK-NEEDS_REVIEW`,
        reason: `Policy REVIEW_REQUIRED: ${policyResult.violations.map((v) => v.code).join(', ')}`,
        actor: 'SYSTEM',
      });
      return { claimId, status: 'NEEDS_REVIEW', policyResult };
    }

    // 6. Stage 6: Anomaly Check
    await claimState.transition({
      claimId,
      from: 'POLICY_CHECK',
      to: 'ANOMALY_CHECK',
      transitionKey: `claim:${claimId}:transition:POLICY_CHECK-ANOMALY_CHECK`,
      actor: 'SYSTEM',
    });

    let anomalyResult = {
      status: 'INSUFFICIENT_HISTORY',
      score: 0,
      threshold: 2.5,
      flagged: false,
      k: 5,
      neighbours: [],
      featureVector: [],
      explanation: 'Insufficient approved history for category comparison',
      scoredAt: new Date().toISOString(),
    };

    if (anomalyEngine?.score) {
      const history = await claimState.getApprovedExpenses({
        category: context.category,
        limit: 100,
      });
      anomalyResult = anomalyEngine.score({
        history,
        candidate: {
          employeeId: context.employeeId,
          category: context.category,
          amountMinor: context.claimedAmountMinor,
          transactionDate: extractionResult.data.transactionDate,
        },
        now: new Date().toISOString(),
      });
    }

    await claimState.saveStageResult(claimId, 'anomaly', anomalyResult);

    if (anomalyResult.flagged) {
      await claimState.transition({
        claimId,
        from: 'ANOMALY_CHECK',
        to: 'NEEDS_REVIEW',
        transitionKey: `claim:${claimId}:transition:ANOMALY_CHECK-NEEDS_REVIEW:anomaly-flagged`,
        reason: `Anomaly flagged: ${anomalyResult.explanation} (score: ${anomalyResult.score})`,
        actor: 'SYSTEM',
      });
      return { claimId, status: 'NEEDS_REVIEW', anomalyResult };
    }

    // 7. Stage 7: Financial Ledger Commit
    await claimState.transition({
      claimId,
      from: 'ANOMALY_CHECK',
      to: 'FINANCIAL_CHECK',
      transitionKey: `claim:${claimId}:transition:ANOMALY_CHECK-FINANCIAL_CHECK`,
      actor: 'SYSTEM',
    });

    let financialResult = { status: 'COMMITTED', ledgerEntryId: `mock-entry-${claimId}` };

    if (ledger?.commitClaim) {
      const period = (context.expenseDate || new Date().toISOString()).slice(0, 7);
      financialResult = await ledger.commitClaim({
        claimId,
        employeeId: context.employeeId,
        amountMinor: context.claimedAmountMinor,
        currency: 'INR',
        category: context.category,
        period,
        idempotencyKey: `claim:${claimId}:commit`,
        policyVersion: { policyId: policyResult.policyId, version: policyResult.policyVersion },
        occurredAt: new Date().toISOString(),
      });
    }

    await claimState.saveStageResult(claimId, 'financial', financialResult);

    // Resolve deterministic decision
    const decision = resolveDeterministicDecision({
      extraction: extractionResult,
      verification: duplicateVerification,
      policy: policyResult,
      anomaly: anomalyResult,
      financial: financialResult,
    });

    await claimState.saveStageResult(claimId, 'decision', decision);

    // Transition to terminal state (APPROVED or REJECTED)
    await claimState.transition({
      claimId,
      from: 'FINANCIAL_CHECK',
      to: decision.outcome,
      transitionKey: `claim:${claimId}:transition:FINANCIAL_CHECK-${decision.outcome}`,
      reason: decision.reasonCodes.join(', '),
      actor: 'SYSTEM',
    });

    // 8. Stage 8: Post-Decision Breach Explanation (Non-blocking best effort)
    try {
      const summary = await receiptAi.summarize({
        claimId,
        decision,
        violations: policyResult?.violations || [],
        anomaly: anomalyResult,
      });
      if (summary) {
        await claimState.saveStageResult(claimId, 'summary', summary);
      }
    } catch {
      // Best effort: failure never changes the decision
    }

    return { claimId, status: decision.outcome, decision };
  };
}
