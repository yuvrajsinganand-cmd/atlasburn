'use server';

/**
 * @fileOverview Server Actions for Ingest Key Management.
 * Handles secure generation, hashing, and one-time display logic.
 */

import { hashIngestKey } from '@/lib/crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function generateAndHashIngestKey(userId: string, subId: string) {
  if (!userId || !subId) {
    throw new Error("Missing identification context.");
  }

  // 1. Generate Raw Key (Secret)
  // Format: slk_random_random
  const entropy = () => Math.random().toString(36).substring(2, 15);
  const rawKey = `slk_${entropy()}_${entropy()}`;
  
  // 2. Prepare Public Metadata
  const prefix = rawKey.substring(0, 10);
  
  // 3. Compute Secure Hash
  const hash = hashIngestKey(rawKey);

  // 4. Update Firestore (Never store rawKey)
  const docRef = doc(db, 'users', userId, 'aiSubscriptions', subId);
  await updateDoc(docRef, {
    ingestKeyHash: hash,
    ingestKeyPrefix: `${prefix}...`,
    updatedAt: new Date().toISOString()
  });

  // 5. Return Raw Key for one-time display/copy
  return { 
    rawKey, 
    prefix: `${prefix}...` 
  };
}
