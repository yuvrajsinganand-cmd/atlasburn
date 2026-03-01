'use client';

/**
 * AtlasBurn Institutional Probabilistic Engine v2
 * Advanced Monte Carlo simulation modeling systemic AI risks, stochastic revenue, 
 * and path-dependent insolvency.
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
  p5Burn: number;       // Optimistic case
  p50Burn: number;      // Median forecast
  p95Burn: number;      // Stress case (Absolute)
  var95: number;        // Surprise Delta (P95 - P50)
  cvar95: number;       // Expected Shortfall (Worst 5% tail avg)
  survivalProbability: number;
  expectedRunwayMonths: number; // Median (P50) Runway
  stressRunwayMonths: number;   // Stress (P5) Runway
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
 * Runs a high-fidelity Monte Carlo simulation (10,000+ paths).
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

  const burnTotals: number[] = [];
  const daysToInsolvency: number[] = [];
  let insolvencyCount = 0;

  // Correct Log-Normal Parameter Transformation
  const cv = Math.max(0.01, burnVolatility);
  const sigma = Math.sqrt(Math.log(1 + Math.pow(cv, 2)));
  const mu = Math.log(Math.max(0.001, currentDailyBurn)) - 0.5 * Math.pow(sigma, 2);

  const actualRuns = Math.max(runs, 10000);

  for (let r = 0; r < actualRuns; r++) {
    let periodTotalBurn = 0;
    let pathCapital = startingCapital;
    let currentMrr = mrr;
    let pathInsolventAtDay = -1;
    
    // Monthly growth/churn compounding interval
    const compoundingInterval = 30;

    for (let d = 0; d < daysRemaining; d++) {
      // 1. Compounding Growth/Churn (Applied monthly)
      if (d > 0 && d % compoundingInterval === 0) {
        currentMrr *= (1 + monthlyGrowthRate - churnRate);
      }

      // 2. Generate Stochastic Burn
      const z = gaussianRandom();
      let dailyCost = Math.exp(mu + sigma * z);
      let dailyRevenue = currentMrr / 30;

      // 3. Systemic Risk Injections
      // Outage: Cost Spikes (Incident Response) & Revenue Collapses (Downtime)
      if (Math.random() < outageProb) {
        dailyCost *= (1.5 + Math.random()); // 50% - 150% Spike
        dailyRevenue *= 0.2; // 80% Revenue Loss
      }
      
      // Retry Cascade: Severe Burn Spike
      if (Math.random() < retryCascadeProb) {
        dailyCost *= (2.5 + Math.random() * 2); // 2.5x - 4.5x Spike
      }

      const cost = Math.max(0, dailyCost);
      periodTotalBurn += cost;

      // 4. Update Capital and Check Insolvency
      pathCapital += (dailyRevenue - cost);

      if (pathCapital <= 0 && pathInsolventAtDay === -1) {
        pathInsolventAtDay = d;
        insolvencyCount++;
      }
    }

    burnTotals.push(periodTotalBurn);
    daysToInsolvency.push(pathInsolventAtDay === -1 ? daysRemaining + 1000 : pathInsolventAtDay);
  }

  // Distribution Analysis - Burn
  burnTotals.sort((a, b) => a - b);
  const getBurnP = (p: number) => burnTotals[Math.floor(burnTotals.length * (p / 100))];

  const p5Burn = getBurnP(5);
  const p50Burn = getBurnP(50);
  const p95Burn = getBurnP(95);

  const var95 = Math.max(0, p95Burn - p50Burn);
  const worstTail = burnTotals.slice(Math.floor(burnTotals.length * 0.95));
  const cvar95 = worstTail.reduce((a, b) => a + b, 0) / (worstTail.length || 1);

  // Distribution Analysis - Runway
  daysToInsolvency.sort((a, b) => a - b);
  const getRunwayP = (p: number) => daysToInsolvency[Math.floor(daysToInsolvency.length * (p / 100))];
  
  // Median and Stress Runway
  const p50RunwayDays = getRunwayP(50);
  const p5RunwayDays = getRunwayP(5); // Worst 5% case for runway

  const expectedRunwayMonths = p50RunwayDays / 30;
  const stressRunwayMonths = p5RunwayDays / 30;

  let survivalProbability = (actualRuns - insolvencyCount) / actualRuns;
  
  // High-uncertainty floor
  if (cv > 0.1 && survivalProbability === 1) {
    survivalProbability = 0.999;
  }

  return {
    p5Burn,
    p50Burn,
    p95Burn,
    var95,
    cvar95,
    survivalProbability,
    expectedRunwayMonths,
    stressRunwayMonths
  };
}
