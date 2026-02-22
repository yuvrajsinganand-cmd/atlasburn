
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
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, projectId, model, usage, metadata } = body;

    if (!apiKey || !projectId || !model || !usage) {
      return NextResponse.json({ error: 'Missing required forensic fields.' }, { status: 400 });
    }

    // 1. Validate Ingest Key (Lookup subscription by ingestKey)
    // In a real prod environment, we'd cache these keys in Redis for sub-10ms validation.
    const subQuery = query(
      collection(db, 'users', projectId, 'aiSubscriptions'),
      where('ingestKey', '==', apiKey),
      limit(1)
    );
    const subSnapshot = await getDocs(subQuery);

    if (subSnapshot.empty) {
      return NextResponse.json({ error: 'Invalid Ingest Key or Project ID.' }, { status: 401 });
    }

    const subDoc = subSnapshot.docs[0];

    // 2. Normalize Cost
    const normalized = normalizeUsage(model, usage.prompt_tokens, usage.completion_tokens);

    // 3. Persist Forensic Record (Async write to Firestore)
    const usageCol = collection(db, 'users', projectId, 'aiSubscriptions', subDoc.id, 'apiUsageRecords');
    
    // We don't await this if we want absolute minimum response time, 
    // but in a serverless route, we must ensure it completes.
    await addDoc(usageCol, {
      timestamp: new Date().toISOString(),
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      cost: normalized.costUsd,
      model: normalized.model,
      provider: normalized.provider,
      apiCallType: 'production_sdk_call',
      metadata: metadata || {},
      isSimulation: false
    });

    return NextResponse.json({ status: 'success', received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Ingestion Error:', error);
    return NextResponse.json({ error: 'Internal Ingestion Failure', details: error.message }, { status: 500 });
  }
}
