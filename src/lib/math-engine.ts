/**
 * Sleek Math Engine - Production v1
 * Implementation of Scenario Bands, Multi-mode Forecasting, and P90 Risk.
 */

export type ForecastMode = 'FLAT' | 'LINEAR' | 'GEOMETRIC';

export interface ForecastScenarios {
  p25: number; // Best case (Low usage/Efficiency)
  base: number; // Expected case
  p90: number; // Stress case (High usage/Spikes)
}

/**
 * Calculates projected month-end bill based on trajectory and mode.
 */
export function calculateMonthEndForecast(
  currentSpend: number,
  daysElapsed: number,
  totalDaysInMonth: number = 30,
  mode: ForecastMode = 'FLAT',
  growthRate: number = 0.05 // e.g., 5% monthly growth
): ForecastScenarios {
  const dailyAvg = daysElapsed > 0 ? currentSpend / daysElapsed : currentSpend;
  const remainingDays = Math.max(0, totalDaysInMonth - daysElapsed);

  let projectedRemaining: number;

  switch (mode) {
    case 'LINEAR':
      // Adds a fixed % of daily avg as growth per day
      const dailyGrowth = (dailyAvg * growthRate) / 30;
      projectedRemaining = 0;
      for (let i = 1; i <= remainingDays; i++) {
        projectedRemaining += dailyAvg + (dailyGrowth * i);
      }
      break;
    case 'GEOMETRIC':
      // Compound growth
      const dailyRate = Math.pow(1 + growthRate, 1/30);
      projectedRemaining = dailyAvg * (Math.pow(dailyRate, remainingDays + 1) - 1) / (dailyRate - 1) - dailyAvg;
      break;
    case 'FLAT':
    default:
      projectedRemaining = dailyAvg * remainingDays;
      break;
  }

  const base = currentSpend + projectedRemaining;

  return {
    p25: base * 0.85, // Assumes 15% efficiency gain or low traffic
    base: base,
    p90: base * 1.4, // Assumes 40% spike/retry storm
  };
}

/**
 * Calculates P90 Daily Spend (90th percentile of daily spend over trailing window).
 */
export function calculateP90DailySpend(dailyCosts: number[]): number {
  if (dailyCosts.length === 0) return 0;
  const sorted = [...dailyCosts].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.9);
  return sorted[index];
}

/**
 * Enhanced Margin Status with Explainability.
 */
export function getMarginStatus(margin: number) {
  if (margin >= 50) {
    return {
      label: "SAFE",
      color: "text-green-600",
      bg: "bg-green-100",
      description: "Margin buffer exceeds 50%. Unit economics are healthy.",
      thresholds: "SAFE > 50% | WATCH < 50% | RISK < 30%"
    };
  } else if (margin >= 30) {
    return {
      label: "WATCH",
      color: "text-amber-600",
      bg: "bg-amber-100",
      description: "Margin dropping. Model cost density is high relative to revenue.",
      thresholds: "SAFE > 50% | WATCH < 50% | RISK < 30%"
    };
  } else {
    return {
      label: "RISK",
      color: "text-destructive",
      bg: "bg-destructive/10",
      description: "Critical margin erosion. AI costs are consuming product value.",
      thresholds: "SAFE > 50% | WATCH < 50% | RISK < 30%"
    };
  }
}

/**
 * Runway Projection with Forecast Scenarios.
 */
export function calculateRunway(dailySpend: number, currentCash: number, growthRate: number = 0): number {
  if (dailySpend <= 0) return 365; // Default to 1 year for zero burn
  
  if (growthRate === 0) {
    return Math.floor(currentCash / dailySpend);
  }

  const val = 1 - (currentCash * (0 - growthRate) / dailySpend);
  if (val <= 0) return 0;
  
  const days = Math.log(val) / Math.log(1 + growthRate/30);
  return Math.max(0, Math.floor(days));
}
