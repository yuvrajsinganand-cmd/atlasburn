/**
 * Sleek Math Engine - Production v2.1
 * Probabilistic Decision Core with Runway Extension Logic.
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
 * Calculates how many extra days of runway an optimization buys the founder.
 */
export function calculateRunwayExtension(
  currentDailyBurn: number,
  monthlySavings: number,
  currentCash: number
): number {
  if (currentDailyBurn <= 0) return 0;
  
  const dailySavings = monthlySavings / 30;
  const optimizedBurn = Math.max(0.1, currentDailyBurn - dailySavings);
  
  const originalRunway = currentCash / currentDailyBurn;
  const optimizedRunway = currentCash / optimizedBurn;
  
  return Math.floor(optimizedRunway - originalRunway);
}

export function getMarginStatus(breachProbability: number, margin: number) {
  if (breachProbability > 0.25 || margin < 30) {
    return {
      label: "RISK",
      color: "text-destructive",
      bg: "bg-destructive/10",
      description: `Critical runway risk. Your spend is currently burning through capital at a rate that yields a ${(breachProbability * 100).toFixed(0)}% probability of total budget exhaustion.`,
      thresholds: "SAFE: Breach < 10% | WATCH: Breach 10-25% | RISK: Breach > 25%"
    };
  } else if (breachProbability >= 0.10 || margin < 50) {
    return {
      label: "WATCH",
      color: "text-amber-600",
      bg: "bg-amber-100",
      description: `Margin under stress. Volatility simulation detected a ${(breachProbability * 100).toFixed(0)}% chance of breach. This usually precedes a pivot or a fundraising emergency.`,
      thresholds: "SAFE: Breach < 10% | WATCH: Breach 10-25% | RISK: Breach > 25%"
    };
  } else {
    return {
      label: "SAFE",
      color: "text-green-600",
      bg: "bg-green-100",
      description: "Low volatility risk. Your burn trajectory is sustainable within current cash reserves with 90%+ confidence.",
      thresholds: "SAFE: Breach < 10% | WATCH: Breach 10-25% | RISK: Breach > 25%"
    };
  }
}

export function calculateRunway(dailySpend: number, currentCash: number, growthRate: number = 0): number {
  if (dailySpend <= 0) return 365;
  if (growthRate === 0) return Math.floor(currentCash / dailySpend);
  const val = 1 - (currentCash * (0 - growthRate) / dailySpend);
  if (val <= 0) return 0;
  const days = Math.log(val) / Math.log(1 + growthRate/30);
  return Math.max(0, Math.floor(days));
}
