/**
 * @file worker/src/services/decision/decisionResolver.js
 * Pure, deterministic decision resolver function.
 * Evaluates multi-stage verification outputs according to strict precedence rules.
 *
 * Hard invariant: AI (Gemini) NEVER modifies this decision.
 */

/**
 * Resolves the deterministic decision for an expense claim.
 *
 * @param {object} params
 * @param {import('@flowclaim/shared-types').ExtractionResult} [params.extraction]
 * @param {import('@flowclaim/shared-types').DuplicateVerificationResult} [params.verification]
 * @param {import('@flowclaim/shared-types').PolicyEvaluationResult} [params.policy]
 * @param {import('@flowclaim/shared-types').AnomalyResult} [params.anomaly]
 * @param {import('@flowclaim/shared-types').LedgerCommitResult} [params.financial]
 * @param {object} [params.managerApproval]
 * @param {string} [params.decidedAt]
 * @returns {import('@flowclaim/shared-types').DecisionRecord}
 */
export function resolveDeterministicDecision(params) {
  const {
    extraction,
    verification,
    policy,
    anomaly,
    financial,
    managerApproval,
    decidedAt = new Date().toISOString(),
  } = params;

  const policyVersion = policy
    ? { policyId: policy.policyId, version: policy.policyVersion }
    : null;

  // If a Manager already intervened to approve or reject
  if (managerApproval) {
    if (managerApproval.action === 'REJECT') {
      return {
        outcome: 'REJECTED',
        reasonCodes: ['MANAGER_REJECTED'],
        policyVersion,
        decidedBy: 'MANAGER',
        managerId: managerApproval.managerId,
        managerReason: managerApproval.reason,
        decidedAt,
      };
    }

    // Manager APPROVED: outcome depends on ledger commit
    if (financial?.status === 'COMMITTED' || financial?.status === 'ALREADY_COMMITTED') {
      return {
        outcome: 'APPROVED',
        reasonCodes: ['MANAGER_APPROVED_COMMITTED'],
        policyVersion,
        decidedBy: 'MANAGER',
        managerId: managerApproval.managerId,
        managerReason: managerApproval.reason,
        decidedAt,
      };
    }

    if (financial?.status === 'INSUFFICIENT_BUDGET' || financial?.status === 'NO_BUDGET') {
      return {
        outcome: 'REJECTED',
        reasonCodes: [financial.status],
        policyVersion,
        decidedBy: 'MANAGER',
        managerId: managerApproval.managerId,
        managerReason: managerApproval.reason,
        decidedAt,
      };
    }
  }

  // Precedence Rule 1: Extraction Failure
  if (extraction && !extraction.ok) {
    return {
      outcome: 'NEEDS_REVIEW',
      reasonCodes: ['EXTRACTION_INVALID', extraction.code],
      policyVersion,
      decidedBy: 'SYSTEM',
      decidedAt,
    };
  }

  // Precedence Rule 2: Duplicate Verdict
  if (
    verification?.verdict === 'CONFIRMED_DUPLICATE' ||
    verification?.verdict === 'NEEDS_REVIEW'
  ) {
    return {
      outcome: 'POSSIBLE_DUPLICATE',
      reasonCodes: [
        verification.verdict === 'CONFIRMED_DUPLICATE'
          ? 'CONFIRMED_DUPLICATE_RECEIPT'
          : 'SUSPECTED_DUPLICATE_RECEIPT',
      ],
      policyVersion,
      decidedBy: 'SYSTEM',
      decidedAt,
    };
  }

  // Precedence Rule 3: Policy Engine Outcome
  if (policy) {
    if (policy.outcome === 'BLOCKED') {
      return {
        outcome: 'REJECTED',
        reasonCodes: policy.violations.map((v) => v.code),
        policyVersion,
        decidedBy: 'SYSTEM',
        decidedAt,
      };
    }
    if (policy.outcome === 'REVIEW_REQUIRED') {
      return {
        outcome: 'NEEDS_REVIEW',
        reasonCodes: policy.violations.map((v) => v.code),
        policyVersion,
        decidedBy: 'SYSTEM',
        decidedAt,
      };
    }
  }

  // Precedence Rule 4: Anomaly Detection
  if (anomaly && anomaly.flagged) {
    return {
      outcome: 'NEEDS_REVIEW',
      reasonCodes: ['ANOMALY_FLAGGED'],
      policyVersion,
      decidedBy: 'SYSTEM',
      decidedAt,
    };
  }

  // Precedence Rule 5: Financial Ledger Commit
  if (financial) {
    if (financial.status === 'COMMITTED' || financial.status === 'ALREADY_COMMITTED') {
      return {
        outcome: 'APPROVED',
        reasonCodes: ['AUTOMATED_POLICY_PASSED_COMMITTED'],
        policyVersion,
        decidedBy: 'SYSTEM',
        decidedAt,
      };
    }

    if (financial.status === 'INSUFFICIENT_BUDGET' || financial.status === 'NO_BUDGET') {
      return {
        outcome: 'REJECTED',
        reasonCodes: [financial.status],
        policyVersion,
        decidedBy: 'SYSTEM',
        decidedAt,
      };
    }
  }

  // Default state when ready for financial check
  return {
    outcome: 'NEEDS_REVIEW',
    reasonCodes: ['PENDING_FINANCIAL_VERIFICATION'],
    policyVersion,
    decidedBy: 'SYSTEM',
    decidedAt,
  };
}
