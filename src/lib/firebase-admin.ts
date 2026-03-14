
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * AtlasBurn Firebase Admin Intelligence
 * 
 * Centralizes privileged Firestore access for server-side routes.
 * Bypasses Security Rules to ensure ingestion integrity and operational safety.
 */

if (!getApps().length) {
  // If FIREBASE_SERVICE_ACCOUNT_KEY is present, use it. 
  // Otherwise, fallback to Application Default Credentials (ADC) for production.
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  try {
    const config = saKey ? { credential: cert(JSON.parse(saKey)) } : {};
    initializeApp(config);
  } catch (err) {
    console.error("Firebase Admin Initialization Error:", err);
    // Continue with default initialization if JSON parsing fails or env is missing
    initializeApp();
  }
}

export const adminDb = getFirestore();
export { FieldValue };
