
/**
 * AtlasBurn Forensic SDK - Institutional v1.2.0
 * 
 * DESIGN PRINCIPLE: Non-blocking ingestion via background flush.
 * Now supporting 2-Step Simplified Install & Auto-Detection Mode.
 */

export interface AtlasBurnSDKOptions {
  apiKey: string;    
  projectId?: string; // Optional: Resolved server-side if omitted
  ingestUrl?: string; // Optional: Defaults to AtlasBurn production
  batchSize?: number;
  maxQueueSize?: number;
}

export interface AtlasBurnMetadata {
  featureId?: string; 
  userTier?: string;  
}

const DEFAULT_INGEST_URL = "https://app.atlasburn.com/api/ingest";

function generateForensicId(): string {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch (e) { }
  return `abn-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

class AtlasBurnIngestor {
  private queue: any[] = [];
  private options: AtlasBurnSDKOptions;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;

  constructor(options: AtlasBurnSDKOptions) {
    this.options = {
      ingestUrl: options.ingestUrl || DEFAULT_INGEST_URL,
      batchSize: 5,
      maxQueueSize: 200, 
      ...options
    };
  }

  public enqueue(event: any) {
    if (this.queue.length >= (this.options.maxQueueSize || 200)) {
      this.queue.shift(); 
    }
    
    this.queue.push({
      ...event,
      eventId: generateForensicId(),
    });

    if (this.queue.length >= (this.options.batchSize || 5)) {
      this.flush();
    }
  }

  public async flush() {
    if (this.isProcessing || this.queue.length === 0 || !this.options.ingestUrl) return;
    
    this.isProcessing = true;
    const eventsToProcess = [...this.queue];
    this.queue = [];

    try {
      await this.sendWithRetry(eventsToProcess, 0);
    } catch (err) {
      // Fail silently to never break the host application
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendWithRetry(events: any[], attempt: number): Promise<void> {
    if (!this.options.ingestUrl) return;
    
    try {
      const response = await fetch(this.options.ingestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.options.apiKey,
          projectId: this.options.projectId, // Can be undefined, resolved server-side
          events: events
        }),
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
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

let globalIngestor: AtlasBurnIngestor | null = null;

export function getIngestor(options?: AtlasBurnSDKOptions) {
  if (!globalIngestor && options) {
    globalIngestor = new AtlasBurnIngestor(options);
  }
  return globalIngestor;
}

/**
 * Wraps an LLM client with AtlasBurn Forensic Intelligence.
 */
export function withAtlasBurn(client: any, options: AtlasBurnSDKOptions) {
  const ingestor = getIngestor(options);

  return {
    async chat(
      payload: { model: string; messages: any[] } & AtlasBurnMetadata
    ): Promise<any> {
      const response = await client.chat(payload);
      
      try {
        const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };
        ingestor?.enqueue({
          model: payload.model,
          featureId: payload.featureId || 'default',
          userTier: payload.userTier || 'standard',
          usage: {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (e) { }

      return response;
    },
    
    async flush() {
      await ingestor?.flush();
    }
  };
}

/**
 * EXPERIMENTAL: Automatically detects and instruments OpenAI, Anthropic, and Gemini usage.
 */
export function initAtlasBurnAuto(options: AtlasBurnSDKOptions) {
  const ingestor = getIngestor(options);
  if (!ingestor) return;

  if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = args[0]?.toString() || "";

      // Best-effort detection of AI provider patterns
      try {
        if (url.includes("api.openai.com") || url.includes("api.anthropic.com") || url.includes("generativelanguage.googleapis.com")) {
          const clone = response.clone();
          const data = await clone.json();
          
          if (data.usage) {
            ingestor.enqueue({
              model: data.model || "detected-model",
              featureId: "auto-detect",
              usage: {
                prompt_tokens: data.usage.prompt_tokens || data.usage.input_tokens || 0,
                completion_tokens: data.usage.completion_tokens || data.usage.output_tokens || 0,
              },
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        // Silently fail to ensure production safety
      }

      return response;
    };
  }
}
