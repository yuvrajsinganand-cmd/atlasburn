
import { NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { normalizeUsage } from '@/lib/normalization-engine';
import { hashIngestKey } from '@/lib/crypto';
import { evaluateGuardrails } from '@/lib/guardrail-engine';
import { deriveSignalsFromRecords } from '@/lib/runtime-signals';

/**
 * AtlasBurn Security Constraints
 */
const MAX_EVENTS_PER_BATCH = 50;
const MAX_STRING_LENGTH = 100;
const MAX_PAYLOAD_SIZE_BYTES = 512 * 1024; // 512KB

/**
 * Sanitizes input strings to prevent XML/HTML injection and excessive length.
 */
function sanitizeInput(val: any): string {
  if (typeof val !== 'string') return String(val || '').substring(0, MAX_STRING_LENGTH);
  return val
    .replace(/[<>]/g, '') 
    .replace(/["']/g, '') 
    .replace(/[&]/g, '') 
    .substring(0, MAX_STRING_LENGTH); 
}

/**
 * AtlasBurn Hardened Ingestion API (Institutional v2.0)
 * 
 * SECURITY PROTOCOL:
 * 1. Project context is resolved server-side via hashed API key.
 * 2. Client-provided projectId is only used for cross-verification.
 * 3. Payloads are strictly validated for size and schema.
 * 4. Verification pulses are isolated from economic analytics.
 */
export async function POST(request: Request) {
  try {
    // 1. Safe Request Parsing
    let body: any;
    try {
      // Basic size protection check if Content-Length is available
      const contentLength = parseInt(request.headers.get('content-length') || '0');
      if (contentLength > MAX_PAYLOAD_SIZE_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { apiKey, projectId: clientProjectId, events } = body;

    // 2. Auth Validation (Check presence and type)
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid API Key.' }, { status: 401 });
    }

    const hashedKey = hashIngestKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8); // Only log non-sensitive prefix for diagnostics

    // 3. Resolve Project Context Server-Side (Source of Truth)
    const keysSnap = await adminDb.collectionGroup('ingestKeys')
      .where('hash', '==', hashedKey)
      .where('status', '==', 'active')
      .limit(1)
      .get();
      
    if (keysSnap.empty) {
      console.warn(`[AtlasBurn] Unauthorized ingest attempt. Key Prefix: ${keyPrefix}...`);
      return NextResponse.json({ error: 'Forbidden: Invalid API Key.' }, { status: 403 });
    }
    
    // Resolve projectId from path: users/{projectId}/aiSubscriptions/{subId}/ingestKeys/{keyId}
    const keyPathParts = keysSnap.docs[0].ref.path.split('/');
    const resolvedProjectId = keyPathParts[1];

    // 4. Identity Integrity Check (Anti-Spoofing)
    if (clientProjectId && clientProjectId !== resolvedProjectId) {
      console.error(`[AtlasBurn] Project ID Mismatch. Resolved: ${resolvedProjectId}, Client sent: ${clientProjectId}`);
      return NextResponse.json({ error: 'Forbidden: Project context mismatch.' }, { status: 403 });
    }

    if (!resolvedProjectId) {
      return NextResponse.json({ error: 'Internal Server Error: Context resolution failed.' }, { status: 500 });
    }

    // 5. Batch & Event Validation
    const rawEvents = Array.isArray(events) ? events : [];
    if (rawEvents.length === 0) return NextResponse.json({ status: 'ignored', message: 'No events found.' });
    if (rawEvents.length > MAX_EVENTS_PER_BATCH) {
      return NextResponse.json({ error: 'Batch size exceeds limit.' }, { status: 400 });
    }

    const batch = adminDb.batch();
    const orgId = `org_${resolvedProjectId}`;
    const usagePath = `organizations/${orgId}/usageRecords`;
    const dedupePath = `organizations/${orgId}/deduplicatedEvents`;

    const processedRecords = [];

    for (const evt of rawEvents) {
      // Null-safe field validation
      const eventId = evt?.eventId;
      if (!eventId || typeof eventId !== 'string') continue;

      // Idempotency Check (Dedupe) - Prevents cost double-counting
      const dedupeRef = adminDb.collection(dedupePath).doc(eventId.substring(0, 64));
      const dedupeSnap = await dedupeRef.get();
      if (dedupeSnap.exists) continue;

      // Detect Verification Type
      const isVerification = evt.apiCallType === 'verification' || 
                             evt.type === 'atlasburn_verification' || 
                             evt.model === 'atlasburn-verification-pulse';

      // Safe Extraction & Normalization
      // We use defaults to prevent crashing on malformed events
      const modelId = sanitizeInput(evt?.model || 'unknown');
      const inputTokens = Math.max(0, Number(evt?.usage?.prompt_tokens ?? evt?.usage?.input_tokens ?? 0));
      const outputTokens = Math.max(0, Number(evt?.usage?.completion_tokens ?? evt?.usage?.output_tokens ?? 0));

      const normalized = normalizeUsage(modelId, inputTokens, outputTokens);
      const newRecordRef = adminDb.collection(usagePath).doc();
      
      const recordData = {
        timestamp: evt?.timestamp || new Date().toISOString(),
        inputTokens,
        outputTokens,
        // Verification events have negligible cost to keep analytics clean
        cost: isVerification ? 0.00001 : (Number(normalized.costUsd) || 0),
        model: sanitizeInput(normalized.model),
        provider: sanitizeInput(normalized.provider),
        featureId: sanitizeInput(evt?.featureId || 'default_feature'),
        userTier: sanitizeInput(evt?.userTier || 'pro'),
        eventId: sanitizeInput(eventId),
        apiCallType: isVerification ? 'verification' : (evt?.apiCallType || 'production_sdk_call'),
        // Security: Explicitly strip any accidental prompt/response data
        metadata: {
          sdkVersion: sanitizeInput(evt?.metadata?.sdkVersion || 'unknown'),
          environment: sanitizeInput(evt?.metadata?.environment || 'production')
        }
      };

      batch.set(newRecordRef, recordData);
      batch.set(dedupeRef, { createdAt: FieldValue.serverTimestamp() });
      processedRecords.push(recordData);
    }

    // 6. Guardrail Evaluation (Strictly for Real Usage Only)
    const configRef = adminDb.collection('organizations').doc(orgId).collection('guardrail').doc('config');
    const configSnap = await configRef.get();
    
    const realUsageEvents = processedRecords.filter(r => r.apiCallType !== 'verification');

    if (configSnap.exists && realUsageEvents.length > 0) {
      const config = configSnap.data() as any;
      
      if (config.enabled) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        // Context query for breach detection
        const contextSnap = await adminDb.collection(usagePath)
          .where('timestamp', '>=', yesterday)
          .orderBy('timestamp', 'desc')
          .limit(200)
          .get();
          
        const contextRecords = contextSnap.docs.map(d => d.data());
        const hourlyRecords = contextRecords.filter(r => r.timestamp >= lastHour);
        const signals = deriveSignalsFromRecords(contextRecords);
        
        const breach = evaluateGuardrails(config, contextRecords, hourlyRecords, signals);
        
        if (breach.isBreached) {
          const action = config.mode === 'hard_stop' ? 'suspended' : config.mode === 'soft_stop' ? 'throttled' : 'active';
          
          if (action !== config.status) {
            batch.update(configRef, { 
              status: action,
              updatedAt: new Date().toISOString() 
            });
          }

          const breachRef = adminDb.collection('organizations').doc(orgId).collection('breaches').doc();
          batch.set(breachRef, {
            timestamp: new Date().toISOString(),
            triggerType: breach.triggerType,
            observedValue: breach.observedValue,
            thresholdValue: breach.thresholdValue,
            actionTaken: config.mode,
            status: 'logged'
          });
        }
      }
    }

    // 7. Atomic Commit
    await batch.commit();

    return NextResponse.json({ 
      status: 'success', 
      count: processedRecords.length,
      timestamp: new Date().toISOString() 
    });

  } catch (err: any) {
    // SECURITY: Log internal error details server-side only
    console.error('[AtlasBurn] Critical Ingest Failure:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });

    // Return safe, non-revealing error to client
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
