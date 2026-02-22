
'use client';

/**
 * Sleek SDK - Production v1.0
 * 
 * DESIGN PRINCIPLE: Non-Blocking Architecture.
 * Intercepts LLM usage and forwards it to Sleek's forensic ingestion API.
 */

export interface SleekSDKOptions {
  apiKey: string;    // Sleek Ingest Key
  projectId: string; // User/Org UID
  ingestUrl?: string;
}

export interface MockLLMResponse {
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  output: string;
}

/**
 * Wraps any LLM client to automatically log forensic data without blocking production traffic.
 */
export function withSleek(client: any, options: SleekSDKOptions) {
  const ingestUrl = options.ingestUrl || '/api/ingest';

  return {
    async chat(payload: { model: string; messages: any[] }): Promise<MockLLMResponse> {
      // 1. Execute the production call first (Priority #1)
      const response: MockLLMResponse = await client.chat(payload);

      // 2. Fire-and-forget ingestion (Priority #2 - Non-blocking)
      // We use a simple fetch call and do not await it.
      // This ensures Sleek logging has ZERO impact on your response latency.
      try {
        fetch(ingestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: options.apiKey,
            projectId: options.projectId,
            model: payload.model,
            usage: {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
            },
            metadata: {
              sdk_version: '1.0.0-prod',
              timestamp: new Date().toISOString(),
            }
          }),
        }).catch(err => {
          // Fail silently in production to avoid affecting main app
          console.warn('Sleek: Background ingestion failed.', err);
        });
      } catch (e) {
        // Absolute safety catch
      }

      return response;
    },
  };
}

/**
 * A mock provider for sandbox testing.
 */
export const fakeLLM = {
  async chat(payload: { model: string }): Promise<MockLLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      usage: {
        prompt_tokens: 1243,
        completion_tokens: 812,
      },
      output: `Simulation response for ${payload.model}`,
    };
  },
};
