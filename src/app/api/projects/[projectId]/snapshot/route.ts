
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { calculateUsageVariance } from '@/lib/variance-engine';
import { deriveSignalsFromRecords, translateSignalsToEconomicFactors } from '@/lib/runtime-signals';
import { type SdkProjectSnapshot } from '@/types/sdk';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const { searchParams } = new URL(request.url);
  const windowDays = parseInt(searchParams.get('windowDays') || '30');

  try {
    const orgRef = doc(db, 'organizations', `org_${projectId}`);
    const orgSnap = await getDoc(orgRef);
    
    if (!orgSnap.exists()) {
      return NextResponse.json({ isConnected: false, hasEvents: false, projectId });
    }

    const orgData = orgSnap.data();

    const usageRef = collection(db, 'organizations', `org_${projectId}`, 'usageRecords');
    const usageQuery = query(usageRef, orderBy('timestamp', 'desc'));
    const usageSnap = await getDocs(usageQuery);

    if (usageSnap.empty) {
      return NextResponse.json({ isConnected: true, hasEvents: false, projectId });
    }

    const records = usageSnap.docs.map(d => ({ ...d.data(), id: d.id }));
    
    // Derive Common Signals
    const runtimeSignals = deriveSignalsFromRecords(records);
    const signalImpacts = translateSignalsToEconomicFactors(runtimeSignals);

    const dailyMap: Record<string, any> = {};
    const modelMap: Record<string, any> = {};
    const featureMap: Record<string, any> = {};
    let totalCost = 0;
    let totalPrompt = 0;
    let totalCompletion = 0;

    records.forEach(r => {
      const date = new Date(r.timestamp).toISOString().split('T')[0];
      if (!dailyMap[date]) dailyMap[date] = { date, cost: 0, promptTokens: 0, completionTokens: 0, requests: 0 };
      
      const model = r.model || 'unknown';
      if (!modelMap[model]) modelMap[model] = { cost: 0, promptTokens: 0, completionTokens: 0, requests: 0 };

      const featureId = r.featureId || 'default';
      if (!featureMap[featureId]) featureMap[featureId] = { cost: 0, requests: 0, riskContribution: 0, status: 'PROTECTED', trend: 0, history: [] };

      dailyMap[date].cost += r.cost || 0;
      dailyMap[date].requests += 1;
      
      modelMap[model].cost += r.cost || 0;
      modelMap[model].requests += 1;

      featureMap[featureId].cost += r.cost || 0;
      featureMap[featureId].requests += 1;
      featureMap[featureId].history.push(r.cost || 0);
      
      totalCost += r.cost || 0;
      totalPrompt += r.inputTokens || 0;
      totalCompletion += r.outputTokens || 0;
    });

    const spikeAlerts: any[] = [];

    // Calculate Feature-level risk and spikes
    Object.keys(featureMap).forEach(fid => {
      const feature = featureMap[fid];
      feature.riskContribution = totalCost > 0 ? (feature.cost / totalCost) : 0;
      
      // Basic spike detection: last 5 events vs previous 20
      if (feature.history.length > 10) {
        const recent = feature.history.slice(0, 5).reduce((a: number, b: number) => a + b, 0) / 5;
        const baseline = feature.history.slice(5, 25).reduce((a: number, b: number) => a + b, 0) / Math.max(1, Math.min(20, feature.history.length - 5));
        
        feature.trend = baseline > 0 ? (recent - baseline) / baseline : 0;
        
        if (feature.trend > 2.0) { // 200% increase
          feature.status = 'BREACHED';
          spikeAlerts.push({
            featureId: fid,
            severity: feature.trend > 4.0 ? 'CRITICAL' : 'WARNING',
            message: `Abnormal burn surge detected in ${fid}. Cost increased by ${(feature.trend * 100).toFixed(0)}%.`,
            costImpact: recent * 30 // Est monthly impact
          });
        }
      }
      delete feature.history; // Clean up snapshot
    });

    const dailyArray = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const varianceResult = calculateUsageVariance(dailyArray);

    const snapshot: SdkProjectSnapshot = {
      projectId,
      isConnected: true,
      hasEvents: true,
      windowDays,
      runtimeSignals,
      usage: {
        totalCost,
        promptTokens: totalPrompt,
        completionTokens: totalCompletion,
        requests: records.length,
        byModel: modelMap,
        byFeature: featureMap,
        daily: dailyArray,
      },
      economics: {
        mrr: orgData.monthlyRevenue || 0,
        capitalReserves: orgData.capitalReserves || 0,
        currentDailyBurn: varianceResult.status === 'READY' ? varianceResult.result.dailyMean : undefined,
        burnVolatility: varianceResult.status === 'READY' ? varianceResult.result.cv : signalImpacts.burnVolatility,
        monthlyGrowthRate: 0.05,
        churnRate: 0.03,
      },
      systemicRisk: {
        outageProb: signalImpacts.outageProb,
        retryCascadeProb: signalImpacts.retryCascadeProb,
        spikeAlerts
      }
    };

    return NextResponse.json(snapshot);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
