/**
 * @file worker/src/services/reconciliationService.js
 * Dual-write reconciliation worker service.
 * Recovers claims if PostgreSQL committed successfully but MongoDB state was delayed or interrupted.
 */

/**
 * Creates the reconciliation service.
 *
 * @param {object} dependencies
 * @param {import('@flowclaim/shared-types').ClaimStatePort} dependencies.claimState
 * @param {any} [dependencies.ledger]
 * @returns {{ reconcile: (options?: { olderThanMinutes?: number }) => Promise<{ reconciled: number, checked: number }> }}
 */
export function createReconciliationService(dependencies) {
  const { claimState, ledger } = dependencies;

  return {
    async reconcile(options = {}) {
      const olderThanMinutes = options.olderThanMinutes ?? 15;
      const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

      let candidateClaimIds = [];
      try {
        if (claimState.getPendingReconcileClaims) {
          candidateClaimIds = await claimState.getPendingReconcileClaims({ updatedBefore: cutoff });
        }
      } catch {
        candidateClaimIds = [];
      }

      let reconciled = 0;

      for (const claimId of candidateClaimIds) {
        try {
          const context = await claimState.getProcessingContext(claimId);
          if (!context || ['APPROVED', 'REJECTED'].includes(context.status)) {
            continue;
          }

          // Check if PostgreSQL ledger entries contain an entry for this claim
          if (ledger?.listLedgerEntries) {
            const entries = await ledger.listLedgerEntries({ claimId, page: 1, pageSize: 1 });
            if (entries && entries.items && entries.items.length > 0) {
              // Financial commit already succeeded! Repair Mongo state to APPROVED
              await claimState.transition({
                claimId,
                from: context.status,
                to: 'APPROVED',
                transitionKey: `claim:${claimId}:transition:RECONCILE_REPAIR`,
                reason: 'Reconciliation recovery: PostgreSQL committed ledger entry verified',
                actor: 'SYSTEM',
              });
              reconciled++;
            }
          }
        } catch {
          // Continue scanning remaining claims
        }
      }

      return {
        checked: candidateClaimIds.length,
        reconciled,
        completedAt: new Date().toISOString(),
      };
    },
  };
}
