'use client';

/**
 * Sleek SDK - Phase 1: Local Simulation Wrapper
 * Intercepts LLM calls to log usage and cost metrics to the Decision Engine.
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
 * Wraps a mock or real LLM client to automatically log forensic data.
 * @param client The LLM client to wrap (OpenAI, Anthropic, or Mock)
 * @param options Contextual IDs for logging
 */
export function withSleek(client: any, options: SleekSDKOptions) {
  return {
    /**
     * Simulated or real chat completion
     */
    async chat(payload: { model: string; messages: any[] }): Promise<MockLLMResponse> {
      // 1. Execute the call (Mocked for Phase 1)
      const response: MockLLMResponse = await client.chat(payload);

      // 2. Normalize usage to canonical cost (USD)
      const normalized = normalizeUsage(
        payload.model,
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );

      // 3. Log to Firestore (Non-blocking)
      const usageCol = collection(
        options.firestore,
        'users',
        options.userId,
        'aiSubscriptions',
        options.subId,
        'apiUsageRecords'
      );

      addDocumentNonBlocking(usageCol, {
        timestamp: new Date().toISOString(),
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        cost: normalized.costUsd,
        model: normalized.model,
        provider: normalized.provider,
        apiCallType: 'sdk_wrapped_call',
        isSimulation: true,
      });

      return response;
    },
  };
}

/**
 * A mock provider for Phase 1 testing.
 */
export const fakeLLM = {
  async chat(payload: { model: string }): Promise<MockLLMResponse> {
    // Simulate slight network latency
    await new Promise((resolve) => setTimeout(resolve, 400));
    
    // Return deterministic tokens for verification
    return {
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 800,
      },
      output: `Fake response from ${payload.model}`,
    };
  },
};
