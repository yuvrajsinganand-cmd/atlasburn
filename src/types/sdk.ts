
export type SdkProjectSnapshot = {
  projectId: string;
  isConnected: boolean;
  hasEvents: boolean;
  pricingVersion?: string;
  lastEventAt?: string;
  windowDays: number;

  usage: {
    totalCost: number;
    promptTokens: number;
    completionTokens: number;
    requests: number;
    requestsPerSecond: number;
    byModel: Record<string, { cost: number; promptTokens: number; completionTokens: number; requests: number; avgLatencyMs?: number }>;
    byFeature: Record<string, { cost: number; requests: number; riskContribution: number; status: 'PROTECTED' | 'BREACHED'; trend: number; costPerRequest?: number }>;
    daily: Array<{ date: string; cost: number; promptTokens: number; completionTokens: number; requests: number; risk?: number; delta?: number; volatility?: number; isAnomaly?: boolean; anomalyDetails?: string | null }>;
  };

  economics: {
    mrr?: number;
    currentDailyBurn?: number;
    burnVolatility?: number;
    churnRate?: number;
    monthlyGrowthRate?: number;
    capitalReserves?: number;
    projectedMonthlyBill?: number;
    budgetRunwayDays?: number;
  };

  systemicRisk: {
    outageProb?: number;
    retryCascadeProb?: number;
    scenarioImpactUsd?: number;
    spikeAlerts: Array<{ featureId: string; severity: 'CRITICAL' | 'WARNING'; message: string; costImpact: number }>;
  };

  // AI Runtime Signals (Prototype Layer)
  runtimeSignals?: {
    tokenVolume: number;
    requestRate: number;
    retryRate: number;
    loopProbability: number;
    contextExpansionRate: number;
    modelMix: Record<string, number>;
  };
};

export type EngineResult<T> =
  | { status: 'READY'; result: T }
  | { status: 'NOT_READY'; missing: string[] };

export interface InstitutionalSimResult {
  p5Burn: number;
  p50Burn: number;
  p95Burn: number;
  var95: number;
  cvar95: number;
  survivalProbability: number;
  expectedRunwayMonths: number;
  stressRunwayMonths: number;
  scenarioImpactUsd: number;
}
