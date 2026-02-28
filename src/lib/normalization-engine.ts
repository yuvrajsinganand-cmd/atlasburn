/**
 * AtlasBurn Normalization Engine
 * Converts raw provider usage into canonical forensic cost events using the Registry.
 */

import { getModelEconomics, type ModelEconomics } from './provider-registry';

export interface SleekEvent {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  isFallback: boolean;
}

/**
 * Calculates real-world cost based on Institutional Registry rates.
 */
export function normalizeUsage(modelId: string, inputTokens: number, outputTokens: number): SleekEvent {
  const economics = getModelEconomics(modelId);

  const inputCost = (inputTokens / 1_000_000) * economics.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * economics.outputCostPer1M;

  return {
    model: economics.id,
    provider: economics.provider,
    inputTokens,
    outputTokens,
    costUsd: inputCost + outputCost,
    isFallback: !!economics.isFallback
  };
}
