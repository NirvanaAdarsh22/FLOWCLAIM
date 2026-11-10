import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDeterministicDecision } from '../src/services/decision/decisionResolver.js';

describe('Deterministic Decision Resolver unit tests (§4 Decision Order)', () => {
  const samplePolicyVersion = { policyId: 'p-1', version: 1 };

  test('Rule 1: extraction failure yields NEEDS_REVIEW', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: false, code: 'MALFORMED_OUTPUT', message: 'Invalid JSON', retryable: false },
    });
    assert.equal(res.outcome, 'NEEDS_REVIEW');
    assert.deepEqual(res.reasonCodes, ['EXTRACTION_INVALID', 'MALFORMED_OUTPUT']);
    assert.equal(res.decidedBy, 'SYSTEM');
  });

  test('Rule 2: CONFIRMED_DUPLICATE yields POSSIBLE_DUPLICATE (never auto-rejected)', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: true, data: {} },
      verification: { verdict: 'CONFIRMED_DUPLICATE', matchedClaimId: 'other-claim' },
    });
    assert.equal(res.outcome, 'POSSIBLE_DUPLICATE');
    assert.deepEqual(res.reasonCodes, ['CONFIRMED_DUPLICATE_RECEIPT']);
  });

  test('Rule 2b: suspected duplicate (NEEDS_REVIEW) yields POSSIBLE_DUPLICATE', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: true, data: {} },
      verification: { verdict: 'NEEDS_REVIEW', matchedClaimId: 'other-claim' },
    });
    assert.equal(res.outcome, 'POSSIBLE_DUPLICATE');
    assert.deepEqual(res.reasonCodes, ['SUSPECTED_DUPLICATE_RECEIPT']);
  });

  test('Rule 3: policy outcome BLOCKED yields REJECTED', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: true, data: {} },
      verification: { verdict: 'NOT_DUPLICATE' },
      policy: {
        policyId: 'p-1',
        policyVersion: 1,
        outcome: 'BLOCKED',
        violations: [{ code: 'EXCEEDS_DAILY_LIMIT', description: 'Over limit' }],
      },
    });
    assert.equal(res.outcome, 'REJECTED');
    assert.deepEqual(res.reasonCodes, ['EXCEEDS_DAILY_LIMIT']);
  });

  test('Rule 3b: policy outcome REVIEW_REQUIRED yields NEEDS_REVIEW', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: true, data: {} },
      verification: { verdict: 'NOT_DUPLICATE' },
      policy: {
        policyId: 'p-1',
        policyVersion: 1,
        outcome: 'REVIEW_REQUIRED',
        violations: [{ code: 'WEEKEND_EXPENSE', description: 'Weekend submission' }],
      },
    });
    assert.equal(res.outcome, 'NEEDS_REVIEW');
    assert.deepEqual(res.reasonCodes, ['WEEKEND_EXPENSE']);
  });

  test('Rule 4: flagged anomaly yields NEEDS_REVIEW', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: true, data: {} },
      verification: { verdict: 'NOT_DUPLICATE' },
      policy: { outcome: 'PASS', violations: [] },
      anomaly: { flagged: true, score: 3.8, status: 'SCORED' },
    });
    assert.equal(res.outcome, 'NEEDS_REVIEW');
    assert.deepEqual(res.reasonCodes, ['ANOMALY_FLAGGED']);
  });

  test('Rule 4b: INSUFFICIENT_HISTORY is not flagged and proceeds', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: true, data: {} },
      verification: { verdict: 'NOT_DUPLICATE' },
      policy: { outcome: 'PASS', violations: [] },
      anomaly: { flagged: false, status: 'INSUFFICIENT_HISTORY' },
      financial: { status: 'COMMITTED', ledgerEntryId: 'entry-123' },
    });
    assert.equal(res.outcome, 'APPROVED');
  });

  test('Rule 5: financial ledger COMMITTED yields APPROVED', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: true, data: {} },
      verification: { verdict: 'NOT_DUPLICATE' },
      policy: { outcome: 'PASS', violations: [] },
      anomaly: { flagged: false, status: 'SCORED' },
      financial: { status: 'COMMITTED', ledgerEntryId: 'entry-999' },
    });
    assert.equal(res.outcome, 'APPROVED');
    assert.equal(res.decidedBy, 'SYSTEM');
  });

  test('Rule 5b: financial ledger INSUFFICIENT_BUDGET yields REJECTED', () => {
    const res = resolveDeterministicDecision({
      extraction: { ok: true, data: {} },
      verification: { verdict: 'NOT_DUPLICATE' },
      policy: { outcome: 'PASS', violations: [] },
      anomaly: { flagged: false, status: 'SCORED' },
      financial: { status: 'INSUFFICIENT_BUDGET' },
    });
    assert.equal(res.outcome, 'REJECTED');
    assert.deepEqual(res.reasonCodes, ['INSUFFICIENT_BUDGET']);
  });

  test('Manager approval flow: approved + ledger committed yields APPROVED', () => {
    const res = resolveDeterministicDecision({
      managerApproval: {
        action: 'APPROVE',
        managerId: 'mgr-007',
        reason: 'Client entertainment pre-approved',
      },
      financial: { status: 'COMMITTED', ledgerEntryId: 'entry-mgr-1' },
    });
    assert.equal(res.outcome, 'APPROVED');
    assert.equal(res.decidedBy, 'MANAGER');
    assert.equal(res.managerId, 'mgr-007');
    assert.equal(res.managerReason, 'Client entertainment pre-approved');
  });

  test('Manager rejection flow: yields REJECTED without financial commit', () => {
    const res = resolveDeterministicDecision({
      managerApproval: {
        action: 'REJECT',
        managerId: 'mgr-007',
        reason: 'Personal expense not reimbursable',
      },
    });
    assert.equal(res.outcome, 'REJECTED');
    assert.equal(res.decidedBy, 'MANAGER');
  });
});
