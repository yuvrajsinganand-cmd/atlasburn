'use client';

/**
 * AtlasBurn Institutional Probabilistic Engine
 * Advanced Monte Carlo simulation modeling systemic AI risks and churn-sensitive revenue.
 * Uses a Log-Normal distribution for burn stochasticity (standard for non-negative financial variables).
 */

export interface InstitutionalSimInput {
  startingCapital: number;
  mrr: number;
  monthlyGrowthRate: number; // Decimal (0.05 = 5%)
  churnRate: number;         // Decimal (0.03 = 3%)
  currentDailyBurn: number;
  burnVolatility: number;    // From variance-engine (Coefficient of Variation)
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

/**
 * Standard Box-Muller transform to generate Gaussian (Normal) random variables.
 */
function gaussianRandom() {
  const u = 1 - Math.random(); // Converting [0,1) to (0,1]
  const v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
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

  // Pre-calculate drift for Log-Normal expected value maintenance
  // E[X] = exp(mu + sigma^2 / 2). To keep E[X] = currentDailyBurn, mu = ln(currentDailyBurn) - sigma^2 / 2
  const sigma = Math.max(0.01, burnVolatility); 

  for (let r = 0; r < runs; r++) {
    let totalMonthBurn = 0;
    
    // Model Daily Stochastic Burn
    for (let d = 0; d < daysRemaining; d++) {
      // 1. Log-Normal Shock (Geometric Brownian Motion component)
      // This ensures dailyCost is never negative and captures exponential spikes.
      const z = gaussianRandom();
      const drift = -0.5 * Math.pow(sigma, 2);
      const shock = Math.exp(drift + z * sigma);
      let dailyCost = currentDailyBurn * shock;

      // 2. Systemic Event Injections (Tail Risks)
      if (Math.random() < outageProb) {
        dailyCost *= 0.1; // Burn collapses during outage
      }
      
      if (Math.random() < retryCascadeProb) {
        // Retry storms amplify cost exponentially
        dailyCost *= (2.5 + Math.random() * 2); 
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

  // VaR = Surprise delta at 95% confidence (P95 - Median)
  const var95 = Math.max(0, p95 - p50);

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
