'use server';

/**
 * @fileOverview Server Action for the Phase 1 Test Lab.
 * This bridge allows the client-side UI to trigger a secure server-side SDK call.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { normalizeUsage } from '@/lib/normalization-engine';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function runSleekSandboxTest(userId: string, subId: string, modelName: string) {
  if (!userId || !subId) {
    throw new Error("Unauthorized: Missing identity context.");
  }

  try {
    // Generate stochastic usage
    const prompt_tokens = Math.floor(Math.random() * 4000) + 500;
    const completion_tokens = Math.floor(Math.random() * 2000) + 200;
    
    // Normalize using our Institutional registry
    const normalized = normalizeUsage(modelName, prompt_tokens, completion_tokens);

    // Direct Firestore Write (Bypassing API for Sandbox speed and test-ability)
    const usagePath = `organizations/org_${userId}/usageRecords`;
    const colRef = collection(db, usagePath);

    await addDoc(colRef, {
      timestamp: new Date().toISOString(),
      inputTokens: prompt_tokens,
      outputTokens: completion_tokens,
      cost: normalized.costUsd,
      model: normalized.model,
      provider: normalized.provider,
      featureId: 'sandbox_test_lab',
      userTier: 'pro',
      eventId: crypto.randomUUID(),
      apiCallType: 'sandbox_ingestion'
    });

    return { success: true };
  } catch (error: any) {
    console.error("Sandbox Test Action Error:", error);
    return { success: false, error: error.message };
  }
}
