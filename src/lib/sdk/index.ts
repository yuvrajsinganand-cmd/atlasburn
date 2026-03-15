/**
 * AtlasBurn Forensic SDK - Institutional v1.3.1
 * 
 * DESIGN PRINCIPLE: Non-blocking ingestion via background flush.
 * THE 4 LAWS OF SDK SAFETY:
 * 1. Never crash host app
 * 2. Never block host request
 * 3. Never leak secrets
 * 4. Always fail silently
 * 
 * v1.3.1: 
 * - Hardened Auto-Detection for OpenAI, Anthropic, and Gemini.
 * - Unified singleton management for coexisting manual/auto modes.
 * - Added default metadata support for auto-instrumentation.
 */

export interface AtlasBurnSDKOptions {
  apiKey: string;    
  projectId?: string; // Optional: Resolved server-side via apiKey if omitted
  ingestUrl?: string; // Optional: Defaults to AtlasBurn production
  batchSize?: number;
  maxQueueSize?: number;
  metadata?: AtlasBurnMetadata; // Optional: Default metadata for all events
}

export interface AtlasBurnMetadata {
  featureId?: string; 
  userTier?: string;  
}

const DEFAULT_INGEST_URL = "https://app.atlasburn.com/api/ingest";

/**
 * Generates a unique forensic ID for event deduplication.
 */
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
    
    // Merge global metadata if available
    const mergedEvent = {
      ...this.options.metadata,
      ...event,
      eventId: generateForensicId(),
    };

    this.queue.push(mergedEvent);

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
      // Law 4: Silent fail
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
          projectId: this.options.projectId,
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
 * withAtlasBurn - The Official Stable Wrapper
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
            prompt_tokens: usage.prompt_tokens || usage.input_tokens || 0,
            completion_tokens: usage.completion_tokens || usage.output_tokens || 0,
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
 * initAtlasBurnAuto - Experimental Auto-Detection
 */
export function initAtlasBurnAuto(options: AtlasBurnSDKOptions) {
  const ingestor = getIngestor(options);
  if (!ingestor) return;

  if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = args[0]?.toString() || "";

      try {
        const isAI = url.includes("api.openai.com") || 
                     url.includes("api.anthropic.com") || 
                     url.includes("generativelanguage.googleapis.com");

        if (isAI && response.headers.get("content-type")?.includes("application/json")) {
          const clone = response.clone();
          const data = await clone.json();
          
          let tokens = { prompt: 0, completion: 0 };
          let model = data.model || "detected-model";

          // 1. OpenAI / Generic
          if (data.usage) {
            tokens.prompt = data.usage.prompt_tokens || data.usage.input_tokens || 0;
            tokens.completion = data.usage.completion_tokens || data.usage.output_tokens || 0;
          } 
          // 2. Google Gemini
          else if (data.usageMetadata) {
            tokens.prompt = data.usageMetadata.promptTokenCount || 0;
            tokens.completion = data.usageMetadata.candidatesTokenCount || 0;
          }

          if (tokens.prompt > 0 || tokens.completion > 0) {
            ingestor.enqueue({
              model,
              featureId: "auto-detect",
              usage: {
                prompt_tokens: tokens.prompt,
                completion_tokens: tokens.completion,
              },
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (e) { }

      return response;
    };
  }
}
