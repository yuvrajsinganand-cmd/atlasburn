
'use server';

import { hashIngestKey, generateRawIngestKey } from '@/lib/crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Resolver } from 'dns/promises';

/**
 * Safe Database Initialization
 * Prevents build-time crashes by initializing within the action context.
 */
function getDb() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}

export async function rotateIngestKey(userId: string, subId: string) {
  if (!userId || !subId) throw new Error("Missing context");
  const db = getDb();

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
  if (!userId || !subId || !keyId) throw new Error("Invalid parameters");
  const db = getDb();
  const docRef = doc(db, 'users', userId, 'aiSubscriptions', subId, 'ingestKeys', keyId);
  await updateDoc(docRef, { 
    status: 'revoked', 
    revokedAt: new Date().toISOString() 
  });
}

/**
 * Robust DNS Verification
 * Uses a custom resolver to bypass potential server-side DNS caching.
 */
export async function verifyDomainDns(domain: string, expectedToken: string) {
  if (!domain || !expectedToken) return { success: false, error: "Missing verification context." };

  try {
    const resolver = new Resolver();
    // Using authoritative Google DNS to bypass internal cache layers
    resolver.setServers(['8.8.8.8', '8.8.4.4']);
    
    const records = await resolver.resolveTxt(domain.trim());
    const flatRecords = records.flat().map(r => r.trim());
    const verificationString = `atlasburn-verification=${expectedToken}`;
    
    const isVerified = flatRecords.some(r => r.includes(verificationString) || r.replace(/"/g, '').includes(verificationString));

    if (isVerified) {
      return { success: true };
    }

    return { 
      success: false, 
      error: "Verification token not detected. Ensure the TXT record is correctly set. DNS propagation can take time." 
    };
  } catch (err: any) {
    console.error("DNS Resolution Error:", err);
    return { 
      success: false, 
      error: err.code === 'ENOTFOUND' ? "Domain not found." : "Could not resolve DNS records." 
    };
  }
}
