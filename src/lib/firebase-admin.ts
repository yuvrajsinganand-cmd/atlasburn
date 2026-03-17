
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';

/**
 * AtlasBurn Firebase Admin Intelligence (Institutional v2.2)
 * 
 * DESIGN: Lazy Singleton Pattern
 * Ensures that the SDK is only initialized when first accessed,
 * preventing boot-time crashes in serverless environments.
 */

let adminApp: App | null = null;
let db: Firestore | null = null;

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  
  if (!adminApp) {
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    try {
      if (saKey) {
        const credentials = JSON.parse(saKey);
        adminApp = initializeApp({ credential: cert(credentials) });
      } else {
        // App Hosting ambient credentials
        adminApp = initializeApp();
      }
    } catch (err) {
      console.error("[AtlasBurn] Firebase Admin Boot Error:", err);
      // Last-ditch attempt to use default credentials
      adminApp = initializeApp();
    }
  }
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (!db) {
    const app = getAdminApp();
    db = getFirestore(app);
  }
  return db;
}

export { FieldValue };
