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
 * AtlasBurn Hardened Ingestion API
 * Implements: HMAC-SHA-256 validation, Idempotency (deduping), and Sanitization.
 */
export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { apiKey, projectId, events } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'Unauthorized: Missing Key or Project ID.' }, { status: 401 });
    }

    // 1. Auth Validation (Verify Ingest Key via HMAC-SHA-256)
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

    // 2. Process Batch with Idempotency & Sanitization
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
      batch.set(dedupeRef, { createdAt: serverTimestamp() });
      processedRecords.push(recordData);
    }

    // 3. Guardrail Evaluation
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

    const keyRef = doc(db, 'users', projectId, 'aiSubscriptions', targetSubId, 'ingestKeys', targetKeyId!);
    batch.update(keyRef, { lastUsedAt: new Date().toISOString() });

    await batch.commit();

    return NextResponse.json({ status: 'success', count: processedRecords.length });
  } catch (err: any) {
    console.error('Atlas Ingest Failure:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
