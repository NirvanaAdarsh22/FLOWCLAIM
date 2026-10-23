/**
 * Feature extraction and normalization module for FlowClaim anomaly detection.
 * All normalization is purely deterministic and derived strictly from historical data.
 */

export const CATEGORIES = Object.freeze([
  'TRAVEL',
  'MEALS',
  'LODGING',
  'OFFICE_SUPPLIES',
  'SOFTWARE',
  'OTHER'
]);

/**
 * Computes descriptive statistics for numerical features across historical expenses.
 * @param {Array<{ amountMinor: number }>} history
 * @returns {{ meanAmount: number, stdAmount: number, count: number }}
 */
export function computeHistoricalStats(history) {
  const count = history.length;
  if (count === 0) {
    return { meanAmount: 0, stdAmount: 1, count: 0 };
  }

  const sum = history.reduce((acc, item) => acc + item.amountMinor, 0);
  const meanAmount = sum / count;

  if (count <= 1) {
    return { meanAmount, stdAmount: 1, count };
  }

  const varianceSum = history.reduce((acc, item) => {
    const diff = item.amountMinor - meanAmount;
    return acc + diff * diff;
  }, 0);

  // Sample standard deviation
  const variance = varianceSum / (count - 1);
  const stdAmount = Math.sqrt(variance);

  return {
    meanAmount,
    stdAmount: stdAmount === 0 ? 1 : stdAmount,
    count
  };
}

/**
 * Extracts a normalized multi-dimensional feature vector for an expense record.
 * 
 * Features:
 *  0: Normalized amount (Z-score standardisation)
 *  1: Category normalized index [0..1]
 *  2: Day-of-week normalized index [0..1]
 * 
 * @param {{ amountMinor: number, category: string, transactionDate: string }} expense
 * @param {{ meanAmount: number, stdAmount: number }} stats
 * @returns {number[]} Normalized feature vector
 */
export function extractFeatureVector(expense, stats) {
  // 1. Amount Z-score
  const normalizedAmount = stats.stdAmount > 0
    ? (expense.amountMinor - stats.meanAmount) / stats.stdAmount
    : 0;

  // 2. Category index
  const catIdx = CATEGORIES.indexOf(expense.category);
  const normalizedCategory = catIdx >= 0 ? catIdx / (CATEGORIES.length - 1) : 1;

  // 3. Day of week from transaction date (YYYY-MM-DD)
  let normalizedDayOfWeek = 0;
  if (expense.transactionDate) {
    const d = new Date(expense.transactionDate);
    if (!isNaN(d.getTime())) {
      normalizedDayOfWeek = d.getUTCDay() / 6; // 0..6 mapped to 0..1
    }
  }

  return [
    Number(normalizedAmount.toFixed(6)),
    Number(normalizedCategory.toFixed(6)),
    Number(normalizedDayOfWeek.toFixed(6))
  ];
}
