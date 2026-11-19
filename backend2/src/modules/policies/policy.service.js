/**
 * Deterministic Expense Policy Engine
 * Evaluates corporate expense policies deterministically without AI/ML dependency.
 */

export const validateClaimPolicy = ({ amount, category, expenseDate, receiptUrl }) => {
  const violations = [];

  // 1. Mandatory receipt check: expenses over 500 INR require proof
  if (amount > 500 && !receiptUrl) {
    violations.push("Receipt is required for expenses exceeding 500 INR.");
  }

  // 2. Future date check
  const now = new Date();
  const date = new Date(expenseDate);
  if (date > now) {
    violations.push("Expense date cannot be in the future.");
  }

  // 3. Stale claim check: older than 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (date < ninetyDaysAgo) {
    violations.push("Expenses older than 90 days cannot be submitted.");
  }

  // 4. Category-specific threshold checks
  if (category === "Food" && amount > 2500) {
    violations.push("Daily meal expense exceeds the maximum allowable cap of 2,500 INR.");
  }

  return {
    isCompliant: violations.length === 0,
    violations
  };
};

export default {
  validateClaimPolicy
};
