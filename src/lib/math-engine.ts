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

export function generateRiskProfile(
  usageRecords: any[],
  organization: any,
  scenarioAdjustments: { growth?: number; volatility?: number } = {}
): ComprehensiveRiskProfile {
  // 1. Derive Volatility from Forensic Ledger
  const variance = calculateUsageVariance(usageRecords);
  
  // 2. Prepare Institutional Simulation
  const mrr = organization?.monthlyRevenue || 15000;
  const capital = organization?.capitalReserves || 100000;
  
  const simInput: InstitutionalSimInput = {
    startingCapital: capital,
    mrr: mrr,
    monthlyGrowthRate: scenarioAdjustments.growth ?? 0.05,
    churnRate: 0.03, // Default 3% churn
    currentDailyBurn: variance.dailyMean || 100,
    burnVolatility: scenarioAdjustments.volatility ?? variance.cv,
    daysRemaining: 15, // Mid-month forecast
    outageProb: 0.02,   // 2% chance of daily provider incident
    retryCascadeProb: 0.05, // 5% chance of retry storms
    runs: 2000,
  };

  const simulation = runInstitutionalSimulation(simInput);

  // 3. Define Institutional Risk Tiers
  const marginPercentage = mrr > 0 ? ((mrr - simulation.p50) / mrr) * 100 : 0;
  
  let marginStatus;
  if (simulation.survivalProbability < 0.8 || marginPercentage < 15) {
    marginStatus = {
      label: "INSOLVENCY RISK",
      color: "text-destructive",
      bg: "bg-destructive/10",
      description: "Critical capital exposure. Volatility exceeds cash reserves. CVaR indicates deep insolvency in stress scenarios.",
    };
  } else if (simulation.survivalProbability < 0.95 || marginPercentage < 40) {
    marginStatus = {
      label: "MARGIN EROSION",
      color: "text-amber-600",
      bg: "bg-amber-100",
      description: "High variance detected. Churn and burn correlation is tightening. Institutional watch required.",
    };
  } else {
    marginStatus = {
      label: "CAPITAL SECURE",
      color: "text-green-600",
      bg: "bg-green-100",
      description: "Operational stability. Net margin covers P95 stress events. High survival probability.",
    };
  }

  return {
    simulation,
    volatility: variance.cv,
    marginStatus
  };
}
