'use client';

/**
 * AtlasBurn Probabilistic Engine
 * Implementation of Monte Carlo simulation for API spend risk analysis.
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
 * Calculates survival runway in days based on burn and capital.
 */
export function calculateRunway(dailyBurn: number, capital: number): number {
  if (dailyBurn <= 0) return 3650; // Effectively infinite (10 years)
  return capital / dailyBurn;
}

/**
 * Institutionalized Risk Engine
 * Standardized risk tiers for the AtlasBurn economic system.
 */
export function getMarginStatus(breachProbability: number, marginPercentage: number) {
  if (breachProbability > 0.25 || marginPercentage < 20) {
    return {
      label: "CRITICAL RISK",
      color: "text-destructive",
      bg: "bg-destructive/10",
      description: "Critical Exposure detected. Unit margins are insufficient to support volatility. High probability of capital breach within 30 days.",
    };
  } else if (breachProbability >= 0.10 || marginPercentage < 50) {
    return {
      label: "MARGIN WATCH",
      color: "text-amber-600",
      bg: "bg-amber-100",
      description: "Institutional Watch. Margin compression is accelerating. Forecast variance exceeds safety thresholds.",
    };
  } else {
    return {
      label: "SOLVENT",
      color: "text-green-600",
      bg: "bg-green-100",
      description: "Stable configuration. Burn trajectory remains safely within revenue and capital buffers.",
    };
  }
}
