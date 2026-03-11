
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
 * Derives real-world signals from production usage records.
 */
export function deriveSignalsFromRecords(records: any[]): RuntimeSignals {
  if (!records || records.length === 0) {
    return {
      tokenVolume: 0,
      requestRate: 0,
      retryRate: 0,
      loopProbability: 0,
      contextExpansionRate: 1.0,
      modelMix: {}
    };
  }

  const totalTokens = records.reduce((sum, r) => sum + (r.inputTokens || 0) + (r.outputTokens || 0), 0);
  
  // Heuristic for recursion: very high token usage or repetitive feature calls in short windows
  const anomalousCount = records.filter(r => (r.cost || 0) > 1.0).length;
  const retryRate = anomalousCount / records.length;

  // Calculate request rate over the last observed window
  // Ensure we only use records with valid timestamps to avoid NaN in JSON serialization
  const timestamps = records
    .map(r => r.timestamp ? new Date(r.timestamp).getTime() : NaN)
    .filter(t => !isNaN(t))
    .sort((a, b) => b - a);

  let requestRate = 0;
  if (timestamps.length >= 2) {
    const windowMs = timestamps[0] - timestamps[timestamps.length - 1];
    requestRate = windowMs > 0 ? (records.length / (windowMs / 1000)) : 0;
  }

  // Final safety check: ensure all values are finite for JSON serialization
  return {
    tokenVolume: isFinite(totalTokens) ? totalTokens : 0,
    requestRate: isFinite(requestRate) ? Math.min(requestRate, 100) : 0,
    retryRate: isFinite(retryRate) ? retryRate : 0,
    loopProbability: isFinite(retryRate * 0.8) ? retryRate * 0.8 : 0,
    contextExpansionRate: 1.2,
    modelMix: {
      "Production Mix": 1.0
    }
  };
}

/**
 * Maps AI runtime metrics to deterministic financial engine inputs.
 */
export function translateSignalsToEconomicFactors(signals: RuntimeSignals) {
  const retryCascadeProb = isFinite(signals.retryRate * 1.5) ? signals.retryRate * 1.5 : 0;
  const burnVolatility = isFinite(0.12 + (signals.loopProbability * 5)) ? 0.12 + (signals.loopProbability * 5) : 0.12;
  const outageProb = isFinite(0.01 + (signals.requestRate > 20 ? 0.02 : 0)) ? 0.01 + (signals.requestRate > 20 ? 0.02 : 0) : 0.01;

  return {
    retryCascadeProb,
    burnVolatility,
    outageProb
  };
}
