
'use server';

import { hashIngestKey, generateRawIngestKey } from '@/lib/crypto';
import { Resolver } from 'dns/promises';

/**
 * Generates secure key material for the client to save.
 * Logic is on the server to keep the crypto pepper and HMAC logic secure.
 */
export async function getKeyMaterial() {
  const rawKey = generateRawIngestKey();
  const hash = hashIngestKey(rawKey);
  const prefix = rawKey.substring(0, 10);

  return { 
    rawKey, 
    hash, 
    prefix: `${prefix}...` 
  };
}

/**
 * Robust DNS Verification
 */
export async function verifyDomainDns(domain: string, expectedToken: string) {
  if (!domain || !expectedToken) return { success: false, error: "Missing verification context." };

  try {
    const resolver = new Resolver();
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
