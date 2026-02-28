/**
 * AtlasBurn Variance Engine
 * Derives statistical volatility and standard deviation from forensic usage history.
 */

export interface UsageVariance {
  dailyMean: number;
  stdDev: number;
  cv: number; // Coefficient of Variation (Volatility)
  sampleSize: number;
  isStatisticallySignificant: boolean;
}

/**
 * Derives statistical volatility (CV) from a series of usage records.
 */
export function calculateUsageVariance(records: any[]): UsageVariance {
  if (!records || records.length < 3) {
    // Default fallback for low-data scenarios
    return { dailyMean: 0, stdDev: 0, cv: 0.15, sampleSize: records.length, isStatisticallySignificant: false };
  }

  // 1. Group by day to normalize forensic event spikes
  const dailyTotals: Record<string, number> = {};
  records.forEach(rec => {
    const date = new Date(rec.timestamp).toISOString().split('T')[0];
    dailyTotals[date] = (dailyTotals[date] || 0) + (rec.cost || 0);
  });

  const values = Object.values(dailyTotals);
  const n = values.length;
  
  if (n < 2) return { dailyMean: values[0] || 0, stdDev: 0, cv: 0.1, sampleSize: n, isStatisticallySignificant: false };

  // 2. Compute Mean
  const mean = values.reduce((a, b) => a + b, 0) / n;

  // 3. Compute Standard Deviation
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  // 4. Compute CV (Volatility measure for Monte Carlo)
  // Higher CV = Higher uncertainty in burn
  const cv = mean > 0 ? stdDev / mean : 0.1;

  return {
    dailyMean: mean,
    stdDev,
    cv: Math.max(0.05, cv), // Floor at 5% for simulation sanity
    sampleSize: n,
    isStatisticallySignificant: n >= 7,
  };
}
