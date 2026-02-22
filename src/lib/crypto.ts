import { createHmac } from 'crypto';

/**
 * Sleek Crypto Intelligence
 * Implements HMAC-SHA256 hashing for ingest keys.
 * Using a pepper (internal secret) ensures that even if the database is leaked, 
 * keys cannot be reversed via standard rainbow tables.
 */

const PEPPER = process.env.SLEEK_INTERNAL_PEPPER || 'default-sleek-pepper-2024-v1';

/**
 * Computes a deterministic HMAC hash of an ingest key.
 */
export function hashIngestKey(key: string): string {
  return createHmac('sha256', PEPPER).update(key).digest('hex');
}
