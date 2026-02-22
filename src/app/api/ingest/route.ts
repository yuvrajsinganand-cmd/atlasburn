import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { normalizeUsage } from '@/lib/normalization-engine';

// Initialize Firebase for the API Route (Server Side)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

/**
 * @fileOverview Production Ingestion API for Sleek SDK.
 * Handles POST /api/ingest
 * Supports batched and single event payloads.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, projectId, events } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
    }

    // 1. Validate Ingest Key (Lookup subscription by ingestKey)
    const subQuery = query(
      collection(db, 'users', projectId, 'aiSubscriptions'),
      where('ingestKey', '==', apiKey),
      limit(1)
    );
    const subSnapshot = await getDocs(subQuery);

    if (subSnapshot.empty) {
      return NextResponse.json({ error: 'Unauthorized Ingest Key.' }, { status: 401 });
    }

    const subDoc = subSnapshot.docs[0];
    const incomingEvents = Array.isArray(events) ? events : [body];

    // 2. Process and Persist Events
    const usageCol = collection(db, 'users', projectId, 'aiSubscriptions', subDoc.id, 'apiUsageRecords');
    
    const writePromises = incomingEvents.map(async (event) => {
      const { model, usage, metadata } = event;
      if (!model || !usage) return;

      const normalized = normalizeUsage(model, usage.prompt_tokens, usage.completion_tokens);

      return addDoc(usageCol, {
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

    await Promise.all(writePromises);

    return NextResponse.json({ status: 'success', processed: incomingEvents.length }, { status: 200 });
  } catch (error: any) {
    console.error('Ingestion Error:', error);
    return NextResponse.json({ error: 'Internal Failure', details: error.message }, { status: 500 });
  }
}
