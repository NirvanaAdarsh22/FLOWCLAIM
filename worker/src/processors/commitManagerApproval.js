/**
 * @file worker/src/processors/commitManagerApproval.js
 * Processor for the 'commit-manager-approval' BullMQ job.
 * Executes ledger commit when a manager approves a claim from review states.
 */

import { resolveDeterministicDecision } from '../services/decision/decisionResolver.js';

/**
 * Creates the commitManagerApproval processor function.
 *
 * @param {object} dependencies
 * @param {import('@flowclaim/shared-types').ClaimStatePort} dependencies.claimState
 * @param {any} [dependencies.ledger]
 * @returns {Function} BullMQ processor function
 */
export function createCommitManagerApprovalProcessor(dependencies) {
  const { claimState, ledger } = dependencies;

  return async function commitManagerApprovalJob(job) {
    const { claimId, managerId, reason, action = 'APPROVE' } = job.data;
    if (!claimId) throw new Error('claimId is required in commit-manager-approval payload');
    if (!managerId) throw new Error('managerId is required in commit-manager-approval payload');

    const context = await claimState.getProcessingContext(claimId);
    if (!context) throw new Error(`Claim '${claimId}' not found`);

    // Verify legal state: must be in NEEDS_REVIEW or POSSIBLE_DUPLICATE
    if (!['NEEDS_REVIEW', 'POSSIBLE_DUPLICATE'].includes(context.status)) {
      if (['APPROVED', 'REJECTED'].includes(context.status)) {
        return { claimId, status: context.status, alreadyDecided: true };
      }
      throw new Error(`Cannot commit manager approval from illegal state: ${context.status}`);
    }

    if (action === 'REJECT') {
      const decision = resolveDeterministicDecision({
        managerApproval: { action: 'REJECT', managerId, reason },
      });
      await claimState.saveStageResult(claimId, 'decision', decision);
      await claimState.transition({
        claimId,
        from: context.status,
        to: 'REJECTED',
        transitionKey: `claim:${claimId}:transition:MANAGER_REJECT`,
        reason: reason || 'Manager rejected claim',
        actor: managerId,
      });
      return { claimId, status: 'REJECTED', decision };
    }

    // Manager APPROVE: Move to FINANCIAL_CHECK
    await claimState.transition({
      claimId,
      from: context.status,
      to: 'FINANCIAL_CHECK',
      transitionKey: `claim:${claimId}:transition:${context.status}-FINANCIAL_CHECK:manager-approve`,
      actor: managerId,
    });

    let financialResult = { status: 'COMMITTED', ledgerEntryId: `mgr-commit-${claimId}` };

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
        policyVersion: { policyId: 'manager-override', version: 1 },
        occurredAt: new Date().toISOString(),
      });
    }

    await claimState.saveStageResult(claimId, 'financial', financialResult);

    const decision = resolveDeterministicDecision({
      managerApproval: { action: 'APPROVE', managerId, reason },
      financial: financialResult,
    });

    await claimState.saveStageResult(claimId, 'decision', decision);

    await claimState.transition({
      claimId,
      from: 'FINANCIAL_CHECK',
      to: decision.outcome,
      transitionKey: `claim:${claimId}:transition:FINANCIAL_CHECK-${decision.outcome}:manager-final`,
      reason: reason || 'Manager approved claim',
      actor: managerId,
    });

    return { claimId, status: decision.outcome, decision };
  };
}
