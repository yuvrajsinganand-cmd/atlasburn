
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';

/**
 * AtlasBurn Firebase Admin Intelligence (Institutional v2.4-STABLE)
 * 
 * DESIGN: Robust Singleton with Environment Sanitization
 */

let adminApp: App | null = null;
let db: Firestore | null = null;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  if (!adminApp) {
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.GCP_PROJECT || process.env.FIREBASE_PROJECT_ID;

    try {
      if (saKey) {
        console.log(`[AtlasBurn-Admin] Initializing with explicit Service Account.`);
        const credentials = JSON.parse(saKey);
        adminApp = initializeApp({ 
          credential: cert(credentials),
          storageBucket: "" // Override potential broken bucket in env
        });
      } else {
        console.log(`[AtlasBurn-Admin] Initializing with ambient credentials.`);
        // We pass a dummy storageBucket to prevent boot crashes if the project's
        // FIREBASE_CONFIG env var references a non-existent bucket.
        adminApp = initializeApp({
          storageBucket: ""
        });
      }
    } catch (err) {
      console.error("[AtlasBurn-Admin] Boot Error:", err);
      // Last-ditch attempt
      adminApp = initializeApp();
    }
  }
  return adminApp!;
}

export function getAdminDb(): Firestore {
  if (!db) {
    const app = getAdminApp();
    db = getFirestore(app);
    // Explicitly set settings to prevent boot warnings
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}

export { FieldValue };
