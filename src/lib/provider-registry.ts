/**
 * AtlasBurn Provider Registry - Institutional v1.1
 * The authoritative source for AI provider economics and reliability metadata.
 */

export interface ModelEconomics {
  id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'meta' | 'other';
  inputCostPer1M: number;
  outputCostPer1M: number;
  reliabilityScore: number; // 0-1 (outage modeling)
  tier: 'efficiency' | 'reasoning' | 'legacy';
  version: string;
  isFallback?: boolean;
}

export const PROVIDER_REGISTRY: Record<string, ModelEconomics> = {
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    reliabilityScore: 0.999,
    tier: 'reasoning',
    version: '2024-05-13',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    reliabilityScore: 0.999,
    tier: 'efficiency',
    version: '2024-07-18',
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    provider: 'anthropic',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    reliabilityScore: 0.995,
    tier: 'reasoning',
    version: '2024-06-20',
  },
  'o1-preview': {
    id: 'o1-preview',
    provider: 'openai',
    inputCostPer1M: 15.00,
    outputCostPer1M: 60.00,
    reliabilityScore: 0.99,
    tier: 'reasoning',
    version: '2024-09-12',
  },
};

export const FALLBACK_ECONOMICS: ModelEconomics = {
  id: 'fallback-premium',
  provider: 'other',
  inputCostPer1M: 10.00,
  outputCostPer1M: 30.00,
  reliabilityScore: 0.95,
  tier: 'legacy',
  version: '1.0.0',
  isFallback: true,
};

export function getModelEconomics(modelId: string): ModelEconomics {
  return PROVIDER_REGISTRY[modelId] || FALLBACK_ECONOMICS;
}
