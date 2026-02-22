import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit, writeBatch, doc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { normalizeUsage } from '@/lib/normalization-engine';
import { hashIngestKey } from '@/lib/crypto';

// Initialize Firebase (Server Side)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

/**
 * @fileOverview Hardened Ingestion API (v2).
 * Implements Hashed Key Verification and Batched Writes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, projectId, events, event } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
    }

    // 1. Auth: Compute Hash and Validate against Ingest Key Hash
    const hashedKey = hashIngestKey(apiKey);
    const subQuery = query(
      collection(db, 'users', projectId, 'aiSubscriptions'),
      where('ingestKeyHash', '==', hashedKey),
      limit(1)
    );
    const subSnapshot = await getDocs(subQuery);

    if (subSnapshot.empty) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const subDoc = subSnapshot.docs[0];
    
    // 2. Event Normalization
    // Support: {events: []}, {event: {}}, or root body as event
    const rawEvents = Array.isArray(events) ? events : (event ? [event] : (body.model ? [body] : []));
    
    if (rawEvents.length === 0) {
      return NextResponse.json({ status: 'ignored', reason: 'No valid usage events found.' });
    }

    // 3. Batched Writes
    const batch = writeBatch(db);
    const usageColPath = `users/${projectId}/aiSubscriptions/${subDoc.id}/apiUsageRecords`;

    rawEvents.forEach((evt) => {
      const { model, usage, metadata } = evt;
      if (!model || !usage) return;

      const normalized = normalizeUsage(model, usage.prompt_tokens, usage.completion_tokens);
      const newDocRef = doc(collection(db, usageColPath));
      
      batch.set(newDocRef, {
        timestamp: metadata?.timestamp || new Date().toISOString(),
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cost: normalized.costUsd,
        model: normalized.model,
        provider: normalized.provider,
        apiCallType: 'production_sdk_call',
        metadata: metadata || {},
        isSimulation: false
      });
    });

    await batch.commit();

    return NextResponse.json({ status: 'success', processed: rawEvents.length }, { status: 200 });
  } catch (error: any) {
    console.error('Ingestion API Failure:', error);
    return NextResponse.json({ error: 'Internal Failure' }, { status: 500 });
  }
}
