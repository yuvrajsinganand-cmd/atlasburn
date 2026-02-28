/**
 * AtlasBurn Forensic SDK - Institutional v1.6
 * 
 * DESIGN PRINCIPLE: Non-blocking ingestion via background flush.
 * This SDK wraps any LLM client (OpenAI, Anthropic, etc.) and forwards 
 * forensic metadata to the AtlasBurn control plane.
 * 
 * PORTABILITY: This file can be copied into other products to enable 
 * cross-product burn attribution.
 */

export interface SleekSDKOptions {
  apiKey: string;    // Raw Ingest Key (Stored in .env)
  projectId: string; // Your AtlasBurn Project ID
  ingestUrl?: string; // The absolute URL of your AtlasBurn deployment (e.g. https://atlasburn.com/api/ingest)
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

export interface SleekMetadata {
  featureId?: string; // Product feature attribution (e.g., "search_v2")
  userTier?: string;  // Customer segment attribution (e.g., "enterprise")
}

class SleekIngestor {
  private queue: any[] = [];
  private options: SleekSDKOptions;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;

  constructor(options: SleekSDKOptions) {
    this.options = {
      // If no ingestUrl is provided, it defaults to the local path. 
      // For external products, you MUST provide the absolute URL.
      ingestUrl: options.ingestUrl || (typeof window !== 'undefined' 
        ? `${window.location.origin}/api/ingest` 
        : '/api/ingest'),
      batchSize: 5,
      maxQueueSize: 200,
      ...options
    };
  }

  public enqueue(event: any) {
    if (this.queue.length >= (this.options.maxQueueSize || 200)) {
      this.queue.shift(); // Drop oldest to prevent memory leaks
    }
    
    this.queue.push({
      ...event,
      eventId: crypto.randomUUID(), // Forensic replay protection
    });

    // Auto-flush when batch size reached
    if (this.queue.length >= (this.options.batchSize || 5)) {
      this.flush();
    }
  }

  public async flush() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const eventsToProcess = [...this.queue];
    this.queue = [];

    try {
      await this.sendWithRetry(eventsToProcess, 0);
    } catch (err) {
      console.warn('AtlasBurn SDK: Background ingestion failed.', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendWithRetry(events: any[], attempt: number): Promise<void> {
    try {
      const response = await fetch(this.options.ingestUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.options.apiKey,
          projectId: this.options.projectId,
          events: events
        }),
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
    } catch (err) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return this.sendWithRetry(events, attempt + 1);
      }
      throw err;
    }
  }
}

let globalIngestor: SleekIngestor | null = null;

/**
 * Wraps an LLM client with AtlasBurn Forensic Intelligence.
 */
export function withSleek(client: any, options: SleekSDKOptions) {
  if (!globalIngestor) {
    globalIngestor = new SleekIngestor(options);
  }

  return {
    async chat(
      payload: { model: string; messages: any[] } & SleekMetadata
    ): Promise<any> {
      // Execute the actual LLM call
      const response = await client.chat(payload);

      // Extract usage for forensic attribution
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

      // Background enqueue (non-blocking)
      globalIngestor?.enqueue({
        model: payload.model,
        featureId: payload.featureId || 'default',
        userTier: payload.userTier || 'standard',
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
        },
        timestamp: new Date().toISOString(),
      });

      return response;
    },
    
    /** Manual flush for serverless environments (call before exit) */
    async flush() {
      await globalIngestor?.flush();
    }
  };
}

/** Mock client for development validation */
export const fakeLLM = {
  async chat(payload: { model: string }): Promise<MockLLMResponse> {
    await new Promise(r => setTimeout(r, 100));
    return {
      usage: { prompt_tokens: 1200, completion_tokens: 450 },
      output: "AtlasBurn Mock Response"
    };
  }
};
