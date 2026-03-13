
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit, writeBatch, doc, serverTimestamp, getDoc, orderBy } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { normalizeUsage } from '@/lib/normalization-engine';
import { hashIngestKey } from '@/lib/crypto';
import { evaluateGuardrails, type GuardrailConfig } from '@/lib/guardrail-engine';
import { deriveSignalsFromRecords } from '@/lib/runtime-signals';

function getDb() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}

/**
 * AtlasBurn Hardened Ingestion API
 * Implements: Idempotency (deduping), Auth validation, and Guardrail evaluation.
 */
export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { apiKey, projectId, events } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'Unauthorized: Missing Key or Project ID.' }, { status: 401 });
    }

    // 1. Auth Validation (Verify Ingest Key)
    const hashedKey = hashIngestKey(apiKey);
    const subsQuery = query(collection(db, 'users', projectId, 'aiSubscriptions'), limit(20));
    const subSnap = await getDocs(subsQuery);
    
    let targetSubId = null;
    let targetKeyId = null;

    for (const sub of subSnap.docs) {
      const keysSubQuery = query(
        collection(db, 'users', projectId, 'aiSubscriptions', sub.id, 'ingestKeys'),
        where('hash', '==', hashedKey),
        where('status', '==', 'active'),
        limit(1)
      );
      const keySnap = await getDocs(keysSubQuery);
      if (!keySnap.empty) {
        targetSubId = sub.id;
        targetKeyId = keySnap.docs[0].id;
        break;
      }
    }

    if (!targetSubId) {
      return NextResponse.json({ error: 'Forbidden: Invalid Ingest Key.' }, { status: 403 });
    }

    // 2. Process Batch with Idempotency
    const rawEvents = Array.isArray(events) ? events : [];
    if (rawEvents.length === 0) return NextResponse.json({ status: 'ignored', message: 'No events found.' });

    const batch = writeBatch(db);
    const orgId = `org_${projectId}`;
    const usagePath = `organizations/${orgId}/usageRecords`;
    const dedupePath = `organizations/${orgId}/deduplicatedEvents`;

    const processedRecords = [];

    for (const evt of rawEvents) {
      if (!evt.model || !evt.usage || !evt.eventId) continue;

      // Idempotency Check (Dedupe)
      const dedupeRef = doc(db, dedupePath, evt.eventId);
      const dedupeSnap = await getDoc(dedupeRef);
      if (dedupeSnap.exists()) continue;

      // Normalization & Forensic Mapping
      const normalized = normalizeUsage(evt.model, evt.usage.prompt_tokens, evt.usage.completion_tokens);
      const newRecordRef = doc(collection(db, usagePath));
      
      const recordData = {
        timestamp: evt.timestamp || new Date().toISOString(),
        inputTokens: evt.usage.prompt_tokens,
        outputTokens: evt.usage.completion_tokens,
        cost: normalized.costUsd,
        model: normalized.model,
        provider: normalized.provider,
        featureId: evt.featureId || 'default_feature',
        userTier: evt.userTier || 'pro',
        eventId: evt.eventId,
        apiCallType: 'production_sdk_call'
      };

      batch.set(newRecordRef, recordData);
      batch.set(dedupeRef, { createdAt: serverTimestamp() });
      processedRecords.push(recordData);
    }

    // 3. Guardrail Evaluation (Phase 1)
    // FIXED: Use even number of segments
    const configRef = doc(db, 'organizations', orgId, 'guardrail', 'config');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const config = configSnap.data() as GuardrailConfig;
      
      if (config.enabled) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const contextQuery = query(
          collection(db, usagePath),
          where('timestamp', '>=', yesterday),
          orderBy('timestamp', 'desc'),
          limit(500)
        );
        const contextSnap = await getDocs(contextQuery);
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

          // Log Breach Incident
          const breachRef = doc(collection(db, 'organizations', orgId, 'breaches'));
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

    // Update Key Metadata
    const keyRef = doc(db, 'users', projectId, 'aiSubscriptions', targetSubId, 'ingestKeys', targetKeyId!);
    batch.update(keyRef, { lastUsedAt: new Date().toISOString() });

    await batch.commit();

    return NextResponse.json({ status: 'success', count: processedRecords.length });
  } catch (err: any) {
    console.error('Atlas Ingest Failure:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
