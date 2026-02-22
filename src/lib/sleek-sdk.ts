
/**
 * Sleek SDK - Production v1.4
 * 
 * DESIGN PRINCIPLE: Non-Blocking Forensic Ingestion with Replay Protection.
 * This SDK wraps LLM clients and forwards metadata to Sleek.
 */

export interface SleekSDKOptions {
  apiKey: string;    // Raw Ingest Key (Keep secret)
  projectId: string; // User UID
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

  constructor(options: SleekSDKOptions) {
    this.options = {
      ingestUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/ingest` : '/api/ingest',
      batchSize: 5,
      maxQueueSize: 100,
      ...options
    };
  }

  public enqueue(event: any) {
    if (this.queue.length >= (this.options.maxQueueSize || 100)) {
      this.queue.shift(); // Drop oldest
    }
    this.queue.push({
      ...event,
      eventId: crypto.randomUUID(), // Replay protection ID
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
      console.warn('Sleek SDK: Failed to flush ingestion events.', err);
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

export function withSleek(client: any, options: SleekSDKOptions) {
  if (!globalIngestor) {
    globalIngestor = new SleekIngestor(options);
  }

  return {
    async chat(payload: { model: string; messages: any[] }): Promise<MockLLMResponse> {
      const response: MockLLMResponse = await client.chat(payload);

      globalIngestor?.enqueue({
        model: payload.model,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
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
    await new Promise(r => setTimeout(r, 200));
    return {
      usage: { prompt_tokens: 1000, completion_tokens: 500 },
      output: "Mock response."
    };
  }
};
