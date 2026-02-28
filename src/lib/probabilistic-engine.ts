'use client';

/**
 * AtlasBurn Institutional Probabilistic Engine
 * Advanced Monte Carlo simulation modeling systemic AI risks and churn-sensitive revenue.
 */

export interface InstitutionalSimInput {
  startingCapital: number;
  mrr: number;
  monthlyGrowthRate: number; // e.g. 0.05 for 5%
  churnRate: number;         // e.g. 0.02 for 2%
  currentDailyBurn: number;
  burnVolatility: number;    // From variance engine
  daysRemaining: number;
  
  // Systemic Risk Factors
  outageProb: number;        // Probability of daily provider outage
  retryCascadeProb: number;  // Probability of a cost-amplifying retry loop
  runs: number;
}

export interface InstitutionalSimResult {
  p5: number;   // Best case (95th percentile cost reduction)
  p50: number;  // Median
  p95: number;  // Stress case (95th percentile cost spike)
  var95: number; // Value at Risk: The cost spike at 95% confidence
  cvar95: number; // Conditional VaR: The average cost in the worst 5% of cases
  survivalProbability: number;
  expectedRunwayMonths: number;
}

export function runInstitutionalSimulation(input: InstitutionalSimInput): InstitutionalSimResult {
  const {
    startingCapital,
    mrr,
    monthlyGrowthRate,
    churnRate,
    currentDailyBurn,
    burnVolatility,
    daysRemaining,
    outageProb,
    retryCascadeProb,
    runs
  } = input;

  const results: number[] = [];
  let insolvencyCount = 0;

  for (let r = 0; r < runs; r++) {
    let simCapital = startingCapital;
    let simDailyBurn = currentDailyBurn;
    let totalMonthBurn = 0;
    
    // Model Daily Burn Progression
    for (let d = 0; d < daysRemaining; d++) {
      // 1. Brownian Motion Burn (Volatility)
      // cost = cost * (1 + volatility * Z) where Z is normal random
      const drift = 0; // Simple drift-less for now
      const shock = (Math.random() * 2 - 1) * burnVolatility;
      let dailyCost = simDailyBurn * (1 + shock);

      // 2. Systemic Risk Shocks
      if (Math.random() < outageProb) {
        // Outages actually reduce burn but kill revenue (revenue hit is monthly so we model burn hit here)
        dailyCost *= 0.1; 
      }
      
      if (Math.random() < retryCascadeProb) {
        // Retry loops amplify cost without providing user value
        dailyCost *= (1.5 + Math.random());
      }

      totalMonthBurn += dailyCost;
    }

    // Model Monthly Revenue Outcome (Churn + Growth)
    const netRevenueMultiplier = (1 + monthlyGrowthRate - churnRate);
    const realizedMonthlyRevenue = mrr * netRevenueMultiplier;
    
    const monthEndCapital = simCapital + realizedMonthlyRevenue - totalMonthBurn;
    
    if (monthEndCapital <= 0) {
      insolvencyCount++;
    }

    results.push(totalMonthBurn);
  }

  // Calculate Percentiles
  results.sort((a, b) => a - b);
  const getP = (p: number) => results[Math.floor(results.length * (p / 100))];

  const p5 = getP(5);
  const p50 = getP(50);
  const p95 = getP(95);

  // VaR = p95 - p50 (The surprise delta at 95% confidence)
  const var95 = p95 - p50;

  // CVaR = Average of top 5% of results
  const worstFivePercent = results.slice(Math.floor(results.length * 0.95));
  const cvar95 = worstFivePercent.reduce((a, b) => a + b, 0) / worstFivePercent.length;

  const survivalProbability = (runs - insolvencyCount) / runs;
  
  // Simple runway heuristic: Capital / (Monthly Burn - Monthly Revenue)
  const netMonthlyBurn = p50 - mrr;
  const expectedRunwayMonths = netMonthlyBurn > 0 ? startingCapital / netMonthlyBurn : 120;

  return {
    p5,
    p50,
    p95,
    var95,
    cvar95,
    survivalProbability,
    expectedRunwayMonths
  };
}
