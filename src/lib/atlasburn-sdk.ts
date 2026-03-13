
/**
 * AtlasBurn Forensic SDK - Institutional v1.9.1
 * 
 * DESIGN PRINCIPLE: Non-blocking ingestion via background flush.
 * This SDK wraps any LLM client (OpenAI, Anthropic, etc.) and forwards 
 * forensic metadata to the AtlasBurn control plane.
 * 
 * THE 4 LAWS OF SDK SAFETY:
 * 1. Never crash host app
 * 2. Never block host request
 * 3. Never leak secrets
 * 4. Always fail silently
 */

export interface AtlasBurnSDKOptions {
  apiKey: string;    
  projectId: string; 
  ingestUrl?: string; 
  batchSize?: number;
  maxQueueSize?: number;
}

export interface AtlasBurnMetadata {
  featureId?: string; 
  userTier?: string;  
}

/**
 * Universal UUID generator for forensic event tracking.
 */
function generateForensicId(): string {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch (e) {}
  return `abn-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

class AtlasBurnIngestor {
  private queue: any[] = [];
  private options: AtlasBurnSDKOptions;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;

  constructor(options: AtlasBurnSDKOptions) {
    this.options = {
      ingestUrl: options.ingestUrl || (typeof window !== 'undefined' 
        ? `${window.location.origin}/api/ingest` 
        : ''),
      batchSize: 5,
      maxQueueSize: 200, // Bounded memory
      ...options
    };
  }

  public enqueue(event: any) {
    // Law 1 & 4: Drop oldest if queue is full to prevent memory growth/crashes
    if (this.queue.length >= (this.options.maxQueueSize || 200)) {
      this.queue.shift(); 
    }
    
    this.queue.push({
      ...event,
      eventId: generateForensicId(),
    });

    // Law 2: Trigger flush but NEVER await it in the caller's thread
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
      // Law 4: Always fail silently. Log locally but don't rethrow.
      console.warn('AtlasBurn SDK: Background ingestion failed. Host app unaffected.');
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
        // Law 4: Silent exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return this.sendWithRetry(events, attempt + 1);
      }
      throw err;
    }
  }
}

let globalIngestor: AtlasBurnIngestor | null = null;

export function withAtlasBurn(client: any, options: AtlasBurnSDKOptions) {
  if (!globalIngestor) {
    globalIngestor = new AtlasBurnIngestor(options);
  }

  return {
    async chat(
      payload: { model: string; messages: any[] } & AtlasBurnMetadata
    ): Promise<any> {
      // Law 2: Execute host request FIRST
      const response = await client.chat(payload);
      
      // Law 4: Sanitize and fire-and-forget ingestion
      try {
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
      } catch (e) {
        // Law 1: Never let telemetry logic crash the chat response
      }

      return response;
    },
    
    async flush() {
      await globalIngestor?.flush();
    }
  };
}
