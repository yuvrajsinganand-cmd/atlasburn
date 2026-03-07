
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit, writeBatch, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { normalizeUsage } from '@/lib/normalization-engine';
import { hashIngestKey } from '@/lib/crypto';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const MAX_EVENTS_PER_BATCH = 50;

/**
 * AtlasBurn Ingestion API
 * Captures request-level tokens and attributes them to Features and User Tiers.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, projectId, events, event } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'Unauthorized: Missing Key or Project ID.' }, { status: 401 });
    }

    // 1. Auth: Verify Hashed Key against the Organization path
    const hashedKey = hashIngestKey(apiKey);
    const subsQuery = query(
      collection(db, 'users', projectId, 'aiSubscriptions'),
      limit(20)
    );
    
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

    // 2. Parse Events
    const rawEvents = Array.isArray(events) ? events : (event ? [event] : []);
    if (rawEvents.length === 0) return NextResponse.json({ status: 'ignored', message: 'No events found in payload.' });
    if (rawEvents.length > MAX_EVENTS_PER_BATCH) {
      return NextResponse.json({ error: 'Batch too large' }, { status: 413 });
    }

    // 3. Batched Atomic Ingestion with Economic Attribution
    const batch = writeBatch(db);
    const usagePath = `organizations/org_${projectId}/usageRecords`;
    const dedupePath = `organizations/org_${projectId}/deduplicatedEvents`;

    for (const evt of rawEvents) {
      if (!evt.model || !evt.usage || !evt.eventId) continue;

      // Replay Protection
      const dedupeRef = doc(db, dedupePath, evt.eventId);
      const dedupeSnap = await getDoc(dedupeRef);
      if (dedupeSnap.exists()) continue;

      const normalized = normalizeUsage(evt.model, evt.usage.prompt_tokens, evt.usage.completion_tokens);
      const newRecordRef = doc(collection(db, usagePath));

      batch.set(newRecordRef, {
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
      });

      batch.set(dedupeRef, { createdAt: serverTimestamp() });
    }

    // Update Key Metadata
    const keyRef = doc(db, 'users', projectId, 'aiSubscriptions', targetSubId, 'ingestKeys', targetKeyId!);
    batch.update(keyRef, { lastUsedAt: new Date().toISOString() });

    await batch.commit();

    return NextResponse.json({ status: 'success', count: rawEvents.length });
  } catch (err: any) {
    console.error('Atlas Ingest Failure:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
