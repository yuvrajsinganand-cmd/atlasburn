'use client';

/**
 * Sleek SDK - Phase 1: Zero-Latency Interceptor
 * 
 * DESIGN PRINCIPLE: Non-Blocking Architecture.
 * The SDK captures metrics asynchronously. If Sleek's logging fails or is slow,
 * the original LLM call remains unaffected. Zero latency injection into production.
 */

import { collection, Firestore } from 'firebase/firestore';
import { normalizeUsage } from './normalization-engine';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface SleekSDKOptions {
  userId: string;
  subId: string;
  firestore: Firestore;
}

export interface MockLLMResponse {
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  output: string;
}

/**
 * Wraps any LLM client to automatically log forensic data without blocking.
 */
export function withSleek(client: any, options: SleekSDKOptions) {
  return {
    async chat(payload: { model: string; messages: any[] }): Promise<MockLLMResponse> {
      // 1. Execute the production call first
      const response: MockLLMResponse = await client.chat(payload);

      // 2. Fire-and-forget logging (Non-blocking)
      // We don't await this, so the app response is never delayed by logging.
      try {
        const normalized = normalizeUsage(
          payload.model,
          response.usage.prompt_tokens,
          response.usage.completion_tokens
        );

        const usageCol = collection(
          options.firestore,
          'users',
          options.userId,
          'aiSubscriptions',
          options.subId,
          'apiUsageRecords'
        );

        // Uses internal non-blocking setDoc/addDoc pattern
        addDocumentNonBlocking(usageCol, {
          timestamp: new Date().toISOString(),
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          cost: normalized.costUsd,
          model: normalized.model,
          provider: normalized.provider,
          apiCallType: 'sdk_wrapped_call',
          isSimulation: false, // Marked as real ingestion
        });
      } catch (e) {
        // Silently catch logging errors to ensure production availability
        console.warn('Sleek: Non-blocking ingestion log skipped due to error.', e);
      }

      return response;
    },
  };
}

/**
 * A mock provider for Phase 1 sandbox testing.
 */
export const fakeLLM = {
  async chat(payload: { model: string }): Promise<MockLLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      usage: {
        prompt_tokens: 1243, // Precise "messy" numbers
        completion_tokens: 812,
      },
      output: `Simulation response for ${payload.model}`,
    };
  },
};
