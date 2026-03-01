'use client';

/**
 * AtlasBurn Institutional Risk Engine v2
 * Standardized risk tiers and high-level simulation orchestration.
 */

import { runInstitutionalSimulation, type InstitutionalSimInput, type InstitutionalSimResult } from './probabilistic-engine';
import { calculateUsageVariance } from './variance-engine';
import { INSTITUTIONAL_DEFAULTS, RISK_LEVELS } from './risk-config';

export interface ComprehensiveRiskProfile {
  simulation: InstitutionalSimResult;
  volatility: number;
  baselineMonthlyBurn: number;
  marginStatus: {
    label: string;
    color: string;
    bg: string;
    description: string;
  };
}

/**
 * Institutional standard for status categorization.
 */
export function getMarginStatus(breachProb: number, margin: number) {
  if (breachProb > 0.2 || margin < 20) {
    return {
      label: "INSOLVENCY RISK",
      color: "text-destructive",
      bg: "bg-destructive/10",
    };
  }
  if (breachProb > 0.05 || margin < 40) {
    return {
      label: "MARGIN EROSION",
      color: "text-amber-600",
      bg: "bg-amber-100",
    };
  }
  return {
    label: "CAPITAL SECURE",
    color: "text-green-600",
    bg: "bg-green-100",
  };
}

/**
 * Simple linear runway calculation in days.
 */
export function calculateRunway(dailyBurn: number, capital: number): number {
  if (dailyBurn <= 0) return 3650; 
  return capital / dailyBurn;
}

/**
 * Generates a health forecast for specific windows.
 */
export function calculateMonthEndForecast(
  currentBurn: number,
  daysElapsed: number,
  totalDays: number,
  growth: number,
  capital: number,
  volatility: number
) {
  const daysRemaining = Math.max(1, totalDays - daysElapsed);
  const dailyMean = currentBurn / (daysElapsed || 1);
  
  const sim = runInstitutionalSimulation({
    startingCapital: capital,
    mrr: 0,
    monthlyGrowthRate: growth,
    churnRate: INSTITUTIONAL_DEFAULTS.CHURN_RATE,
    currentDailyBurn: dailyMean,
    burnVolatility: volatility,
    daysRemaining: daysRemaining,
    outageProb: INSTITUTIONAL_DEFAULTS.OUTAGE_PROBABILITY,
    retryCascadeProb: INSTITUTIONAL_DEFAULTS.RETRY_CASCADE_PROBABILITY,
    runs: INSTITUTIONAL_DEFAULTS.SIMULATION_RUNS,
  });

  return {
    probabilityOfRunwayBreach: 1 - sim.survivalProbability,
    p50TotalBurn: sim.p50Burn,
  };
}

/**
 * Generates a comprehensive risk profile using forensic variance.
 */
export function generateRiskProfile(
  usageRecords: any[],
  organization: any,
  scenarioAdjustments: { growth?: number; volatility?: number; daysRemaining?: number; churn?: number } = {}
): ComprehensiveRiskProfile {
  const variance = calculateUsageVariance(usageRecords);
  
  const mrr = Math.max(organization?.monthlyRevenue ?? 0, 15000);
  const capital = Math.max(organization?.capitalReserves ?? 0, INSTITUTIONAL_DEFAULTS.CAPITAL_RESERVES);
  const fixedBurnFloor = organization?.fixedMonthlyBurn ?? INSTITUTIONAL_DEFAULTS.MONTHLY_BURN_FLOOR;

  const baselineMonthlyBurn = variance.dailyMean * 30;
  const effectiveMonthlyBurn = Math.max(baselineMonthlyBurn, fixedBurnFloor);
  const dailyMeanToSimulate = effectiveMonthlyBurn / 30;

  const cv = scenarioAdjustments.volatility ?? (variance.cv || INSTITUTIONAL_DEFAULTS.COEFFICIENT_OF_VARIATION);
  const daysToSimulate = scenarioAdjustments.daysRemaining ?? 90;

  const simInput: InstitutionalSimInput = {
    startingCapital: capital,
    mrr: mrr,
    monthlyGrowthRate: scenarioAdjustments.growth ?? INSTITUTIONAL_DEFAULTS.MONTHLY_GROWTH,
    churnRate: scenarioAdjustments.churn ?? INSTITUTIONAL_DEFAULTS.CHURN_RATE,
    currentDailyBurn: dailyMeanToSimulate,
    burnVolatility: cv,
    daysRemaining: daysToSimulate, 
    outageProb: INSTITUTIONAL_DEFAULTS.OUTAGE_PROBABILITY,
    retryCascadeProb: INSTITUTIONAL_DEFAULTS.RETRY_CASCADE_PROBABILITY,
    runs: INSTITUTIONAL_DEFAULTS.SIMULATION_RUNS, 
  };

  const simulation = runInstitutionalSimulation(simInput);
  
  // Normalize window totals to monthly for display consistency
  const windowMonths = Math.max(1, daysToSimulate / 30);
  const monthlyP50 = simulation.p50Burn / windowMonths;
  const monthlyP95 = simulation.p95Burn / windowMonths;
  const monthlyVar95 = simulation.var95 / windowMonths;
  const monthlyCvar95 = simulation.cvar95 / windowMonths;

  const marginPercentage = mrr > 0 ? ((mrr - monthlyP50) / mrr) * 100 : 0;
  const status = getMarginStatus(1 - simulation.survivalProbability, marginPercentage);
  
  const descriptions: Record<string, string> = {
    "INSOLVENCY RISK": "Critical capital exposure. Forensic volatility exceeds reserves. Expected shortfall (CVaR) indicates deep insolvency in tail scenarios.",
    "MARGIN EROSION": "High variance detected. Institutional watch required as churn-to-burn correlation tightens.",
    "CAPITAL SECURE": "Operational stability. Net margin comfortably absorbs P95 stress events."
  };

  return {
    simulation: {
      ...simulation,
      p5Burn: simulation.p5Burn / windowMonths,
      p50Burn: monthlyP50,
      p95Burn: monthlyP95,
      var95: monthlyVar95,
      cvar95: monthlyCvar95,
    },
    volatility: cv,
    baselineMonthlyBurn: effectiveMonthlyBurn,
    marginStatus: {
      ...status,
      description: descriptions[status.label] || "Unknown risk state."
    }
  };
}
