/**
 * @file worker/src/processors/processClaim.js
 * Core processor for the 'process-claim' job.
 * Coordinates multi-stage expense claim processing.
 */

/**
 * Creates the processClaim job processor.
 *
 * @param {object} dependencies
 * @param {import('@flowclaim/shared-types').ClaimStatePort} dependencies.claimState
 * @param {import('@flowclaim/shared-types').ReceiptStoragePort} dependencies.storage
 * @param {any} dependencies.fraudEngine
 * @param {any} dependencies.receiptAi
 * @returns {Function} BullMQ processor function
 */
export function createProcessClaimProcessor(dependencies) {
  const { claimState, storage, fraudEngine, receiptAi } = dependencies;

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

    // Download receipt bytes from S3
    const receiptObj = await storage.getObject(context.receipt.objectKey);
    const fraudScreen = await fraudEngine.screen({
      claimId,
      bytes: receiptObj.bytes,
      contentType: receiptObj.contentType || context.receipt.contentType,
    });

    await claimState.saveStageResult(claimId, 'fraud', {
      screen: fraudScreen,
    });

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
      // Non-retryable failure transitions to NEEDS_REVIEW
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

    // 4. Duplicate Verification (post-extraction)
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

    return { claimId, status: 'PARSING', extraction: extractionResult.data };
  };
}
