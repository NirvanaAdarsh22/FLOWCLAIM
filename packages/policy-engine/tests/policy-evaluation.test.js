/**
 * @fileoverview Unit tests for Policy Engine evaluation and validation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePolicy } from '../src/evaluation/engine.js';
import { validatePolicy } from '../src/evaluation/validation.js';

describe('Policy Engine: Validation & Evaluation', () => {
  const samplePolicy = {
    policyId: 'pol-global-v1',
    version: 1,
    name: 'Standard Corporate Travel & Expense Policy',
    status: 'ACTIVE',
    createdAt: '2026-10-01T00:00:00Z',
    createdBy: 'usr-admin-1',
    rules: [
      {
        ruleId: 'rule-receipt-exists',
        code: 'RECEIPT_REQUIRED',
        description: 'Receipt total must exist and be positive',
        severity: 'BLOCKING',
        dependsOn: [],
        condition: {
          all: [
            { field: 'receipt.totalMinor', op: 'exists', value: true },
            { field: 'receipt.totalMinor', op: 'gt', value: 0 },
          ],
        },
      },
      {
        ruleId: 'rule-amount-match',
        code: 'AMOUNT_MISMATCH',
        description: 'Claimed amount must match receipt total',
        severity: 'BLOCKING',
        dependsOn: ['rule-receipt-exists'],
        condition: {
          field: 'derived.claimedMatchesReceipt',
          op: 'eq',
          value: true,
        },
      },
      {
        ruleId: 'rule-age-limit',
        code: 'RECEIPT_EXPIRED',
        description: 'Receipt must be less than 90 days old',
        severity: 'REVIEW',
        dependsOn: ['rule-receipt-exists'],
        condition: {
          field: 'derived.receiptAgeDays',
          op: 'lte',
          value: 90,
        },
      },
      {
        ruleId: 'rule-meals-limit',
        code: 'MEALS_OVER_LIMIT',
        description: 'Meals over ₹2500 require review',
        severity: 'REVIEW',
        dependsOn: ['rule-amount-match'],
        condition: {
          any: [
            { field: 'claim.category', op: 'neq', value: 'MEALS' },
            { field: 'claim.claimedAmountMinor', op: 'lte', value: 250000 },
          ],
        },
      },
      {
        ruleId: 'rule-currency-info',
        code: 'FOREIGN_CURRENCY_NOTED',
        description: 'Receipt is in INR',
        severity: 'INFO',
        dependsOn: [],
        condition: {
          field: 'receipt.currency',
          op: 'eq',
          value: 'INR',
        },
      },
    ],
  };

  test('validatePolicy approves valid policy definition', () => {
    const res = validatePolicy(samplePolicy);
    assert.equal(res.ok, true);
  });

  test('validatePolicy rejects policy with unknown fields', () => {
    const invalid = { ...samplePolicy, rogueField: 123 };
    const res = validatePolicy(invalid);
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.code === 'UNKNOWN_FIELD'));
  });

  test('validatePolicy rejects duplicate ruleIds', () => {
    const invalid = {
      ...samplePolicy,
      rules: [
        ...samplePolicy.rules,
        {
          ruleId: 'rule-receipt-exists',
          code: 'DUP',
          description: 'dup',
          severity: 'BLOCKING',
          dependsOn: [],
          condition: { field: 'receipt.currency', op: 'eq', value: 'INR' },
        },
      ],
    };
    const res = validatePolicy(invalid);
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.code === 'DUPLICATE_RULE_ID'));
  });

  test('validatePolicy rejects missing dependency', () => {
    const invalid = {
      ...samplePolicy,
      rules: [
        {
          ruleId: 'rule-ghost',
          code: 'GHOST',
          description: 'ghost',
          severity: 'BLOCKING',
          dependsOn: ['non-existent'],
          condition: { field: 'receipt.currency', op: 'eq', value: 'INR' },
        },
      ],
    };
    const res = validatePolicy(invalid);
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.code === 'MISSING_DEPENDENCY'));
  });

  test('evaluatePolicy PASSES compliant claim and computes derived facts', () => {
    const facts = {
      claim: {
        category: 'MEALS',
        claimedAmountMinor: 150000, // ₹1,500.00
        employeeRole: 'EMPLOYEE',
        businessPurpose: 'Team lunch with client',
      },
      receipt: {
        merchant: 'Taj Hotel',
        transactionDate: '2026-10-25',
        currency: 'INR',
        subtotalMinor: 140000,
        taxMinor: 10000,
        totalMinor: 150000,
        lineItems: [{ description: 'Lunch buffet', quantity: 2, amountMinor: 150000 }],
      },
      now: '2026-10-27T12:00:00Z', // 2 days old
    };

    const result = evaluatePolicy({ policy: samplePolicy, facts });
    assert.equal(result.outcome, 'PASS');
    assert.equal(result.violations.length, 0);
    assert.equal(result.ruleResults.length, 5);
    assert.ok(result.ruleResults.every((r) => r.status === 'PASSED'));
  });

  test('evaluatePolicy blocks on BLOCKING violation and prunes downstream dependencies', () => {
    const facts = {
      claim: {
        category: 'MEALS',
        claimedAmountMinor: 200000, // ₹2,000.00
        employeeRole: 'EMPLOYEE',
        businessPurpose: 'Lunch',
      },
      receipt: {
        merchant: 'Taj Hotel',
        transactionDate: '2026-10-25',
        currency: 'INR',
        subtotalMinor: 100000,
        taxMinor: 10000,
        totalMinor: 110000, // Mismatch with claim (₹1,100 vs ₹2,000)
        lineItems: [],
      },
      now: '2026-10-27T12:00:00Z',
    };

    const result = evaluatePolicy({ policy: samplePolicy, facts });
    assert.equal(result.outcome, 'BLOCKED');

    // rule-amount-match should be FAILED
    const amountMatchResult = result.ruleResults.find((r) => r.ruleId === 'rule-amount-match');
    assert.equal(amountMatchResult.status, 'FAILED');

    // rule-meals-limit depends on rule-amount-match, so it should be SKIPPED
    const mealsResult = result.ruleResults.find((r) => r.ruleId === 'rule-meals-limit');
    assert.equal(mealsResult.status, 'SKIPPED');
    assert.equal(mealsResult.skippedBecause, 'rule-amount-match');

    // Violations should list AMOUNT_MISMATCH
    assert.ok(result.violations.some((v) => v.code === 'AMOUNT_MISMATCH'));
  });

  test('evaluatePolicy flags REVIEW_REQUIRED when only REVIEW severity fails', () => {
    const facts = {
      claim: {
        category: 'MEALS',
        claimedAmountMinor: 350000, // ₹3,500.00 (Exceeds ₹2,500 threshold)
        employeeRole: 'EMPLOYEE',
        businessPurpose: 'Executive Dinner',
      },
      receipt: {
        merchant: 'Grand Bistro',
        transactionDate: '2026-10-25',
        currency: 'INR',
        subtotalMinor: 300000,
        taxMinor: 50000,
        totalMinor: 350000,
        lineItems: [],
      },
      now: '2026-10-27T12:00:00Z',
    };

    const result = evaluatePolicy({ policy: samplePolicy, facts });
    assert.equal(result.outcome, 'REVIEW_REQUIRED');

    const mealsResult = result.ruleResults.find((r) => r.ruleId === 'rule-meals-limit');
    assert.equal(mealsResult.status, 'FAILED');
    assert.ok(result.violations.some((v) => v.code === 'MEALS_OVER_LIMIT'));
  });

  test('evaluatePolicy keeps outcome PASS when only INFO severity fails', () => {
    const facts = {
      claim: {
        category: 'OFFICE_SUPPLIES',
        claimedAmountMinor: 50000,
        employeeRole: 'EMPLOYEE',
        businessPurpose: 'Notebooks',
      },
      receipt: {
        merchant: 'Supply Store',
        transactionDate: '2026-10-25',
        currency: 'USD', // Currency INFO rule fails
        subtotalMinor: 40000,
        taxMinor: 10000,
        totalMinor: 50000,
        lineItems: [],
      },
      now: '2026-10-27T12:00:00Z',
    };

    const result = evaluatePolicy({ policy: samplePolicy, facts });
    assert.equal(result.outcome, 'PASS');

    const currencyResult = result.ruleResults.find((r) => r.ruleId === 'rule-currency-info');
    assert.equal(currencyResult.status, 'FAILED');
    assert.equal(currencyResult.severity, 'INFO');
  });
});
