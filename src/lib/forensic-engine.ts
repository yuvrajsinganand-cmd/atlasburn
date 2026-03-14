
/**
 * @fileOverview AtlasBurn Forensic Aggregation Engine
 * Centralizes the logic for generating SdkProjectSnapshot from raw usage records.
 */

import { type SdkProjectSnapshot } from '@/types/sdk';
import { deriveSignalsFromRecords, translateSignalsToEconomicFactors } from '@/lib/runtime-signals';
import { calculateUsageVariance } from '@/lib/variance-engine';

export function aggregateSnapshot(
  projectId: string,
  records: any[],
  orgData: any = {},
  windowDays: number = 30
): SdkProjectSnapshot {
  if (!records || records.length === 0) {
    return {
      projectId,
      isConnected: true,
      hasEvents: false,
      windowDays,
      usage: {
        totalCost: 0,
        promptTokens: 0,
        completionTokens: 0,
        requests: 0,
        requestsPerSecond: 0,
        byModel: {},
        byFeature: {},
        daily: []
      },
      economics: {
        mrr: orgData.monthlyRevenue || 0,
        capitalReserves: orgData.capitalReserves || 0
      },
      systemicRisk: {
        spikeAlerts: []
      }
    };
  }

  // Derive Common Signals
  const runtimeSignals = deriveSignalsFromRecords(records);
  const signalImpacts = translateSignalsToEconomicFactors(runtimeSignals);

  const dailyMap: Record<string, any> = {};
  const modelMap: Record<string, any> = {};
  const featureMap: Record<string, any> = {};
  let totalCost = 0;
  let totalPrompt = 0;
  let totalCompletion = 0;

  records.forEach((r: any) => {
    let date = 'unknown';
    try {
      if (r.timestamp) {
        date = new Date(r.timestamp).toISOString().split('T')[0];
      }
    } catch (e) {}

    if (!dailyMap[date]) dailyMap[date] = { date, cost: 0, promptTokens: 0, completionTokens: 0, requests: 0 };
    
    const model = r.model || 'unknown';
    if (! modelMap[model]) modelMap[model] = { cost: 0, promptTokens: 0, completionTokens: 0, requests: 0 };

    const featureId = r.featureId || 'default';
    if (!featureMap[featureId]) featureMap[featureId] = { cost: 0, requests: 0, riskContribution: 0, status: 'PROTECTED', trend: 0, history: [] };

    dailyMap[date].cost += r.cost || 0;
    dailyMap[date].requests += 1;
    dailyMap[date].promptTokens += r.inputTokens || 0;
    dailyMap[date].completionTokens += r.outputTokens || 0;
    
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
    feature.costPerRequest = feature.requests > 0 ? (feature.cost / feature.requests) : 0;

    if (feature.history.length > 10) {
      const recent = feature.history.slice(0, 5).reduce((a: number, b: number) => a + b, 0) / 5;
      const baseline = feature.history.slice(5, 25).reduce((a: number, b: number) => a + b, 0) / Math.max(1, Math.min(20, feature.history.length - 5));
      feature.trend = baseline > 0 ? (recent - baseline) / baseline : 0;
      
      if (feature.trend > 2.0) { 
        feature.status = 'BREACHED';
        spikeAlerts.push({
          featureId: fid,
          severity: feature.trend > 4.0 ? 'CRITICAL' : 'WARNING',
          message: `Abnormal burn surge detected in ${fid}. Cost increased by ${(feature.trend * 100).toFixed(0)}%.`,
          costImpact: recent * 30 
        });
      }
    }
    delete feature.history;
  });

  let dailyArray = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  const varianceResult = calculateUsageVariance(dailyArray);

  // Mark Daily Anomalies based on statistical variance
  if (varianceResult.status === 'READY') {
    const { dailyMean, stdDev } = varianceResult.result;
    dailyArray = dailyArray.map(d => {
      const isAnomaly = d.cost > (dailyMean + 2 * stdDev) && d.cost > 5;
      return {
        ...d,
        isAnomaly,
        anomalyDetails: isAnomaly ? `Token Burst: +${(((d.cost - dailyMean) / dailyMean) * 100).toFixed(0)}% vs mean` : null
      };
    });
  }

  const dailyBurn = varianceResult.status === 'READY' ? varianceResult.result.dailyMean : (totalCost / Math.max(1, dailyArray.length));
  const budgetRunwayDays = orgData.capitalReserves && dailyBurn > 0 ? (orgData.capitalReserves / dailyBurn) : undefined;

  return {
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
      requestsPerSecond: runtimeSignals.requestRate,
      byModel: modelMap,
      byFeature: featureMap,
      daily: dailyArray,
    },
    economics: {
      mrr: orgData.monthlyRevenue || 0,
      capitalReserves: orgData.capitalReserves || 0,
      currentDailyBurn: dailyBurn,
      burnVolatility: varianceResult.status === 'READY' ? varianceResult.result.cv : signalImpacts.burnVolatility,
      monthlyGrowthRate: 0.05,
      churnRate: 0.03,
      projectedMonthlyBill: dailyBurn * 30,
      budgetRunwayDays
    },
    systemicRisk: {
      outageProb: signalImpacts.outageProb,
      retryCascadeProb: signalImpacts.retryCascadeProb,
      spikeAlerts
    }
  };
}
