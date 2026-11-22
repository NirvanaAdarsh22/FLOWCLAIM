/**
 * @file backend2/tests/integration/workflow-verification.test.js
 * End-to-end verification of the FlowClaim expense submission, duplicate detection,
 * manager review, and real-time ledger commit workflow.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';
import connectMongoDB from '../../src/config/mongodb.js';
import Claim from '../../src/modules/claims/claim.model.js';
import redis from '../../src/config/redis.js';
import mongoose from 'mongoose';

describe('FlowClaim Complete Workflow End-to-End Verification', () => {
  let server;
  let baseUrl;
  let firstClaimId;
  let duplicateClaimId;

  const testSuffix = Date.now();
  const testAmount = 2150;
  const testDate = '2026-11-19';

  const employeeToken = 'jwt-employee-token';
  const managerToken = 'jwt-manager-token';

  before(async () => {
    try {
      await connectMongoDB();
      // Remove any prior test claims with this pattern
      await Claim.deleteMany({ description: /E2E-TEST/ });
    } catch (err) {
      console.warn('MongoDB connect warning in test:', err.message);
    }

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      await mongoose.disconnect();
    } catch {}
    try {
      redis.disconnect();
    } catch {}
  });

  it('Step 1: Submits initial legitimate claim -> auto-approved under threshold and commits to ledger', async () => {
    const createRes = await fetch(`${baseUrl}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        category: 'Food',
        expenseDate: testDate,
        amount: testAmount,
        currency: 'INR',
        receiptUrl: 'https://flowclaim.internal/receipts/valid_receipt.jpg',
        description: `E2E-TEST Legitimate Team Lunch ${testSuffix}`,
      }),
    });

    const createData = await createRes.json();
    assert.equal(createRes.status, 201, `Failed to create draft: ${JSON.stringify(createData)}`);
    assert.ok(createData.claim.claimId);
    firstClaimId = createData.claim.claimId;

    const submitRes = await fetch(`${baseUrl}/claims/${firstClaimId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });

    const submitData = await submitRes.json();
    console.log('Step 1 submitData:', submitData);
    assert.equal(submitRes.status, 200, `Failed to submit claim: ${JSON.stringify(submitData)}`);
    assert.equal(submitData.claim.status, 'APPROVED', 'Initial claim under threshold should be APPROVED');
    assert.ok(submitData.claim.ledgerTxId, 'Approved claim must have ledgerTxId assigned');
  });

  it('Step 2: Submitting an identical duplicate claim -> flagged as POSSIBLE_DUPLICATE (NOT auto-approved)', async () => {
    const createRes = await fetch(`${baseUrl}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        category: 'Food',
        expenseDate: testDate,
        amount: testAmount,
        currency: 'INR',
        receiptUrl: 'https://flowclaim.internal/receipts/valid_receipt.jpg',
        description: `E2E-TEST Duplicate Submission ${testSuffix}`,
      }),
    });

    const createData = await createRes.json();
    assert.equal(createRes.status, 201);
    duplicateClaimId = createData.claim.claimId;

    const submitRes = await fetch(`${baseUrl}/claims/${duplicateClaimId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });

    const submitData = await submitRes.json();
    assert.equal(submitRes.status, 200);
    assert.equal(
      submitData.claim.status,
      'POSSIBLE_DUPLICATE',
      'Duplicate claim must be flagged as POSSIBLE_DUPLICATE, NEVER auto-approved!'
    );
    assert.equal(submitData.claim.ledgerTxId, null, 'Unapproved duplicate must NOT have ledgerTxId');
  });

  it('Step 3: Manager Dashboard fetches live review queue -> duplicate claim is listed', async () => {
    const res = await fetch(`${baseUrl}/manager/claims`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    const data = await res.json();
    assert.equal(res.status, 200, 'Manager should be able to fetch review claims');
    assert.ok(Array.isArray(data.claims), 'Claims must be an array');

    const foundDuplicate = data.claims.find((c) => c.claimId === duplicateClaimId);
    assert.ok(foundDuplicate, `Duplicate claim ${duplicateClaimId} must be visible in manager dashboard`);
    assert.equal(foundDuplicate.status, 'POSSIBLE_DUPLICATE');
  });

  it('Step 4: Manager signs off and approves duplicate claim -> updates status to APPROVED and commits ledgerTxId in real-time', async () => {
    const decisionRes = await fetch(`${baseUrl}/manager/claims/${duplicateClaimId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE',
        notes: 'Manager manual sign-off: verified that two separate lunches occurred on same day',
      }),
    });

    const decisionData = await decisionRes.json();
    assert.equal(decisionRes.status, 200, `Decision failed: ${JSON.stringify(decisionData)}`);
    assert.equal(decisionData.claim.status, 'APPROVED', 'Claim should now be APPROVED');
    assert.ok(decisionData.claim.ledgerTxId, 'Ledger transaction ID must now be generated');
    assert.equal(decisionData.claim.managerDecision.decision, 'APPROVE');
  });
});
