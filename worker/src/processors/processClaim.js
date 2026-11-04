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
 * @param {any} [dependencies.fraudEngine]
 * @returns {Function} BullMQ processor function
 */
export function createProcessClaimProcessor(dependencies) {
  const { claimState, storage, fraudEngine } = dependencies;

  return async function processClaimJob(job) {
    const { claimId, correlationId } = job.data;
    if (!claimId) throw new Error('Missing claimId in process-claim job payload');

    // 1. Fetch current claim context
    const context = await claimState.getProcessingContext(claimId);
    if (!context) {
      throw new Error(`Claim '${claimId}' not found in backend`);
    }

    // Guard: ignore already terminal claims
    if (['APPROVED', 'REJECTED', 'PROCESSING_FAILED'].includes(context.status)) {
      return { claimId, status: context.status, skipped: true };
    }

    // 2. Transition from QUEUED to SCREENING
    await claimState.transition({
      claimId,
      from: 'QUEUED',
      to: 'SCREENING',
      transitionKey: `claim:${claimId}:transition:QUEUED-SCREENING`,
      actor: 'SYSTEM',
    });

    return { claimId, status: 'SCREENING' };
  };
}
