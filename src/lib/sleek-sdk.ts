'use client';

/**
 * Sleek SDK - Production v1.1
 * 
 * DESIGN PRINCIPLE: Non-Blocking Forensic Ingestion.
 * Intercepts LLM usage and forwards it to Sleek's forensic ingestion API via 
 * a background queue with retry logic.
 */

export interface SleekSDKOptions {
  apiKey: string;    // Sleek Ingest Key
  projectId: string; // User/Org UID
  ingestUrl?: string;
  batchSize?: number;
  flushInterval?: number;
}

export interface MockLLMResponse {
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  output: string;
}

class SleekIngestor {
  private queue: any[] = [];
  private options: SleekSDKOptions;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;

  constructor(options: SleekSDKOptions) {
    this.options = {
      ingestUrl: '/api/ingest',
      batchSize: 5,
      flushInterval: 5000,
      ...options
    };
  }

  public enqueue(event: any) {
    this.queue.push(event);
    if (this.queue.length >= (this.options.batchSize || 5)) {
      this.flush();
    }
  }

  private async flush() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const eventsToProcess = [...this.queue];
    this.queue = [];

    this.sendWithRetry(eventsToProcess, 0);
    this.isProcessing = false;
  }

  private async sendWithRetry(events: any[], attempt: number) {
    try {
      const response = await fetch(this.options.ingestUrl!, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.apiKey}`
        },
        body: JSON.stringify({
          apiKey: this.options.apiKey,
          projectId: this.options.projectId,
          events: events
        }),
      });

      if (!response.ok && attempt < this.maxRetries) {
        throw new Error(`Sleek Ingest Error: ${response.status}`);
      }
    } catch (err) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        setTimeout(() => this.sendWithRetry(events, attempt + 1), delay);
      } else {
        console.warn('Sleek: Forensic ingestion failed after retries.', err);
      }
    }
  }
}

let globalIngestor: SleekIngestor | null = null;

/**
 * Wraps any LLM client to automatically log forensic data without blocking production traffic.
 */
export function withSleek(client: any, options: SleekSDKOptions) {
  if (!globalIngestor) {
    globalIngestor = new SleekIngestor(options);
  }

  return {
    async chat(payload: { model: string; messages: any[] }): Promise<MockLLMResponse> {
      // 1. Execute the production call first (Priority #1)
      const response: MockLLMResponse = await client.chat(payload);

      // 2. Enqueue for non-blocking ingestion
      globalIngestor?.enqueue({
        model: payload.model,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
        },
        metadata: {
          sdk_version: '1.1.0-prod',
          timestamp: new Date().toISOString(),
        }
      });

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
