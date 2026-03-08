
/**
 * AtlasBurn AI Runtime Signal Layer
 * 
 * Translates low-level AI behavior into financial risk factors.
 */

export interface RuntimeSignals {
  tokenVolume: number;
  requestRate: number;
  retryRate: number;
  loopProbability: number;
  contextExpansionRate: number;
  modelMix: Record<string, number>;
}

/**
 * Generates synthetic AI runtime metrics for Phase 1 prototyping.
 */
export function generateMockSignals(): RuntimeSignals {
  return {
    tokenVolume: 450000000,
    requestRate: 12.5, // req/sec
    retryRate: 0.045, // 4.5%
    loopProbability: 0.012, // 1.2% risk of infinite loop
    contextExpansionRate: 1.4, // multiplier per turn
    modelMix: {
      "Reasoning (o1/Sonnet)": 0.65,
      "Efficiency (4o-mini/Haiku)": 0.35
    }
  };
}

/**
 * Maps AI runtime metrics to existing financial engine inputs.
 * 
 * Logic:
 * - High Retry Rate -> Higher Retry Cascade Probability
 * - High Loop Prob -> Higher Burn Volatility (Variance)
 * - High Request Rate -> Higher Daily Burn
 */
export function translateSignalsToEconomicFactors(signals: RuntimeSignals) {
  return {
    retryCascadeProb: signals.retryRate * 1.5,
    burnVolatility: 0.12 + (signals.loopProbability * 5),
    outageProb: 0.01 + (signals.requestRate > 20 ? 0.02 : 0)
  };
}
