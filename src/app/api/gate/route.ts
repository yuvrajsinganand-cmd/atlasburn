
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

function getDb() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}

/**
 * AtlasBurn SDK Gate API
 * 
 * Used by SDK/Middleware to verify if a request should proceed.
 * This is a lightweight check against the GuardrailConfig.
 */
export async function POST(request: Request) {
  try {
    const db = getDb();
    const { projectId, featureId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // FIXED: Use even number of segments
    const configRef = doc(db, 'organizations', `org_${projectId}`, 'guardrail', 'config');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return NextResponse.json({ blocked: false, status: 'active', message: 'No guardrails configured. defaulting to active.' });
    }

    const config = configSnap.data();

    if (!config.enabled || config.status === 'active') {
      return NextResponse.json({ blocked: false, status: 'active' });
    }

    if (config.status === 'suspended') {
      return NextResponse.json({
        blocked: true,
        reason: 'AtlasBurn Auto Kill Guardrail triggered',
        status: 'suspended',
        message: 'This project has been suspended due to a critical budget breach. Resume manually in the dashboard.'
      });
    }

    if (config.status === 'throttled') {
      // Phase 1 MVP: Soft stop blocks all requests or can be refined to block only "risky" ones.
      // Here we return blocked: true for demo clarity.
      return NextResponse.json({
        blocked: true,
        reason: 'Soft Stop Enabled',
        status: 'throttled',
        message: 'Project is currently throttled due to abnormal burn patterns.'
      });
    }

    return NextResponse.json({ blocked: false, status: config.status });
  } catch (error: any) {
    // Fail safely: If guardrail check fails, allow the request but log error.
    console.error('Guardrail Gate Critical Failure:', error);
    return NextResponse.json({ blocked: false, status: 'error_fallback', error: error.message });
  }
}
