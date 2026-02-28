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
  if (dailyBurn <= 0) return 3650; // 10 years (effectively infinite)
  return capital / dailyBurn;
}

/**
 * Simplified forecast for profile health snapshots using the Institutional engine.
 */
export function calculateMonthEndForecast(
  monthlyBurn: number,
  daysElapsed: number,
  totalDays: number,
  mode: 'FLAT' | 'GROWTH',
  growth: number,
  capital: number,
  volatility: number
) {
  const dailyMean = monthlyBurn / (daysElapsed || 1);
  
  // Use the institutional simulation for a quick check
  const sim = runInstitutionalSimulation({
    startingCapital: capital,
    mrr: 0, 
    monthlyGrowthRate: growth,
    churnRate: 0,
    currentDailyBurn: dailyMean,
    burnVolatility: volatility,
    daysRemaining: Math.max(0, totalDays - daysElapsed),
    outageProb: 0.01,
    retryCascadeProb: 0.02,
    runs: 500,
  });

  return {
    probabilityOfRunwayBreach: 1 - sim.survivalProbability,
    projectedMonthEndBurn: sim.p50,
  };
}

export function generateRiskProfile(
  usageRecords: any[],
  organization: any,
  scenarioAdjustments: { growth?: number; volatility?: number } = {}
): ComprehensiveRiskProfile {
  const variance = calculateUsageVariance(usageRecords);
  const mrr = organization?.monthlyRevenue || 15000;
  const capital = organization?.capitalReserves || 100000;
  
  const simInput: InstitutionalSimInput = {
    startingCapital: capital,
    mrr: mrr,
    monthlyGrowthRate: scenarioAdjustments.growth ?? 0.05,
    churnRate: 0.03,
    currentDailyBurn: variance.dailyMean || 100,
    burnVolatility: scenarioAdjustments.volatility ?? variance.cv,
    daysRemaining: 15,
    outageProb: 0.02,
    retryCascadeProb: 0.05,
    runs: 2000,
  };

  const simulation = runInstitutionalSimulation(simInput);
  const marginPercentage = mrr > 0 ? ((mrr - simulation.p50) / mrr) * 100 : 0;
  
  const status = getMarginStatus(1 - simulation.survivalProbability, marginPercentage);
  
  const descriptions: Record<string, string> = {
    "INSOLVENCY RISK": "Critical capital exposure. Volatility exceeds cash reserves. CVaR indicates deep insolvency in stress scenarios.",
    "MARGIN EROSION": "High variance detected. Churn and burn correlation is tightening. Institutional watch required.",
    "CAPITAL SECURE": "Operational stability. Net margin covers P95 stress events. High survival probability."
  };

  return {
    simulation,
    volatility: variance.cv,
    marginStatus: {
      ...status,
      description: descriptions[status.label] || "Unknown risk state."
    }
  };
}
