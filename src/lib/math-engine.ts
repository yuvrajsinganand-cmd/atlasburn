/**
 * Sleek Math Engine - Production v2
 * Probabilistic Decision Core.
 */

import { runMonteCarloSimulation, type SimulationInput } from './probabilistic-engine';

export type ForecastMode = 'FLAT' | 'LINEAR' | 'GEOMETRIC';

export interface ForecastScenarios {
  p25: number;
  base: number;
  p90: number;
  probabilityOfRunwayBreach: number;
}

/**
 * Calculates projected month-end bill using Monte Carlo simulation.
 * @param currentSpend Total spend so far this month
 * @param daysElapsed Days passed in the current month
 * @param totalDaysInMonth Default 30
 * @param mode FLAT, LINEAR, or GEOMETRIC
 * @param growthRate Monthly growth expectation (as decimal)
 * @param cashReserve Total monthly budget or reserve
 * @param volatility Retry storm probability (0-1)
 */
export function calculateMonthEndForecast(
  currentSpend: number,
  daysElapsed: number,
  totalDaysInMonth: number = 30,
  mode: ForecastMode = 'FLAT',
  growthRate: number = 0.05,
  cashReserve: number = 10000,
  volatility: number = 0.08
): ForecastScenarios {
  const dailyAvg = daysElapsed > 0 ? currentSpend / daysElapsed : currentSpend;
  const remainingDays = Math.max(0, totalDaysInMonth - daysElapsed);

  // Convert monthly growth expectation to daily for the simulation
  const dailyGrowthRate = mode === 'FLAT' ? 0 : 
                          mode === 'GEOMETRIC' ? Math.pow(1 + growthRate, 1/30) - 1 :
                          growthRate / 30;

  // Run the Monte Carlo Simulation (1000 paths)
  const simInput: SimulationInput = {
    baseDailyCost: dailyAvg,
    dailyGrowthRate,
    retryStormProbability: volatility, // 8% daily chance of anomaly by default
    retryStormMultiplier: 1.4,   // 40% spike in burn during storm
    priceShockProbability: 0.03,  // 3% daily chance of provider price hike
    priceShockMultiplier: 1.2,    // 20% cost increase
    simulationDays: remainingDays,
    runs: 1000,
    startingCashReserve: Math.max(0, cashReserve - currentSpend), // Remaining budget
  };

  const simResult = runMonteCarloSimulation(simInput);

  return {
    p25: currentSpend + simResult.p25,
    base: currentSpend + simResult.p50,
    p90: currentSpend + simResult.p90,
    probabilityOfRunwayBreach: simResult.probabilityOfRunwayBreach,
  };
}

/**
 * Calculates P90 Daily Spend (90th percentile of daily spend over trailing 14 days).
 * This is our primary stability metric.
 */
export function calculateP90DailySpend(dailyCosts: number[]): number {
  if (dailyCosts.length === 0) return 0;
  // We use a trailing 14-day window as defined in the trust layer spec
  const window = dailyCosts.slice(-14);
  const sorted = [...window].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.9);
  return sorted[index];
}

/**
 * Probabilistic Margin Status.
 * Thresholds are based on probability of breach, not just current margin.
 */
export function getMarginStatus(breachProbability: number, margin: number) {
  if (breachProbability > 0.25 || margin < 30) {
    return {
      label: "RISK",
      color: "text-destructive",
      bg: "bg-destructive/10",
      description: `Critical runway risk. There is a ${(breachProbability * 100).toFixed(0)}% probability of exceeding your budget buffer under current volatility.`,
      thresholds: "SAFE: Breach < 10% | WATCH: Breach 10-25% | RISK: Breach > 25%"
    };
  } else if (breachProbability >= 0.10 || margin < 50) {
    return {
      label: "WATCH",
      color: "text-amber-600",
      bg: "bg-amber-100",
      description: `Margin under stress. Volatility simulation detected a ${(breachProbability * 100).toFixed(0)}% chance of breach.`,
      thresholds: "SAFE: Breach < 10% | WATCH: Breach 10-25% | RISK: Breach > 25%"
    };
  } else {
    return {
      label: "SAFE",
      color: "text-green-600",
      bg: "bg-green-100",
      description: "Low volatility risk. Projections suggest 90%+ confidence in staying within budget.",
      thresholds: "SAFE: Breach < 10% | WATCH: Breach 10-25% | RISK: Breach > 25%"
    };
  }
}

/**
 * Runway Projection.
 */
export function calculateRunway(dailySpend: number, currentCash: number, growthRate: number = 0): number {
  if (dailySpend <= 0) return 365;
  
  if (growthRate === 0) {
    return Math.floor(currentCash / dailySpend);
  }

  const val = 1 - (currentCash * (0 - growthRate) / dailySpend);
  if (val <= 0) return 0;
  
  const days = Math.log(val) / Math.log(1 + growthRate/30);
  return Math.max(0, Math.floor(days));
}
