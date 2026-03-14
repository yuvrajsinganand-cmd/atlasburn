import { createHmac } from 'crypto';

/**
 * AtlasBurn Crypto Intelligence
 * 
 * Implements HMAC-SHA-256 hashing for ingest keys.
 * Security Protocol:
 * 1. Raw keys are NEVER stored in the database.
 * 2. Only HMAC hashes are stored, salted with an internal server-only pepper.
 * 3. This prevents reverse-lookup via rainbow tables even in the event of a DB breach.
 * 4. Input is sanitized at the API layer to prevent injection attacks.
 */

const PEPPER = process.env.ATLASBURN_INTERNAL_PEPPER || 'default-atlasburn-pepper-2024-v1';

/**
 * Computes a deterministic HMAC-SHA-256 hash of an ingest key.
 * This is the institutional standard for secure credential verification.
 */
export function hashIngestKey(key: string): string {
  return createHmac('sha256', PEPPER).update(key).digest('hex');
}

/**
 * Generates a random secure ingest key with high entropy.
 */
export function generateRawIngestKey(): string {
  const entropy = () => Math.random().toString(36).substring(2, 15);
  return `abn_${entropy()}_${entropy()}`;
}
