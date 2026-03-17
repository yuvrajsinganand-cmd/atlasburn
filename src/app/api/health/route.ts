
import { NextResponse } from 'next/server';

/**
 * AtlasBurn Infrastructure Health Check
 * Used by Cloud Run and App Hosting probes to verify container status.
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'online', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.4.0'
  });
}
