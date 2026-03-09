
/**
 * AtlasBurn AI Runtime Signal Layer
 * 
 * Translates low-level AI behavior into financial risk factors.
 * This bridges the gap between technical system health and capital risk.
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
 * Generates synthetic AI runtime metrics for Demo Mode.
 */
export function generateMockSignals(): RuntimeSignals {
  return {
    tokenVolume: 450000000,
    requestRate: 12.5, // req/sec
    retryRate: 0.045, // 4.5% base retry rate
    loopProbability: 0.012, // 1.2% risk of infinite loop detected by forensics
    contextExpansionRate: 1.4, // multiplier per turn
    modelMix: {
      "Reasoning (o1/Sonnet)": 0.65,
      "Efficiency (4o-mini/Haiku)": 0.35
    }
  };
}

/**
 * Maps AI runtime metrics to deterministic financial engine inputs.
 * 
 * LOGIC MAPPING:
 * - High Retry Rate -> Higher systemic risk of "Retry Cascades"
 * - High Loop Prob -> Higher burn volatility (wider distribution in Monte Carlo)
 * - High Request Rate -> Increased baseline burn and outage probability
 */
export function translateSignalsToEconomicFactors(signals: RuntimeSignals) {
  return {
    // Retry rate directly scales the probability of a catastrophic retry storm
    retryCascadeProb: signals.retryRate * 1.5,
    
    // Loop probability increases the statistical noise (volatility) in the burn model
    burnVolatility: 0.12 + (signals.loopProbability * 5),
    
    // High density traffic increases infrastructure outage risk
    outageProb: 0.01 + (signals.requestRate > 20 ? 0.02 : 0)
  };
}
