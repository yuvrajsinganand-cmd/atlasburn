
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
    byModel: Record<string, { cost: number; promptTokens: number; completionTokens: number; requests: number; avgLatencyMs?: number }>;
    daily: Array<{ date: string; cost: number; promptTokens: number; completionTokens: number; requests: number }>;
  };

  economics: {
    mrr?: number;
    currentDailyBurn?: number;
    burnVolatility?: number;
    churnRate?: number;
    monthlyGrowthRate?: number;
    capitalReserves?: number;
  };

  systemicRisk: {
    outageProb?: number;
    retryCascadeProb?: number;
  };
};

export type EngineResult<T> =
  | { status: 'READY'; result: T }
  | { status: 'NOT_READY'; missing: string[] };
