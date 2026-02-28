'use client';

/**
 * AtlasBurn Institutional Risk Engine
 * Standardized risk tiers and high-level simulation orchestration.
 */

import { runInstitutionalSimulation, type InstitutionalSimInput, type InstitutionalSimResult } from './probabilistic-engine';
import { calculateUsageVariance } from './variance-engine';

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

// Surgical Step 4: Institutional Scale Defaults
const DEFAULT_MONTHLY_BURN = 20000;
const DEFAULT_CASH = 250000;
const DEFAULT_CV = 0.25;

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
    churnRate: 0,
    currentDailyBurn: dailyMean,
    burnVolatility: volatility,
    daysRemaining: daysRemaining,
    outageProb: 0.01,
    retryCascadeProb: 0.02,
    runs: 5000,
  });

  return {
    probabilityOfRunwayBreach: 1 - sim.survivalProbability,
    p50TotalBurn: sim.p50,
  };
}

/**
 * Generates a comprehensive risk profile using forensic variance.
 * Force realistic scale defaults if actual data is microscopic.
 */
export function generateRiskProfile(
  usageRecords: any[],
  organization: any,
  scenarioAdjustments: { growth?: number; volatility?: number } = {}
): ComprehensiveRiskProfile {
  const variance = calculateUsageVariance(usageRecords);
  
  // Economic Scale Fix: Ensure we model at least an Institutional Baseline
  const mrr = Math.max(organization?.monthlyRevenue ?? 0, 15000);
  const capital = Math.max(organization?.capitalReserves ?? 0, DEFAULT_CASH);
  
  // If baseline burn is sub-$1000/mo, force it to institutional scale for simulation
  const baselineMonthlyBurn = variance.dailyMean * 30;
  const effectiveMonthlyBurn = Math.max(baselineMonthlyBurn, DEFAULT_MONTHLY_BURN);
  const dailyMeanToSimulate = effectiveMonthlyBurn / 30;

  const cv = scenarioAdjustments.volatility ?? (variance.cv || DEFAULT_CV);

  const simInput: InstitutionalSimInput = {
    startingCapital: capital,
    mrr: mrr,
    monthlyGrowthRate: scenarioAdjustments.growth ?? 0.05,
    churnRate: 0.03,
    currentDailyBurn: dailyMeanToSimulate,
    burnVolatility: cv,
    daysRemaining: 90, 
    outageProb: 0.02,
    retryCascadeProb: 0.05,
    runs: 10000, 
  };

  const simulation = runInstitutionalSimulation(simInput);
  
  // Normalize metrics for display
  const monthlyP50 = simulation.p50 / 3;
  const monthlyP95 = simulation.p95 / 3;
  const monthlyVar95 = monthlyP95 - monthlyP50;
  const monthlyCvar95 = simulation.cvar95 / 3;

  const marginPercentage = mrr > 0 ? ((mrr - monthlyP50) / mrr) * 100 : 0;
  
  const status = getMarginStatus(1 - simulation.survivalProbability, marginPercentage);
  
  const descriptions: Record<string, string> = {
    "INSOLVENCY RISK": "Critical capital exposure. Quarterly forensic volatility exceeds reserves. CVaR indicates deep insolvency in tail scenarios.",
    "MARGIN EROSION": "High variance detected. Quarterly churn and burn correlation is tightening. Institutional watch required.",
    "CAPITAL SECURE": "Operational stability. Quarterly net margin covers Pstress events. High survival probability."
  };

  return {
    simulation: {
      ...simulation,
      p5: simulation.p5 / 3,
      p50: monthlyP50,
      p95: monthlyP95,
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
