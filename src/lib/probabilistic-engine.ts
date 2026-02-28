'use client';

/**
 * AtlasBurn Institutional Probabilistic Engine
 * Advanced Monte Carlo simulation modeling systemic AI risks and churn-sensitive revenue.
 * Uses a Log-Normal distribution for burn stochasticity with proper Sigma/Mu transformations.
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
  const u = 1 - Math.random(); 
  const v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Runs a high-fidelity Monte Carlo simulation.
 */
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

  // Surgical Step 2: Correct Log-Normal Parameter Transformation
  // sigma = sqrt(ln(1 + CV^2))
  const cv = Math.max(0.01, burnVolatility);
  const sigma = Math.sqrt(Math.log(1 + Math.pow(cv, 2)));
  // mu = ln(dailyMean) - 0.5 * sigma^2
  const mu = Math.log(Math.max(0.001, currentDailyBurn)) - 0.5 * Math.pow(sigma, 2);

  // Surgical Step 5: High-fidelity run count
  const actualRuns = Math.max(runs, 10000);

  for (let r = 0; r < actualRuns; r++) {
    let periodTotalBurn = 0;
    let pathCapital = startingCapital;
    let pathBroken = false;
    
    // Surgical Step 3: Monthly Aggregation Loop
    // Simulate each day individually and track path-dependent breach
    for (let d = 0; d < daysRemaining; d++) {
      const z = gaussianRandom();
      // Stochastic Daily Cost = exp(mu + sigma * z)
      let dailyCost = Math.exp(mu + sigma * z);

      // Tail Risk Injections
      if (Math.random() < outageProb) {
        dailyCost *= 0.1; // Outage collapse
      }
      
      if (Math.random() < retryCascadeProb) {
        // Retry storm multiplier
        dailyCost *= (2.5 + Math.random() * 2); 
      }

      const cost = Math.max(0, dailyCost);
      periodTotalBurn += cost;

      // Daily cash flow (scaled MRR)
      const dailyRevenue = (mrr * (1 + monthlyGrowthRate - churnRate)) / 30;
      pathCapital += (dailyRevenue - cost);

      if (pathCapital <= 0 && !pathBroken) {
        pathBroken = true;
        insolvencyCount++;
      }
    }

    results.push(periodTotalBurn);
  }

  // Distribution Analysis on AGGREGATED TOTALS
  results.sort((a, b) => a - b);
  const getP = (p: number) => results[Math.floor(results.length * (p / 100))];

  const p5 = getP(5);
  const p50 = getP(50);
  const p95 = getP(95);

  // VaR = Surprise delta at 95% confidence (Stress Case - Median Case)
  const var95 = Math.max(0, p95 - p50);

  // CVaR = Expected shortfall in the worst 5% cases
  const worstTail = results.slice(Math.floor(results.length * 0.95));
  const cvar95 = worstTail.reduce((a, b) => a + b, 0) / (worstTail.length || 1);

  let survivalProbability = (actualRuns - insolvencyCount) / actualRuns;
  
  // Surgical Step 5: Remove Fake Certainty
  if (cv > 0.1 && survivalProbability === 1) {
    survivalProbability = 0.999;
  }

  const periodDays = Math.max(1, daysRemaining);
  const netMonthlyBurn = (p50 / (periodDays / 30)) - mrr;
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
