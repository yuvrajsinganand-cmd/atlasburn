/**
 * AtlasBurn Forensic SDK - Institutional v1.3.3
 *
 * DESIGN PRINCIPLE: Non-blocking ingestion via background flush.
 * THE 4 LAWS OF SDK SAFETY:
 * 1. Never crash host app
 * 2. Never block host request
 * 3. Never leak secrets
 * 4. Always fail silently
 *
 * v1.3.3:
 * - Hardened Metadata: Automatically includes sdkVersion and environment in all events.
 * - Schema Parity: Synchronized verification pulse with the hardened ingestion protocol.
 * - Reliable Wrapper + Auto-Detection coexistence.
 */
const DEFAULT_INGEST_URL = "https://app.atlasburn.com/api/ingest";
const SDK_VERSION = "1.3.3";
/**
 * Generates a unique forensic ID for event deduplication.
 */
function generateForensicId() {
    try {
        if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
            return globalThis.crypto.randomUUID();
        }
    }
    catch (e) { }
    return `abn-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
class AtlasBurnIngestor {
    constructor(options) {
        this.queue = [];
        this.isProcessing = false;
        this.maxRetries = 3;
        this.options = {
            ingestUrl: options.ingestUrl || DEFAULT_INGEST_URL,
            batchSize: 5,
            maxQueueSize: 200,
            ...options,
            metadata: {
                sdkVersion: SDK_VERSION,
                environment: process.env.NODE_ENV || 'production',
                ...options.metadata
            }
        };
    }
    enqueue(event) {
        if (this.queue.length >= (this.options.maxQueueSize || 200)) {
            this.queue.shift();
        }
        // Merge global metadata if available
        const mergedEvent = {
            ...this.options.metadata,
            ...event,
            eventId: generateForensicId(),
            timestamp: event.timestamp || new Date().toISOString()
        };
        this.queue.push(mergedEvent);
        if (this.options.debug) {
            console.log(`[AtlasBurn] Event enqueued: ${mergedEvent.model} (${mergedEvent.eventId})`);
        }
        if (this.queue.length >= (this.options.batchSize || 5)) {
            this.flush();
        }
    }
    async flush() {
        if (this.isProcessing || this.queue.length === 0 || !this.options.ingestUrl)
            return;
        this.isProcessing = true;
        const eventsToProcess = [...this.queue];
        this.queue = [];
        if (this.options.debug) {
            console.log(`[AtlasBurn] Flushing ${eventsToProcess.length} events to ${this.options.ingestUrl}...`);
        }
        try {
            await this.sendWithRetry(eventsToProcess, 0);
            if (this.options.debug) {
                console.log(`[AtlasBurn] Flush successful.`);
            }
        }
        catch (err) {
            if (this.options.debug) {
                console.warn(`[AtlasBurn] Flush failed after retries.`, err);
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    async sendWithRetry(events, attempt) {
        if (!this.options.ingestUrl)
            return;
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
        }
        catch (err) {
            if (attempt < this.maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(r => setTimeout(r, delay));
                return this.sendWithRetry(events, attempt + 1);
            }
            throw err;
        }
    }
}
let globalIngestor = null;
export function getIngestor(options) {
    if (!globalIngestor && options) {
        globalIngestor = new AtlasBurnIngestor(options);
    }
    return globalIngestor;
}
/**
 * verifyAtlasBurn - Institutional Verification Utility
 * Sends a safe synthetic event to confirm ingestion authority.
 */
export async function verifyAtlasBurn(options) {
    const ingestor = getIngestor(options);
    if (!ingestor)
        return;
    if (options.debug) {
        console.log("[AtlasBurn] Initializing verification pulse...");
    }
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
    // Explicitly trigger flush for verification
    await ingestor.flush();
    console.log("%cAtlasBurn verification event sent ✓", "color: #8b5cf6; font-weight: bold;");
    console.log("Check your forensic command dashboard to confirm verification.");
}
/**
 * withAtlasBurn - The Official Stable Wrapper
 */
export function withAtlasBurn(client, options) {
    const ingestor = getIngestor(options);
    return {
        async chat(payload) {
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
            }
            catch (e) { }
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
export function initAtlasBurnAuto(options) {
    const ingestor = getIngestor(options);
    if (!ingestor)
        return;
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
                            }
                        });
                    }
                }
            }
            catch (e) { }
            return response;
        };
    }
}
