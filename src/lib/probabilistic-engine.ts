'use client';

/**
 * AtlasBurn Institutional Probabilistic Engine
 * Advanced Monte Carlo simulation modeling systemic AI risks and churn-sensitive revenue.
 */

export interface InstitutionalSimInput {
  startingCapital: number;
  mrr: number;
  monthlyGrowthRate: number; // Decimal (0.05 = 5%)
  churnRate: number;         // Decimal (0.03 = 3%)
  currentDailyBurn: number;
  burnVolatility: number;    // From variance-engine
  daysRemaining: number;
  
  // Systemic Risk Factors
  outageProb: number;        // Prob of daily provider outage
  retryCascadeProb: number;  // Prob of a cost-amplifying retry storm
  runs: number;
}

export interface InstitutionalSimResult {
  p5: number;   // Efficiency case
  p50: number;  // Median forecast
  p95: number;  // Stress case
  var95: number; // Value at Risk (95% confidence)
  cvar95: number; // Conditional VaR (Expected Shortfall)
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
    let totalMonthBurn = 0;
    
    // Model Daily Stochastic Burn
    for (let d = 0; d < daysRemaining; d++) {
      // 1. Log-normal-ish Brownian Motion shock
      const shock = (Math.random() * 2 - 1) * burnVolatility;
      let dailyCost = currentDailyBurn * (1 + shock);

      // 2. Systemic Event Injections
      if (Math.random() < outageProb) {
        dailyCost *= 0.2; // Burn drops (no traffic) but revenue damage is modeled in MRR churn
      }
      
      if (Math.random() < retryCascadeProb) {
        dailyCost *= (1.8 + Math.random()); // Toxic cost amplification
      }

      totalMonthBurn += Math.max(0, dailyCost);
    }

    // Model Revenue Stochastic Outcome
    const netGrowthMultiplier = (1 + monthlyGrowthRate - churnRate);
    const realizedMonthlyRevenue = mrr * netGrowthMultiplier;
    
    const monthEndCapital = startingCapital + realizedMonthlyRevenue - totalMonthBurn;
    
    if (monthEndCapital <= 0) {
      insolvencyCount++;
    }

    results.push(totalMonthBurn);
  }

  // Distribution Analysis
  results.sort((a, b) => a - b);
  const getP = (p: number) => results[Math.floor(results.length * (p / 100))];

  const p5 = getP(5);
  const p50 = getP(50);
  const p95 = getP(95);

  // VaR = Surprise delta at 95% confidence
  const var95 = p95 - p50;

  // CVaR = Expected shortfall in the worst 5% cases
  const worstTail = results.slice(Math.floor(results.length * 0.95));
  const cvar95 = worstTail.reduce((a, b) => a + b, 0) / (worstTail.length || 1);

  const survivalProbability = (runs - insolvencyCount) / runs;
  
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
