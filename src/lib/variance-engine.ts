
import { type EngineResult } from '@/types/sdk';

export interface UsageVariance {
  dailyMean: number;
  stdDev: number;
  cv: number;
  sampleSize: number;
}

/**
 * Derives statistical volatility (CV) from daily aggregates.
 * No hard-coded fallbacks.
 */
export function calculateUsageVariance(dailyUsage: Array<{ cost: number }>): EngineResult<UsageVariance> {
  const n = dailyUsage.length;
  
  if (n < 7) {
    return { status: 'NOT_READY', missing: ['insufficient_history (min 7 days)'] };
  }

  const values = dailyUsage.map(d => d.cost);
  const mean = values.reduce((a, b) => a + b, 0) / n;

  if (mean <= 0) {
    return { status: 'NOT_READY', missing: ['zero_burn_history'] };
  }

  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  return {
    status: 'READY',
    result: {
      dailyMean: mean,
      stdDev,
      cv,
      sampleSize: n
    }
  };
}
