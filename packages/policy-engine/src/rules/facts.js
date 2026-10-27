/**
 * @fileoverview Facts resolution and derived facts calculator for Policy Engine.
 * Follows Master Development Document v1.1 (§6.3).
 * Pure, deterministic, no I/O, no clock reads (time comes from facts.now).
 * Plain JavaScript ESM only.
 */

const MILLISECONDS_PER_DAY = 86400000;

/**
 * Computes all derived facts and constructs a flattened fact lookup map.
 *
 * @param {{
 *   claim: {
 *     category: string,
 *     claimedAmountMinor: number,
 *     employeeRole: string,
 *     businessPurpose: string
 *   },
 *   receipt: {
 *     merchant: string,
 *     transactionDate: string,
 *     currency: string,
 *     subtotalMinor: number | null,
 *     taxMinor: number,
 *     totalMinor: number,
 *     lineItems?: Array<any>
 *   },
 *   now: string
 * }} facts
 * @returns {Record<string, any>} Fact lookup dictionary
 */
export function buildFactContext(facts) {
  if (!facts || typeof facts !== 'object') {
    throw new Error('Facts must be a non-null object');
  }

  const { claim, receipt, now } = facts;

  if (!claim || typeof claim !== 'object') {
    throw new Error("Facts must contain a 'claim' object");
  }

  if (!receipt || typeof receipt !== 'object') {
    throw new Error("Facts must contain a 'receipt' object");
  }

  if (typeof now !== 'string' || !now.trim()) {
    throw new Error("Facts must contain an ISO timestamp 'now' string");
  }

  // Calculate derived.receiptAgeDays: whole days between transactionDate and now
  let receiptAgeDays = 0;
  if (receipt.transactionDate) {
    const txTime = Date.parse(receipt.transactionDate);
    const nowTime = Date.parse(now);
    if (!Number.isNaN(txTime) && !Number.isNaN(nowTime)) {
      receiptAgeDays = Math.floor((nowTime - txTime) / MILLISECONDS_PER_DAY);
    }
  }

  // Calculate derived.claimedMatchesReceipt
  const claimedMatchesReceipt =
    typeof claim.claimedAmountMinor === 'number' &&
    typeof receipt.totalMinor === 'number' &&
    claim.claimedAmountMinor === receipt.totalMinor;

  // Calculate receipt.lineItemCount
  const lineItemCount = Array.isArray(receipt.lineItems) ? receipt.lineItems.length : 0;

  return {
    'claim.category': claim.category,
    'claim.claimedAmountMinor': claim.claimedAmountMinor,
    'claim.employeeRole': claim.employeeRole,
    'claim.businessPurpose': claim.businessPurpose,

    'receipt.merchant': receipt.merchant,
    'receipt.totalMinor': receipt.totalMinor,
    'receipt.taxMinor': receipt.taxMinor,
    'receipt.transactionDate': receipt.transactionDate,
    'receipt.currency': receipt.currency,
    'receipt.lineItemCount': lineItemCount,

    'derived.receiptAgeDays': receiptAgeDays,
    'derived.claimedMatchesReceipt': claimedMatchesReceipt,
  };
}

/**
 * Resolves a fact value by its path from the fact context.
 *
 * @param {Record<string, any>} factContext
 * @param {string} factPath
 * @returns {{ found: boolean, value: any }}
 */
export function resolveFact(factContext, factPath) {
  if (Object.prototype.hasOwnProperty.call(factContext, factPath)) {
    return { found: true, value: factContext[factPath] };
  }
  return { found: false, value: undefined };
}
