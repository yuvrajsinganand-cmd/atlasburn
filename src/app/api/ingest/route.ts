
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
    .replace(/[<>]/g, '') 
    .replace(/["']/g, '') 
    .replace(/[&]/g, '') 
    .substring(0, 100); 
}

/**
 * AtlasBurn Hardened Ingestion API (Admin SDK Version)
 * Now resolves project context automatically via apiKey if projectId is missing.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, projectId, events } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized: Missing API Key.' }, { status: 401 });
    }

    const hashedKey = hashIngestKey(apiKey);
    let resolvedProjectId = projectId;

    // 1. Resolve Project context if not provided (Step 2 Simplified Path)
    if (!resolvedProjectId) {
      const keysSnap = await adminDb.collectionGroup('ingestKeys')
        .where('hash', '==', hashedKey)
        .where('status', '==', 'active')
        .limit(1)
        .get();
        
      if (keysSnap.empty) {
        return NextResponse.json({ error: 'Forbidden: Invalid API Key.' }, { status: 403 });
      }
      
      // Resolve projectId from path: users/{projectId}/aiSubscriptions/{subId}/ingestKeys/{keyId}
      const keyPath = keysSnap.docs[0].ref.path;
      resolvedProjectId = keyPath.split('/')[1];
    }

    if (!resolvedProjectId) {
      return NextResponse.json({ error: 'Forbidden: Could not resolve project context.' }, { status: 403 });
    }

    // 2. Process Batch with Idempotency
    const rawEvents = Array.isArray(events) ? events : [];
    if (rawEvents.length === 0) return NextResponse.json({ status: 'ignored', message: 'No events found.' });

    const batch = adminDb.batch();
    const orgId = `org_${resolvedProjectId}`;
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

    await batch.commit();

    return NextResponse.json({ status: 'success', count: processedRecords.length });
  } catch (err: any) {
    console.error('Atlas Ingest Critical Failure:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
