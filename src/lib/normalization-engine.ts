
/**
 * AtlasBurn Normalization Engine (Diagnostic v1.1)
 */

import { getModelEconomics } from './provider-registry';

export interface AtlasBurnEvent {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  isFallback: boolean;
}

export function normalizeUsage(modelId: string, inputTokens: number, outputTokens: number): AtlasBurnEvent {
  console.log(`[AtlasBurn-Normalization] Normalizing usage for model: ${modelId}. I/O: ${inputTokens}/${outputTokens}`);
  const economics = getModelEconomics(modelId);

  const inputCost = (inputTokens / 1_000_000) * economics.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * economics.outputCostPer1M;
  const totalCost = inputCost + outputCost;

  console.log(`[AtlasBurn-Normalization] Result: Provider=${economics.provider}, Cost=$${totalCost.toFixed(6)}`);

  return {
    model: economics.id,
    provider: economics.provider,
    inputTokens,
    outputTokens,
    costUsd: totalCost,
    isFallback: !!economics.isFallback
  };
}
