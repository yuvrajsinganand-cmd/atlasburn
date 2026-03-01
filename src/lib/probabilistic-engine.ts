
import { type SdkProjectSnapshot, type EngineResult } from '@/types/sdk';

export interface InstitutionalSimResult {
  p5Burn: number;
  p50Burn: number;
  p95Burn: number;
  var95: number;
  cvar95: number;
  survivalProbability: number;
  expectedRunwayMonths: number;
  stressRunwayMonths: number;
}

function gaussianRandom() {
  const u = 1 - Math.random(); 
  const v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runInstitutionalSimulation(snapshot: SdkProjectSnapshot): EngineResult<InstitutionalSimResult> {
  const missing: string[] = [];
  const { economics, systemicRisk, windowDays } = snapshot;

  if (economics.capitalReserves === undefined) missing.push('capitalReserves');
  if (economics.currentDailyBurn === undefined) missing.push('currentDailyBurn');
  if (economics.burnVolatility === undefined) missing.push('burnVolatility');
  if (economics.mrr === undefined) missing.push('mrr');
  
  if (missing.length > 0) {
    return { status: 'NOT_READY', missing };
  }

  const runs = 10000;
  const days = snapshot.windowDays || 90;
  const burnTotals: number[] = [];
  const daysToInsolvency: number[] = [];
  let insolvencyCount = 0;

  const cv = economics.burnVolatility!;
  const sigma = Math.sqrt(Math.log(1 + Math.pow(cv, 2)));
  const mu = Math.log(economics.currentDailyBurn!) - 0.5 * Math.pow(sigma, 2);

  for (let r = 0; r < runs; r++) {
    let periodTotalBurn = 0;
    let pathCapital = economics.capitalReserves!;
    let currentMrr = economics.mrr!;
    let pathInsolventAtDay = -1;

    for (let d = 0; d < days; d++) {
      if (d > 0 && d % 30 === 0) {
        currentMrr *= (1 + (economics.monthlyGrowthRate || 0) - (economics.churnRate || 0));
      }

      const z = gaussianRandom();
      let dailyCost = Math.exp(mu + sigma * z);
      let dailyRevenue = currentMrr / 30;

      // Systemic shocks
      if (systemicRisk.outageProb && Math.random() < systemicRisk.outageProb) {
        dailyCost *= (1.5 + Math.random());
        dailyRevenue *= 0.2;
      }
      if (systemicRisk.retryCascadeProb && Math.random() < systemicRisk.retryCascadeProb) {
        dailyCost *= (2.5 + Math.random() * 2);
      }

      periodTotalBurn += dailyCost;
      pathCapital += (dailyRevenue - dailyCost);

      if (pathCapital <= 0 && pathInsolventAtDay === -1) {
        pathInsolventAtDay = d;
        insolvencyCount++;
      }
    }
    burnTotals.push(periodTotalBurn);
    daysToInsolvency.push(pathInsolventAtDay === -1 ? days + 1000 : pathInsolventAtDay);
  }

  burnTotals.sort((a, b) => a - b);
  const getBurnP = (p: number) => burnTotals[Math.floor(burnTotals.length * (p / 100))];

  const p50 = getBurnP(50);
  const p95 = getBurnP(95);

  const survivalProbability = (runs - insolvencyCount) / runs;

  return {
    status: 'READY',
    result: {
      p5Burn: getBurnP(5),
      p50Burn: p50,
      p95Burn: p95,
      var95: Math.max(0, p95 - p50),
      cvar95: burnTotals.slice(Math.floor(runs * 0.95)).reduce((a, b) => a + b, 0) / (runs * 0.05),
      survivalProbability,
      expectedRunwayMonths: (daysToInsolvency.sort((a, b) => a - b)[Math.floor(runs * 0.5)]) / 30,
      stressRunwayMonths: (daysToInsolvency[Math.floor(runs * 0.05)]) / 30,
    }
  };
}
