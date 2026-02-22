/**
 * Sleek Math Engine - Production v2.2
 * Probabilistic Decision Core with Institutional Risk Tiers.
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

  const dailyGrowthRate = mode === 'FLAT' ? 0 : 
                          mode === 'GEOMETRIC' ? Math.pow(1 + growthRate, 1/30) - 1 :
                          growthRate / 30;

  const simInput: SimulationInput = {
    baseDailyCost: dailyAvg,
    dailyGrowthRate,
    retryStormProbability: volatility,
    retryStormMultiplier: 1.4,
    priceShockProbability: 0.03,
    priceShockMultiplier: 1.2,
    simulationDays: remainingDays,
    runs: 1000,
    startingCashReserve: Math.max(0, cashReserve - currentSpend),
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
 * Institutionalized Risk Engine
 * Fuses statistical probability with operational status.
 */
export function getMarginStatus(breachProbability: number, margin: number) {
  if (breachProbability > 0.25 || margin < 30) {
    return {
      label: "CRITICAL",
      color: "text-destructive",
      bg: "bg-destructive/10",
      description: `Critical Exposure. Your current burn trajectory has a high statistical probability of exceeding capital reserves. Historically, this risk intensity correlates with immediate operational solvency risks.`,
      thresholds: "STABLE: < 10% | WATCH: 10-25% | CRITICAL: > 25%"
    };
  } else if (breachProbability >= 0.10 || margin < 50) {
    return {
      label: "WATCH",
      color: "text-amber-600",
      bg: "bg-amber-100",
      description: `Institutional Watch. Monte Carlo simulation identifies a ${(breachProbability * 100).toFixed(0)}% variance. Historically, sustained breach probability at this level correlates with early-stage runway compression events.`,
      thresholds: "STABLE: < 10% | WATCH: 10-25% | CRITICAL: > 25%"
    };
  } else {
    return {
      label: "STABLE",
      color: "text-green-600",
      bg: "bg-green-100",
      description: "Stable Configuration. Low volatility risk detected. Historical analysis indicates that sustained breach probability below 10% correlates with high runway predictability.",
      thresholds: "STABLE: < 10% | WATCH: 10-25% | CRITICAL: > 25%"
    };
  }
}

export function calculateRunway(dailySpend: number, currentCash: number, growthRate: number = 0): number {
  if (dailySpend <= 0) return 365 * 2; // Cap at 2 years
  if (growthRate === 0) return Math.floor(currentCash / dailySpend);
  
  // N = log(1 - (Cash * -Growth / Daily)) / log(1 + Growth)
  // Simplified for daily resolution
  const val = 1 - (currentCash * (0 - growthRate/30) / dailySpend);
  if (val <= 0) return 0;
  const days = Math.log(val) / Math.log(1 + growthRate/30);
  return Math.max(0, Math.floor(days));
}
