
'use server';

import { hashIngestKey, generateRawIngestKey } from '@/lib/crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, updateDoc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function rotateIngestKey(userId: string, subId: string) {
  if (!userId || !subId) throw new Error("Missing context");

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
  const docRef = doc(db, 'users', userId, 'aiSubscriptions', subId, 'ingestKeys', keyId);
  await updateDoc(docRef, { 
    status: 'revoked', 
    revokedAt: new Date().toISOString() 
  });
}

/**
 * Real-world DNS Verification
 * Performs a genuine TXT record lookup for the verification token.
 */
export async function verifyDomainDns(userId: string, domain: string, expectedToken: string) {
  if (!userId || !domain || !expectedToken) return { success: false, error: "Missing verification context." };

  try {
    // 1. Perform Real DNS Lookup
    const records = await resolveTxt(domain);
    const flatRecords = records.flat();
    const verificationString = `atlasburn-verification=${expectedToken}`;
    
    const isVerified = flatRecords.some(r => r.includes(verificationString));

    if (isVerified) {
      // 2. Update Firestore Organization Record
      const orgRef = doc(db, 'organizations', `org_${userId}`);
      const orgSnap = await getDoc(orgRef);
      
      if (orgSnap.exists()) {
        const data = orgSnap.data();
        const domains = data.allowedDomains || [];
        const updatedDomains = domains.map((d: any) => {
          if (d.domain === domain) {
            return { ...d, verified: true, verifiedAt: new Date().toISOString() };
          }
          return d;
        });

        await updateDoc(orgRef, { 
          allowedDomains: updatedDomains,
          updatedAt: new Date().toISOString()
        });
      }

      return { success: true };
    }

    return { 
      success: false, 
      error: "Verification token not detected in DNS TXT records. Note: DNS propagation can take up to 24 hours." 
    };
  } catch (err: any) {
    console.error("DNS Resolution Error:", err);
    return { 
      success: false, 
      error: err.code === 'ENOTFOUND' ? "Domain not found." : "Could not resolve DNS records. Please check the domain name." 
    };
  }
}
