/**
 * Sleek SDK - Production v1.3
 * 
 * DESIGN PRINCIPLE: Server-Side Forensic Ingestion.
 * This SDK MUST only be used in server-side environments (Node.js, Edge).
 * It intercepts LLM usage and forwards it to Sleek's forensic ingestion API.
 */

export interface SleekSDKOptions {
  apiKey: string;    // Sleek Ingest Key (Keep this secret!)
  projectId: string; // User/Org UID
  ingestUrl?: string;
  batchSize?: number;
  maxQueueSize?: number;
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
  private maxQueueSize: number;

  constructor(options: SleekSDKOptions) {
    this.options = {
      ingestUrl: 'https://' + (typeof window !== 'undefined' ? window.location.host : '') + '/api/ingest',
      batchSize: 5,
      maxQueueSize: 100,
      ...options
    };
    this.maxQueueSize = this.options.maxQueueSize || 100;
  }

  /**
   * Enqueues an event for background ingestion.
   * If the queue is full, the oldest event is dropped.
   */
  public enqueue(event: any) {
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift(); // Drop oldest to prevent memory leak
    }
    this.queue.push(event);

    // In serverless environments, we often want to flush immediately 
    // or use ctx.waitUntil. For now, we trigger a flush if batch size is met.
    if (this.queue.length >= (this.options.batchSize || 5)) {
      this.flush();
    }
  }

  /**
   * Flushes the queue to the ingestion API.
   * Ensures only one flush is in-flight at a time.
   */
  public async flush() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const eventsToProcess = [...this.queue];
    this.queue = [];

    try {
      await this.sendWithRetry(eventsToProcess, 0);
    } catch (err) {
      console.warn('Sleek SDK: Final flush failure.', err);
    } finally {
      this.isProcessing = false;
      // If new items were added while we were processing, flush again
      if (this.queue.length >= (this.options.batchSize || 5)) {
        this.flush();
      }
    }
  }

  private async sendWithRetry(events: any[], attempt: number): Promise<void> {
    try {
      const response = await fetch(this.options.ingestUrl!, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: this.options.apiKey,
          projectId: this.options.projectId,
          events: events
        }),
      });

      if (!response.ok) {
        throw new Error(`Sleek Ingest Error: ${response.status}`);
      }
    } catch (err) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWithRetry(events, attempt + 1);
      }
      throw err;
    }
  }
}

let globalIngestor: SleekIngestor | null = null;

/**
 * Wraps an LLM client for forensic ingestion.
 * IMPORTANT: Call this only in Server Components, API Routes, or Server Actions.
 */
export function withSleek(client: any, options: SleekSDKOptions) {
  if (!globalIngestor) {
    globalIngestor = new SleekIngestor(options);
  }

  return {
    async chat(payload: { model: string; messages: any[] }): Promise<MockLLMResponse> {
      // 1. Priority #1: Production call
      const response: MockLLMResponse = await client.chat(payload);

      // 2. Background ingestion (Non-blocking)
      // Note: In serverless, you should ideally await the flush or use ctx.waitUntil
      globalIngestor?.enqueue({
        model: payload.model,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
        },
        metadata: {
          sdk_version: '1.3.0-prod',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        }
      });

      return response;
    },
    // Explicit flush for serverless environments
    async flush() {
      await globalIngestor?.flush();
    }
  };
}

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
