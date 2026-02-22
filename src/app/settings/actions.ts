
'use server';

import { hashIngestKey, generateRawIngestKey } from '@/lib/crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function rotateIngestKey(userId: string, subId: string) {
  if (!userId || !subId) throw new Error("Missing context");

  // 1. Revoke existing keys
  const keysQuery = query(
    collection(db, 'users', userId, 'aiSubscriptions', subId, 'ingestKeys'),
    where('status', '==', 'active')
  );
  const existingKeys = await getDocs(keysQuery);
  for (const kDoc of existingKeys.docs) {
    await updateDoc(kDoc.ref, { 
      status: 'revoked', 
      revokedAt: new Date().toISOString() 
    });
  }

  // 2. Generate New
  const rawKey = generateRawIngestKey();
  const hash = hashIngestKey(rawKey);
  const prefix = rawKey.substring(0, 10);

  const newKeyRef = await addDoc(collection(db, 'users', userId, 'aiSubscriptions', subId, 'ingestKeys'), {
    hash,
    prefix: `${prefix}...`,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastUsedAt: null
  });

  return { rawKey, keyId: newKeyRef.id };
}

export async function revokeIngestKey(userId: string, subId: string, keyId: string) {
  const docRef = doc(db, 'users', userId, 'aiSubscriptions', subId, 'ingestKeys', keyId);
  await updateDoc(docRef, { 
    status: 'revoked', 
    revokedAt: new Date().toISOString() 
  });
}
