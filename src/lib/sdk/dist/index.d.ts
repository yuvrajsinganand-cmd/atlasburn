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
 * - Added verifyAtlasBurn() for instant verification pulses.
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
}
declare class AtlasBurnIngestor {
    private queue;
    private options;
    private isProcessing;
    private maxRetries;
    constructor(options: AtlasBurnSDKOptions);
    enqueue(event: any): void;
    flush(): Promise<void>;
    private sendWithRetry;
}
export declare function getIngestor(options?: AtlasBurnSDKOptions): AtlasBurnIngestor | null;
/**
 * verifyAtlasBurn - Institutional Verification Utility
 * Sends a safe synthetic event to confirm ingestion authority.
 */
export declare function verifyAtlasBurn(options: AtlasBurnSDKOptions): Promise<void>;
/**
 * withAtlasBurn - The Official Stable Wrapper
 */
export declare function withAtlasBurn(client: any, options: AtlasBurnSDKOptions): {
    chat(payload: {
        model: string;
        messages: any[];
    } & AtlasBurnMetadata): Promise<any>;
    flush(): Promise<void>;
};
/**
 * initAtlasBurnAuto - Experimental Auto-Detection
 */
export declare function initAtlasBurnAuto(options: AtlasBurnSDKOptions): void;
export {};
