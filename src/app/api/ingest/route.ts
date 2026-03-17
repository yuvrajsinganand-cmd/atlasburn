
import { NextResponse } from 'next/server';
import { getAdminDb, FieldValue } from '@/lib/firebase-admin';
import { normalizeUsage } from '@/lib/normalization-engine';
import { hashIngestKey } from '@/lib/crypto';
import { evaluateGuardrails } from '@/lib/guardrail-engine';
import { deriveSignalsFromRecords } from '@/lib/runtime-signals';

const MAX_EVENTS_PER_BATCH = 50;
const MAX_STRING_LENGTH = 100;
const MAX_PAYLOAD_SIZE_BYTES = 512 * 1024;

function sanitizeInput(val: any): string {
  if (typeof val !== 'string') return String(val || '').substring(0, MAX_STRING_LENGTH);
  return val
    .replace(/[<>]/g, '') 
    .replace(/["']/g, '') 
    .replace(/[&]/g, '') 
    .substring(0, MAX_STRING_LENGTH); 
}

/**
 * AtlasBurn Hardened Ingestion API (Institutional v2.2)
 */
export async function POST(request: Request) {
  let diagnosticStage = 'init';
  try {
    const db = getAdminDb();
    
    // 1. Safe Request Parsing
    diagnosticStage = 'payload_parsing';
    let body: any;
    try {
      const contentLength = parseInt(request.headers.get('content-length') || '0');
      if (contentLength > MAX_PAYLOAD_SIZE_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { apiKey, projectId: clientProjectId, events } = body;

    // 2. Auth Validation
    diagnosticStage = 'auth_verification';
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'Unauthorized: Missing API Key.' }, { status: 401 });
    }

    const hashedKey = hashIngestKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);

    // Resolve Project Context with Index Error Handling
    let keysSnap;
    try {
      keysSnap = await db.collectionGroup('ingestKeys')
        .where('hash', '==', hashedKey)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    } catch (dbErr: any) {
      if (dbErr.code === 9 || dbErr.message?.includes('FAILED_PRECONDITION')) {
        console.error('[AtlasBurn] MISSING INDEX: A composite index is required for collectionGroup("ingestKeys") on fields "hash" and "status". See Firebase console.');
        return NextResponse.json({ error: 'Database configuration incomplete (missing index).' }, { status: 503 });
      }
      throw dbErr;
    }
      
    if (keysSnap.empty) {
      console.warn(`[AtlasBurn] Unauthorized ingest attempt. Key Prefix: ${keyPrefix}...`);
      return NextResponse.json({ error: 'Forbidden: Invalid API Key.' }, { status: 403 });
    }
    
    const keyPathParts = keysSnap.docs[0].ref.path.split('/');
    const resolvedProjectId = keyPathParts[1];

    if (clientProjectId && clientProjectId !== resolvedProjectId) {
      return NextResponse.json({ error: 'Forbidden: Project context mismatch.' }, { status: 403 });
    }

    // 3. Batch & Event Validation
    diagnosticStage = 'event_processing';
    const rawEvents = Array.isArray(events) ? events : [];
    if (rawEvents.length === 0) return NextResponse.json({ status: 'ignored', message: 'No events found.' });
    if (rawEvents.length > MAX_EVENTS_PER_BATCH) {
      return NextResponse.json({ error: 'Batch size exceeds limit.' }, { status: 400 });
    }

    const orgId = `org_${resolvedProjectId}`;
    const usagePath = `organizations/${orgId}/usageRecords`;
    const dedupePath = `organizations/${orgId}/deduplicatedEvents`;

    // 4. Parallelized Idempotency Check
    const dedupeResults = await Promise.all(
      rawEvents.map(async (evt) => {
        const eid = evt?.eventId;
        if (!eid || typeof eid !== 'string') return { isDuplicate: true, evt };
        const snap = await db.collection(dedupePath).doc(eid.substring(0, 64)).get();
        return { isDuplicate: snap.exists, evt };
      })
    );

    const batch = db.batch();
    const processedRecords = [];

    for (const { isDuplicate, evt } of dedupeResults) {
      if (isDuplicate || !evt?.eventId) continue;

      const eventId = String(evt.eventId);
      const isVerification = evt.apiCallType === 'verification' || 
                             evt.type === 'atlasburn_verification' || 
                             evt.model === 'atlasburn-verification-pulse';

      const inputTokens = Math.max(0, Number(evt?.usage?.prompt_tokens ?? evt?.usage?.input_tokens ?? 0) || 0);
      const outputTokens = Math.max(0, Number(evt?.usage?.completion_tokens ?? evt?.usage?.output_tokens ?? 0) || 0);
      const modelId = sanitizeInput(evt?.model || 'unknown');

      const normalized = normalizeUsage(modelId, inputTokens, outputTokens);
      const newRecordRef = db.collection(usagePath).doc();
      const dedupeRef = db.collection(dedupePath).doc(eventId.substring(0, 64));
      
      const recordData = {
        timestamp: evt?.timestamp || new Date().toISOString(),
        inputTokens,
        outputTokens,
        cost: isVerification ? 0.00001 : (Number(normalized.costUsd) || 0),
        model: sanitizeInput(normalized.model),
        provider: sanitizeInput(normalized.provider),
        featureId: sanitizeInput(evt?.featureId || 'default_feature'),
        userTier: sanitizeInput(evt?.userTier || 'pro'),
        eventId: sanitizeInput(eventId),
        apiCallType: isVerification ? 'verification' : (evt?.apiCallType || 'production_sdk_call'),
        metadata: {
          sdkVersion: sanitizeInput(evt?.metadata?.sdkVersion || 'unknown'),
          environment: sanitizeInput(evt?.metadata?.environment || 'production')
        }
      };

      batch.set(newRecordRef, recordData);
      batch.set(dedupeRef, { createdAt: FieldValue.serverTimestamp() });
      processedRecords.push(recordData);
    }

    // 5. Guardrail Evaluation
    diagnosticStage = 'guardrail_evaluation';
    try {
      const configRef = db.collection('organizations').doc(orgId).collection('guardrail').doc('config');
      const configSnap = await configRef.get();
      
      const realUsageEvents = processedRecords.filter(r => r.apiCallType !== 'verification');

      if (configSnap.exists && realUsageEvents.length > 0 && configSnap.data()?.enabled) {
        const config = configSnap.data() as any;
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const contextSnap = await db.collection(usagePath)
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
            batch.update(configRef, { status: action, updatedAt: new Date().toISOString() });
          }
          const breachRef = db.collection('organizations').doc(orgId).collection('breaches').doc();
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
    } catch (guardrailError) {
      console.warn("[AtlasBurn] Non-critical Guardrail Failure (likely missing index):", guardrailError);
    }

    // 6. Commit
    diagnosticStage = 'database_commit';
    if (processedRecords.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({ 
      status: 'success', 
      count: processedRecords.length,
      timestamp: new Date().toISOString() 
    });

  } catch (err: any) {
    console.error(`[AtlasBurn] Critical Ingest Failure at stage: ${diagnosticStage}`, {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    return NextResponse.json({ 
      error: 'Internal Server Error',
      stage: diagnosticStage 
    }, { status: 500 });
  }
}
