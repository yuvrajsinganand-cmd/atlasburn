
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
    if (saKey) {
      const credentials = JSON.parse(saKey);
      initializeApp({ credential: cert(credentials) });
    } else {
      // In Firebase App Hosting, this uses the ambient service account
      initializeApp();
    }
  } catch (err) {
    console.error("[AtlasBurn] Firebase Admin Initialization Error:", err);
    // Final fallback attempt
    try {
      initializeApp();
    } catch (e) {}
  }
}

export const adminDb = getFirestore();
export { FieldValue };
