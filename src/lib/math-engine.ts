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
  if (dailyBurn <= 0) return 3650; 
  return capital / dailyBurn;
}

/**
 * Simplified forecast for profile snapshots.
 */
export function calculateMonthEndForecast(
  monthlyBurn: number,
  daysElapsed: number,
  totalDays: number,
  growth: number,
  capital: number,
  volatility: number
) {
  const dailyMean = monthlyBurn / (daysElapsed || 1);
  
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
    runs: 1000,
  });

  return {
    probabilityOfRunwayBreach: 1 - sim.survivalProbability,
    projectedMonthEndBurn: sim.p50,
  };
}

/**
 * Generates a comprehensive risk profile using forensic variance.
 */
export function generateRiskProfile(
  usageRecords: any[],
  organization: any,
  scenarioAdjustments: { growth?: number; volatility?: number } = {}
): ComprehensiveRiskProfile {
  const variance = calculateUsageVariance(usageRecords);
  
  // Institutional Defaults: $15k MRR, $50k Capital
  const mrr = organization?.monthlyRevenue ?? 15000;
  const capital = organization?.capitalReserves ?? 50000;
  
  const simInput: InstitutionalSimInput = {
    startingCapital: capital,
    mrr: mrr,
    monthlyGrowthRate: scenarioAdjustments.growth ?? 0.05,
    churnRate: 0.03,
    currentDailyBurn: variance.dailyMean || 100,
    burnVolatility: scenarioAdjustments.volatility ?? variance.cv,
    daysRemaining: 20,
    outageProb: 0.02,
    retryCascadeProb: 0.05,
    runs: 2500,
  };

  const simulation = runInstitutionalSimulation(simInput);
  const marginPercentage = mrr > 0 ? ((mrr - simulation.p50) / mrr) * 100 : 0;
  
  const status = getMarginStatus(1 - simulation.survivalProbability, marginPercentage);
  
  const descriptions: Record<string, string> = {
    "INSOLVENCY RISK": "Critical capital exposure. Forensic volatility exceeds reserves. CVaR indicates deep insolvency in tail scenarios.",
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
