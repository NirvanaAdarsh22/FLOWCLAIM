/**
 * @file worker/src/queues/claimQueue.js
 * BullMQ queue configuration for claim processing.
 */

export const QUEUE_NAME = 'claim-processing';

export const JOB_NAMES = Object.freeze({
  PROCESS_CLAIM: 'process-claim',
  COMMIT_MANAGER_APPROVAL: 'commit-manager-approval',
  RECONCILE_LEDGER: 'reconcile-ledger',
});

export const DEFAULT_JOB_OPTIONS = Object.freeze({
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 1000,
  removeOnFail: false,
});

/**
 * Generates deduplication Job IDs as required by the contract.
 */
export const jobIds = Object.freeze({
  forClaim: (claimId) => `process-claim:${claimId}`,
  forApproval: (claimId) => `commit-approval:${claimId}`,
  forReconcile: () => `reconcile-ledger:${Date.now()}`,
});
