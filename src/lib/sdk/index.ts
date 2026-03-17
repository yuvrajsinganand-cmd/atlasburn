
/**
 * AtlasBurn Forensic SDK - Institutional v1.3.3-DIAGNOSTIC
 */

export interface AtlasBurnSDKOptions {
  apiKey: string;    
  projectId?: string; 
  ingestUrl?: string; 
  batchSize?: number;
  maxQueueSize?: number;
  metadata?: AtlasBurnMetadata; 
  debug?: boolean; 
}

export interface AtlasBurnMetadata {
  featureId?: string; 
  userTier?: string;  
  environment?: string;
  sdkVersion?: string;
}

const DEFAULT_INGEST_URL = "https://app.atlasburn.com/api/ingest";
const SDK_VERSION = "1.3.3";

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
      ...options,
      metadata: {
        sdkVersion: SDK_VERSION,
        environment: typeof process !== 'undefined' ? (process.env.NODE_ENV || 'production') : 'browser',
        ...options.metadata
      }
    };
    if (this.options.debug) console.log(`[AtlasBurn SDK] Initialized. Ingest: ${this.options.ingestUrl}`);
  }

  public enqueue(event: any) {
    if (this.queue.length >= (this.options.maxQueueSize || 200)) {
      this.queue.shift(); 
    }
    
    const mergedEvent = {
      ...this.options.metadata,
      ...event,
      eventId: generateForensicId(),
      timestamp: event.timestamp || new Date().toISOString()
    };

    this.queue.push(mergedEvent);

    if (this.options.debug) {
      console.log(`[AtlasBurn SDK] Event enqueued: ${mergedEvent.model}. Queue size: ${this.queue.length}`);
    }

    if (this.queue.length >= (this.options.batchSize || 5)) {
      this.flush();
    }
  }

  public async flush() {
    if (this.isProcessing || this.queue.length === 0 || !this.options.ingestUrl) return;
    
    this.isProcessing = true;
    const eventsToProcess = [...this.queue];
    this.queue = [];

    if (this.options.debug) {
      console.log(`[AtlasBurn SDK] Initiating flush of ${eventsToProcess.length} events...`);
    }

    try {
      await this.sendWithRetry(eventsToProcess, 0);
      if (this.options.debug) console.log(`[AtlasBurn SDK] Flush successful.`);
    } catch (err) {
      if (this.options.debug) console.warn(`[AtlasBurn SDK] Flush failed after retries.`, err);
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
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        if (this.options.debug) console.log(`[AtlasBurn SDK] Retrying flush (${attempt + 1}/${this.maxRetries}) in ${delay}ms...`);
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

export async function verifyAtlasBurn(options: AtlasBurnSDKOptions) {
  const ingestor = getIngestor(options);
  if (!ingestor) return;

  console.log("[AtlasBurn] Initializing verification pulse...");

  ingestor.enqueue({
    model: "atlasburn-verification-pulse",
    type: "atlasburn_verification",
    apiCallType: "verification",
    usage: {
      prompt_tokens: 42,
      completion_tokens: 0,
    },
    featureId: "sdk-verification"
  });

  await ingestor.flush();

  console.log("%cAtlasBurn verification event sent ✓", "color: #8b5cf6; font-weight: bold;");
  console.log("Check your forensic command dashboard to confirm verification.");
}

export function withAtlasBurn(client: any, options: AtlasBurnSDKOptions) {
  const ingestor = getIngestor(options);

  return {
    async chat(
      payload: { model: string; messages: any[] } & AtlasBurnMetadata
    ): Promise<any> {
      if (options.debug) console.log(`[AtlasBurn SDK] Wrapping chat call for model: ${payload.model}`);
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

export function initAtlasBurnAuto(options: AtlasBurnSDKOptions) {
  const ingestor = getIngestor(options);
  if (!ingestor) return;

  if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    console.log("[AtlasBurn SDK] Auto-Detection interceptor active.");
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

          if (data.usage) {
            tokens.prompt = data.usage.prompt_tokens || data.usage.input_tokens || 0;
            tokens.completion = data.usage.completion_tokens || data.usage.output_tokens || 0;
          } 
          else if (data.usageMetadata) {
            tokens.prompt = data.usageMetadata.promptTokenCount || 0;
            tokens.completion = data.usageMetadata.candidatesTokenCount || 0;
          }

          if (tokens.prompt > 0 || tokens.completion > 0) {
            if (options.debug) console.log(`[AtlasBurn SDK] Auto-detected AI call: ${model}`);
            ingestor.enqueue({
              model,
              featureId: "auto-detect",
              usage: {
                prompt_tokens: tokens.prompt,
                completion_tokens: tokens.completion,
              }
            });
          }
        }
      } catch (e) { }

      return response;
    };
  }
}
