
/**
 * @fileOverview AtlasBurn Auto Kill Guardrail Engine
 * 
 * Logic for evaluating telemetry against organizational safety thresholds.
 * Phase 1: Static thresholds only.
 */

import { type UsageRecord } from '@/types/usage';

export type GuardrailMode = 'alert' | 'soft_stop' | 'hard_stop';
export type GuardrailStatus = 'active' | 'throttled' | 'suspended';

export interface GuardrailConfig {
  enabled: boolean;
  dailyBudgetUsd: number;
  hourlyBudgetUsd: number;
  perFeatureBudgetUsd: number;
  maxRetryCascadeRisk: number;
  maxLoopRiskScore: number;
  mode: GuardrailMode;
  status: GuardrailStatus;
}

export interface BreachResult {
  isBreached: boolean;
  triggerType: 'daily_budget' | 'hourly_spike' | 'retry_risk' | 'loop_risk' | 'feature_budget' | null;
  observedValue: number;
  thresholdValue: number;
}

/**
 * Evaluates a project's current usage against its guardrail configuration.
 */
export function evaluateGuardrails(
  config: GuardrailConfig,
  recentUsage: any[], // Usage records from the last 24h
  hourlyUsage: any[], // Usage records from the last 1h
  signals: any // Runtime signals derived from forensic-engine
): BreachResult {
  if (!config || !config.enabled) {
    return { isBreached: false, triggerType: null, observedValue: 0, thresholdValue: 0 };
  }

  // 1. Daily Budget Check
  const dailyTotal = recentUsage.reduce((sum, r) => sum + (r.cost || 0), 0);
  if (config.dailyBudgetUsd > 0 && dailyTotal >= config.dailyBudgetUsd) {
    return { 
      isBreached: true, 
      triggerType: 'daily_budget', 
      observedValue: dailyTotal, 
      thresholdValue: config.dailyBudgetUsd 
    };
  }

  // 2. Hourly Spike Check
  const hourlyTotal = hourlyUsage.reduce((sum, r) => sum + (r.cost || 0), 0);
  if (config.hourlyBudgetUsd > 0 && hourlyTotal >= config.hourlyBudgetUsd) {
    return { 
      isBreached: true, 
      triggerType: 'hourly_spike', 
      observedValue: hourlyTotal, 
      thresholdValue: config.hourlyBudgetUsd 
    };
  }

  // 3. Retry Cascade Risk
  if (config.maxRetryCascadeRisk > 0 && signals.retryRate >= config.maxRetryCascadeRisk) {
    return { 
      isBreached: true, 
      triggerType: 'retry_risk', 
      observedValue: signals.retryRate, 
      thresholdValue: config.maxRetryCascadeRisk 
    };
  }

  // 4. Loop Risk Score
  if (config.maxLoopRiskScore > 0 && signals.loopProbability >= config.maxLoopRiskScore) {
    return { 
      isBreached: true, 
      triggerType: 'loop_risk', 
      observedValue: signals.loopProbability, 
      thresholdValue: config.maxLoopRiskScore 
    };
  }

  return { isBreached: false, triggerType: null, observedValue: 0, thresholdValue: 0 };
}
