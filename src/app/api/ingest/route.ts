
import { NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { normalizeUsage } from '@/lib/normalization-engine';
import { hashIngestKey } from '@/lib/crypto';
import { evaluateGuardrails } from '@/lib/guardrail-engine';
import { deriveSignalsFromRecords } from '@/lib/runtime-signals';

/**
 * Sanitizes input strings to prevent XML/HTML injection.
 */
function sanitizeInput(val: any): string {
  if (typeof val !== 'string') return String(val || '');
  return val
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/["']/g, '') // Remove quotes
    .replace(/[&]/g, '') // Remove &
    .substring(0, 100); // Bounded length
}

/**
 * AtlasBurn Hardened Ingestion API (Admin SDK Version)
 * Implements: HMAC-SHA-256 validation, Idempotency, and Sanitization.
 * 
 * Bypasses client security rules to ensure reliable telemetry even 
 * when user sessions are absent.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, projectId, events } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'Unauthorized: Missing Key or Project ID.' }, { status: 401 });
    }

    // 1. Auth Validation (Verify Ingest Key via Admin SDK)
    const hashedKey = hashIngestKey(apiKey);
    const subsSnap = await adminDb.collection('users').doc(projectId).collection('aiSubscriptions').limit(20).get();
    
    let targetSubId = null;
    let targetKeyId = null;

    for (const subDoc of subsSnap.docs) {
      const keysSnap = await adminDb.collection('users').doc(projectId)
        .collection('aiSubscriptions').doc(subDoc.id)
        .collection('ingestKeys')
        .where('hash', '==', hashedKey)
        .where('status', '==', 'active')
        .limit(1)
        .get();
        
      if (!keysSnap.empty) {
        targetSubId = subDoc.id;
        targetKeyId = keysSnap.docs[0].id;
        break;
      }
    }

    if (!targetSubId) {
      return NextResponse.json({ error: 'Forbidden: Invalid Ingest Key.' }, { status: 403 });
    }

    // 2. Process Batch with Idempotency
    const rawEvents = Array.isArray(events) ? events : [];
    if (rawEvents.length === 0) return NextResponse.json({ status: 'ignored', message: 'No events found.' });

    const batch = adminDb.batch();
    const orgId = `org_${projectId}`;
    const usagePath = `organizations/${orgId}/usageRecords`;
    const dedupePath = `organizations/${orgId}/deduplicatedEvents`;

    const processedRecords = [];

    for (const evt of rawEvents) {
      if (!evt.model || !evt.usage || !evt.eventId) continue;

      // Idempotency Check (Dedupe)
      const dedupeRef = adminDb.collection(dedupePath).doc(evt.eventId);
      const dedupeSnap = await dedupeRef.get();
      if (dedupeSnap.exists) continue;

      // Normalization & Mapping
      const normalized = normalizeUsage(evt.model, evt.usage.prompt_tokens, evt.usage.completion_tokens);
      const newRecordRef = adminDb.collection(usagePath).doc();
      
      const recordData = {
        timestamp: evt.timestamp || new Date().toISOString(),
        inputTokens: Number(evt.usage.prompt_tokens) || 0,
        outputTokens: Number(evt.usage.completion_tokens) || 0,
        cost: Number(normalized.costUsd) || 0,
        model: sanitizeInput(normalized.model),
        provider: sanitizeInput(normalized.provider),
        featureId: sanitizeInput(evt.featureId || 'default_feature'),
        userTier: sanitizeInput(evt.userTier || 'pro'),
        eventId: sanitizeInput(evt.eventId),
        apiCallType: 'production_sdk_call'
      };

      batch.set(newRecordRef, recordData);
      batch.set(dedupeRef, { createdAt: FieldValue.serverTimestamp() });
      processedRecords.push(recordData);
    }

    // 3. Guardrail Evaluation
    const configRef = adminDb.collection('organizations').doc(orgId).collection('guardrail').doc('config');
    const configSnap = await configRef.get();
    
    if (configSnap.exists) {
      const config = configSnap.data() as any;
      
      if (config.enabled) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const contextSnap = await adminDb.collection(usagePath)
          .where('timestamp', '>=', yesterday)
          .orderBy('timestamp', 'desc')
          .limit(500)
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

    // 4. Update Key Last Used Metadata
    const keyRef = adminDb.collection('users').doc(projectId)
      .collection('aiSubscriptions').doc(targetSubId)
      .collection('ingestKeys').doc(targetKeyId!);
      
    batch.update(keyRef, { lastUsedAt: new Date().toISOString() });

    await batch.commit();

    return NextResponse.json({ status: 'success', count: processedRecords.length });
  } catch (err: any) {
    console.error('Atlas Ingest Critical Failure:', err);
    // Maintain security by not leaking specific error details to potentially malicious clients
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
