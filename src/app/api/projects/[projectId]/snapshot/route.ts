
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { aggregateSnapshot } from '@/lib/forensic-engine';

/**
 * Robust Firebase Initialization for API Routes
 */
function getDb() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  
  if (!projectId || projectId === 'undefined' || projectId === 'null') {
    return NextResponse.json({ error: 'Invalid Project ID' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const windowDays = parseInt(searchParams.get('windowDays') || '30');

  try {
    const db = getDb();
    const orgRef = doc(db, 'organizations', `org_${projectId}`);
    const orgSnap = await getDoc(orgRef);
    
    // Note: This API is secondary to client-side aggregation.
    // It requires the App Hosting environment to have appropriate service account permissions.
    
    const orgData = orgSnap.exists() ? orgSnap.data() : {};

    const usageRef = collection(db, 'organizations', `org_${projectId}`, 'usageRecords');
    const usageQuery = query(usageRef, orderBy('timestamp', 'desc'), limit(500));
    const usageSnap = await getDocs(usageQuery);

    const records = usageSnap.docs.map(d => ({ ...d.data(), id: d.id }));
    const snapshot = aggregateSnapshot(projectId, records, orgData, windowDays);

    return NextResponse.json(snapshot);
  } catch (error: any) {
    console.error('Snapshot API Critical Failure:', error);
    
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      return NextResponse.json({ 
        error: 'Permission Denied', 
        details: 'The API route lacks authorization to read this project.' 
      }, { status: 403 });
    }

    return NextResponse.json({ 
      error: 'Forensic Snapshot Generation Failed', 
      details: error.message
    }, { status: 500 });
  }
}
