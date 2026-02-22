'use client';

/**
 * Sleek Probabilistic Engine - v1
 * Implementation of Monte Carlo simulation for API spend risk analysis.
 */

export interface SimulationInput {
  baseDailyCost: number;            // Current average daily API cost
  dailyGrowthRate: number;          // e.g., 0.002 = 0.2% daily growth
  retryStormProbability: number;    // e.g., 0.08 = 8% chance per day
  retryStormMultiplier: number;     // e.g., 1.4 = 40% cost spike
  priceShockProbability: number;    // e.g., 0.03 = 3% chance per day
  priceShockMultiplier: number;     // e.g., 1.2 = 20% model cost increase
  simulationDays: number;           // Usually remaining days in month
  runs: number;                     // e.g., 1000 simulations
  startingCashReserve: number;      // Founder’s available API budget buffer
}

export interface SimulationResult {
  p25: number;                      // 25th percentile (Best Case)
  p50: number;                      // Median (Base Case)
  p90: number;                      // 90th percentile (Stress Case)
  worstCase: number;                // Maximum simulated cost
  average: number;                  // Mean cost
  probabilityOfRunwayBreach: number; // Percentage of runs that exceed cash reserve
}

/**
 * Runs a Monte Carlo simulation to forecast spend volatility.
 */
export function runMonteCarloSimulation(input: SimulationInput): SimulationResult {
  const {
    baseDailyCost,
    dailyGrowthRate,
    retryStormProbability,
    retryStormMultiplier,
    priceShockProbability,
    priceShockMultiplier,
    simulationDays,
    runs,
    startingCashReserve,
  } = input;

  const totalCosts: number[] = [];
  let breachCount = 0;

  for (let r = 0; r < runs; r++) {
    let dailyCost = baseDailyCost;
    let cumulativeCost = 0;
    let breached = false;

    for (let d = 0; d < simulationDays; d++) {
      // 1. Apply compounded daily growth
      dailyCost *= (1 + dailyGrowthRate);

      // 2. Random retry storm check
      if (Math.random() < retryStormProbability) {
        dailyCost *= retryStormMultiplier;
      }

      // 3. Random provider price shock check
      if (Math.random() < priceShockProbability) {
        dailyCost *= priceShockMultiplier;
      }

      cumulativeCost += dailyCost;

      // Track if this specific simulation path ever hits a breach
      if (cumulativeCost > startingCashReserve) {
        breached = true;
      }
    }

    totalCosts.push(cumulativeCost);
    if (breached) {
      breachCount++;
    }
  }

  // Sort to find percentiles
  totalCosts.sort((a, b) => a - b);
  
  const getPercentile = (p: number) => {
    const idx = Math.floor(totalCosts.length * (p / 100));
    return totalCosts[Math.min(idx, totalCosts.length - 1)];
  };

  const sum = totalCosts.reduce((a, b) => a + b, 0);

  return {
    p25: getPercentile(25),
    p50: getPercentile(50),
    p90: getPercentile(90),
    worstCase: totalCosts[totalCosts.length - 1],
    average: sum / runs,
    probabilityOfRunwayBreach: breachCount / runs,
  };
}
