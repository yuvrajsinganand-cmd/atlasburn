/**
 * Sleek Normalization Engine
 * Converts raw provider usage into canonical cost events.
 */

import { PROVIDER_PRICING, type ModelPricing } from './pricing-data';

export interface SleekEvent {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * Calculates real-world cost based on model-specific pricing distribution.
 */
export function normalizeUsage(modelId: string, inputTokens: number, outputTokens: number): SleekEvent {
  const pricing: ModelPricing | undefined = PROVIDER_PRICING[modelId];

  if (!pricing) {
    // Fallback to a generic high-tier rate if model is unknown
    const fallbackCost = (inputTokens + outputTokens) * 0.00001; 
    return {
      model: modelId,
      provider: 'unknown',
      inputTokens,
      outputTokens,
      costUsd: fallbackCost
    };
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1M;

  return {
    model: modelId,
    provider: pricing.provider,
    inputTokens,
    outputTokens,
    costUsd: inputCost + outputCost
  };
}
