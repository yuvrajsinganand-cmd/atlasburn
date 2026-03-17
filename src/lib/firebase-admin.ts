
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';

/**
 * AtlasBurn Firebase Admin Intelligence (Institutional v2.3-DIAGNOSTIC)
 * 
 * DESIGN: Lazy Singleton Pattern
 */

let adminApp: App | null = null;
let db: Firestore | null = null;

function getAdminApp(): App {
  console.log(`[AtlasBurn-Admin] Attempting to acquire Firebase App instance...`);
  
  if (getApps().length > 0) {
    console.log(`[AtlasBurn-Admin] Using existing instance from getApps()`);
    return getApps()[0];
  }
  
  if (!adminApp) {
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    try {
      if (saKey) {
        console.log(`[AtlasBurn-Admin] Initializing with explicit Service Account credentials.`);
        const credentials = JSON.parse(saKey);
        adminApp = initializeApp({ credential: cert(credentials) });
      } else {
        console.log(`[AtlasBurn-Admin] Initializing with App Hosting ambient credentials.`);
        adminApp = initializeApp();
      }
    } catch (err) {
      console.error("[AtlasBurn-Admin] Boot Error:", err);
      // Last-ditch attempt to use default credentials
      console.warn("[AtlasBurn-Admin] Falling back to default credential attempt.");
      adminApp = initializeApp();
    }
  }
  return adminApp!;
}

export function getAdminDb(): Firestore {
  if (!db) {
    console.log(`[AtlasBurn-Admin] Accessing Firestore Service...`);
    const app = getAdminApp();
    db = getFirestore(app);
    console.log(`[AtlasBurn-Admin] Firestore Service acquired.`);
  }
  return db;
}

export { FieldValue };
