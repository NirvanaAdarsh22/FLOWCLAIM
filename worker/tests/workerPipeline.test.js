import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createProcessClaimProcessor } from '../src/processors/processClaim.js';
import { createCommitManagerApprovalProcessor } from '../src/processors/commitManagerApproval.js';
import { createFraudEngine, createMemoryFingerprintStore } from '../../packages/fraud-engine/src/index.js';
import { createReceiptAiAdapter } from '../src/services/stageAdapters.js';

describe('Worker pipeline integration and retry tests', () => {
  let mockState;
  let savedStages;
  let transitions;

  beforeEach(() => {
    savedStages = {};
    transitions = [];
    mockState = {
      claimId: 'claim-pipe-1',
      status: 'QUEUED',
      employeeId: 'emp-101',
      employeeRole: 'EMPLOYEE',
      category: 'MEALS',
      claimedAmountMinor: 50000,
      businessPurpose: 'Team lunch',
      expenseDate: '2026-11-15',
      receipt: {
        objectKey: 'receipts/claim-pipe-1.png',
        contentType: 'image/png',
      },
    };
  });

  const mockClaimState = {
    async getProcessingContext(id) {
      return { ...mockState, claimId: id };
    },
    async transition({ claimId, from, to, transitionKey, reason, actor }) {
      transitions.push({ from, to, transitionKey });
      mockState.status = to;
      return { status: to, applied: true };
    },
    async saveStageResult(claimId, stage, result) {
      savedStages[stage] = result;
    },
    async recordFailure() {},
    async getActivePolicy() {
      return { policyId: 'active-1', version: 1, rules: [] };
    },
    async getApprovedExpenses() {
      return [];
    },
  };

  const mockStorage = {
    async getObject() {
      return {
        bytes: Buffer.from('test receipt bytes'),
        contentType: 'image/png',
      };
    },
  };

  test('end-to-end happy path progresses through all stages to APPROVED', async () => {
    const store = createMemoryFingerprintStore();
    const fraudEngine = createFraudEngine({ store });
    const receiptAi = createReceiptAiAdapter();

    const processClaim = createProcessClaimProcessor({
      claimState: mockClaimState,
      storage: mockStorage,
      fraudEngine,
      receiptAi,
    });

    const result = await processClaim({ data: { claimId: 'claim-pipe-1' } });

    assert.equal(result.status, 'APPROVED');
    assert.equal(mockState.status, 'APPROVED');

    // Verify stage results were saved
    assert.ok(savedStages.fraud, 'Fraud stage result saved');
    assert.ok(savedStages.extraction, 'Extraction stage result saved');
    assert.ok(savedStages.policy, 'Policy stage result saved');
    assert.ok(savedStages.anomaly, 'Anomaly stage result saved');
    assert.ok(savedStages.financial, 'Financial stage result saved');
    assert.ok(savedStages.decision, 'Decision stage result saved');
  });

  test('idempotent replay of already APPROVED claim exits early without modifying state', async () => {
    mockState.status = 'APPROVED';
    const initialTransitionCount = transitions.length;

    const store = createMemoryFingerprintStore();
    const fraudEngine = createFraudEngine({ store });
    const receiptAi = createReceiptAiAdapter();

    const processClaim = createProcessClaimProcessor({
      claimState: mockClaimState,
      storage: mockStorage,
      fraudEngine,
      receiptAi,
    });

    const result = await processClaim({ data: { claimId: 'claim-pipe-1' } });
    assert.equal(result.skipped, true);
    assert.equal(transitions.length, initialTransitionCount, 'No new transitions applied');
  });

  test('commitManagerApproval processor transitions NEEDS_REVIEW to APPROVED with manager audit', async () => {
    mockState.status = 'NEEDS_REVIEW';

    const commitApproval = createCommitManagerApprovalProcessor({
      claimState: mockClaimState,
    });

    const result = await commitApproval({
      data: {
        claimId: 'claim-pipe-1',
        managerId: 'mgr-999',
        reason: 'Legitimate business expense approved upon review',
        action: 'APPROVE',
      },
    });

    assert.equal(result.status, 'APPROVED');
    assert.equal(result.decision.decidedBy, 'MANAGER');
    assert.equal(result.decision.managerId, 'mgr-999');
    assert.equal(result.decision.managerReason, 'Legitimate business expense approved upon review');
  });
});
