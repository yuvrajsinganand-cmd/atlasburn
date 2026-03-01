/**
 * AtlasBurn Forensic SDK - Institutional v1.7
 * 
 * DESIGN PRINCIPLE: Non-blocking ingestion via background flush.
 * This SDK wraps any LLM client (OpenAI, Anthropic, etc.) and forwards 
 * forensic metadata to the AtlasBurn control plane.
 */

export interface SleekSDKOptions {
  apiKey: string;    // Raw Ingest Key (Stored in .env)
  projectId: string; // Your AtlasBurn Project ID
  ingestUrl?: string; // The absolute URL of your AtlasBurn deployment
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
  featureId?: string; // Product feature attribution
  userTier?: string;  // Customer segment attribution
}

/**
 * Universal UUID generator with fallback for non-browser/legacy environments.
 */
function generateForensicId(): string {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch (e) { /* Fallback */ }
  return `slk-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

class SleekIngestor {
  private queue: any[] = [];
  private options: SleekSDKOptions;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;

  constructor(options: SleekSDKOptions) {
    this.options = {
      // Ingest URL defaults to origin if in browser, or local path.
      // Remote products MUST specify the full absolute URL.
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
      eventId: generateForensicId(), // Forensic replay protection
    });

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

      // Fixed: Only throw on failure.
      if (!response.ok) {
        throw new Error(`Atlas Ingest Failure: Status ${response.status}`);
      }
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
      const response = await client.chat(payload);
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

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
    
    async flush() {
      await globalIngestor?.flush();
    }
  };
}

export const fakeLLM = {
  async chat(payload: { model: string }): Promise<MockLLMResponse> {
    await new Promise(r => setTimeout(r, 100));
    return {
      usage: { prompt_tokens: 1200, completion_tokens: 450 },
      output: "AtlasBurn Mock Response"
    };
  }
};
