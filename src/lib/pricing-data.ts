/**
 * Sleek Pricing Intelligence - v1
 * Real-world token rates for API Providers.
 * Rates are per 1M tokens (Standard pricing as of late 2024).
 */

export interface ModelPricing {
  provider: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

export const PROVIDER_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': {
    provider: 'openai',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
  },
  'o1-preview': {
    provider: 'openai',
    inputCostPer1M: 15.00,
    outputCostPer1M: 60.00,
  },
  // Anthropic
  'claude-3-5-sonnet': {
    provider: 'anthropic',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
  },
  'claude-3-5-haiku': {
    provider: 'anthropic',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.25,
  },
  'claude-3-opus': {
    provider: 'anthropic',
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
  },
};

/**
 * Normalizes provider name for consistent attribution
 */
export function normalizeProvider(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('openai')) return 'openai';
  if (n.includes('anthropic')) return 'anthropic';
  if (n.includes('azure')) return 'azure';
  if (n.includes('google')) return 'google';
  return 'other';
}
