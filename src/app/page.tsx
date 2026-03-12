
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldCheck, Zap, Server, Loader2, Lock, ArrowRight, Info, ShieldAlert, TrendingUp } from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { runInstitutionalSimulation } from "@/lib/probabilistic-engine"
import { type SdkProjectSnapshot } from "@/types/sdk"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import Link from "next/link"
import { SystemPulse } from "@/components/system-pulse"
import { useDemoMode } from "@/components/demo-provider"
import { generateMockSignals, translateSignalsToEconomicFactors } from "@/lib/runtime-signals"
import { RuntimeSignalsGrid } from "@/components/runtime-signals-grid"
import { RiskAlertBanner } from "@/components/risk-alert-banner"
import { Progress } from "@/components/ui/progress"
import { 
  Tooltip as UITooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { aggregateSnapshot } from "@/lib/forensic-engine"

const getMockSnapshot = (): SdkProjectSnapshot => {
  const signals = generateMockSignals();
  const impacts = translateSignalsToEconomicFactors(signals);

  return {
    projectId: "demo-project",
    isConnected: true,
    hasEvents: true,
    windowDays: 365,
    runtimeSignals: signals,
    usage: {
      totalCost: 12450.75,
      promptTokens: 450000000,
      completionTokens: 120000000,
      requests: 842000,
      byModel: {
        "gpt-4o": { cost: 8400, promptTokens: 300000000, completionTokens: 80000000, requests: 500000 },
        "claude-3-5-sonnet": { cost: 4050.75, promptTokens: 150000000, completionTokens: 40000000, requests: 342000 }
      },
      byFeature: {
        "support-bot-alpha": { cost: 7200, requests: 400000, riskContribution: 0.58, status: 'BREACHED', trend: 4.2 },
        "document-analysis": { cost: 3100, requests: 200000, riskContribution: 0.25, status: 'PROTECTED', trend: -0.1 },
        "realtime-chat": { cost: 2150.75, requests: 242000, riskContribution: 0.17, status: 'PROTECTED', trend: 0.05 }
      },
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cost: 300 + Math.random() * 200,
        promptTokens: 10000000,
        completionTokens: 2000000,
        requests: 20000 + Math.floor(Math.random() * 5000)
      }))
    },
    economics: {
      mrr: 45000,
      currentDailyBurn: 415.02,
      burnVolatility: impacts.burnVolatility,
      monthlyGrowthRate: 0.08,
      churnRate: 0.02,
      capitalReserves: 250000
    },
    systemicRisk: {
      outageProb: impacts.outageProb,
      retryCascadeProb: impacts.retryCascadeProb,
      spikeAlerts: [
        { featureId: "support-bot-alpha", severity: "CRITICAL", message: "Runaway agent loop detected. Burn increased 420%.", costImpact: 8500 }
      ]
    }
  };
};

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const { isDemoMode } = useDemoMode();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      orderBy('timestamp', 'desc'),
      limit(500)
    );
  }, [firestore, user]);

  const { data: usageRecords, isLoading: loadingUsage } = useCollection(usageQuery);

  const orgRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'organizations', `org_${user.uid}`);
  }, [firestore, user]);

  const { data: organization } = useDoc(orgRef);

  const activeSnapshot = useMemo(() => {
    if (!mounted || loadingUsage) return null;
    
    // 1. Prioritize Real Data if it exists
    if (usageRecords && usageRecords.length > 0) {
      return aggregateSnapshot(user?.uid || 'anonymous', usageRecords, organization || {}, 30);
    }
    
    // 2. Only fallback to Demo Mode if explicitly toggled AND real data is empty
    if (isDemoMode && usageRecords && usageRecords.length === 0) {
      return getMockSnapshot();
    }
    
    // 3. Otherwise return an empty snapshot (which will trigger Passive Mode UI)
    return {
      projectId: user?.uid || 'anonymous',
      isConnected: true,
      hasEvents: false,
      windowDays: 30,
      usage: { totalCost: 0, promptTokens: 0, completionTokens: 0, requests: 0, byModel: {}, byFeature: {}, daily: [] },
      economics: { mrr: organization?.monthlyRevenue || 0, capitalReserves: organization?.capitalReserves || 0 },
      systemicRisk: { spikeAlerts: [] }
    } as SdkProjectSnapshot;
  }, [usageRecords, organization, isDemoMode, mounted, user, loadingUsage]);

  if (!mounted || isUserLoading || (loadingUsage && !isDemoMode && user)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Production Telemetry...</p>
        </div>
      </div>
    );
  }

  const simResult = activeSnapshot?.hasEvents ? runInstitutionalSimulation(activeSnapshot) : null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Forensic Command</h1>
          </div>
          <div className="flex items-center gap-4">
            <SystemPulse 
              hasData={!!activeSnapshot?.hasEvents}
              breachProb={simResult?.status === 'READY' ? simResult.result.survivalProbability : 0}
              p95BurnDelta={activeSnapshot?.usage?.totalCost ? activeSnapshot.usage.totalCost * 0.1 : 0}
            />
            {activeSnapshot?.hasEvents && (
              <Badge variant="outline" className={`${isDemoMode && (!usageRecords || usageRecords.length === 0) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'} gap-1 uppercase text-[10px] font-bold`}>
                <ShieldCheck size={12} /> {isDemoMode && (!usageRecords || usageRecords.length === 0) ? 'Full Runway Simulation' : 'Live Ingestion'}
              </Badge>
            )}
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {!activeSnapshot || !activeSnapshot.hasEvents ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-8 animate-in fade-in duration-700">
              <div className="bg-primary/10 p-8 rounded-[2rem] text-primary">
                <Lock size={64} />
              </div>
              <div className="space-y-4 max-w-xl">
                <h2 className="text-4xl font-headline font-bold">Passive Mode: Awaiting Ingestion</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  AtlasBurn is strictly deterministic. Live economic modeling and survival simulations are deactivated until a verified production SDK feed is detected.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
                <Card className="flex-1 p-8 border-none shadow-xl bg-white flex flex-col items-center gap-6 group hover:ring-2 hover:ring-primary/20 transition-all text-left">
                  <Server className="text-primary group-hover:scale-110 transition-transform" size={48} />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Initialize SDK</h3>
                    <p className="text-sm text-muted-foreground">Follow the integration protocol to connect your production cluster.</p>
                  </div>
                  <Button asChild variant="outline" className="w-full h-12 font-headline font-bold">
                    <Link href="/usage">Integration Protocol</Link>
                  </Button>
                </Card>

                <Card className="flex-1 p-8 border-none shadow-xl bg-white flex flex-col items-center gap-6 group hover:ring-2 hover:ring-primary/20 transition-all text-left">
                  <Activity className="text-muted-foreground group-hover:scale-110 transition-transform" size={48} />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">System Credentials</h3>
                    <p className="text-sm text-muted-foreground">Access global project keys and whitelisted domains for deployment.</p>
                  </div>
                  <Button asChild variant="outline" className="w-full h-12 font-headline font-bold">
                    <Link href="/settings">System Controls</Link>
                  </Button>
                </Card>
              </div>
            </div>
          ) : (
            <>
              {activeSnapshot.systemicRisk.spikeAlerts.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                  {activeSnapshot.systemicRisk.spikeAlerts.map((alert, i) => (
                    <Card key={i} className={`p-4 border-none shadow-md ${alert.severity === 'CRITICAL' ? 'bg-destructive/10 border-l-4 border-l-destructive' : 'bg-amber-50 border-l-4 border-l-amber-500'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${alert.severity === 'CRITICAL' ? 'bg-destructive/20 text-destructive' : 'bg-amber-100 text-amber-600'}`}>
                            <ShieldAlert size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                              {alert.severity} GUARDRAIL BREACH: {alert.featureId}
                            </p>
                            <p className="text-xs text-muted-foreground">{alert.message}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Projected Impact</p>
                          <p className={`text-lg font-headline font-bold ${alert.severity === 'CRITICAL' ? 'text-destructive' : 'text-amber-600'}`}>
                            +${alert.costImpact.toLocaleString()}<span className="text-[10px] font-normal">/mo</span>
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {activeSnapshot.runtimeSignals && (
                <div className="animate-in slide-in-from-top-4 duration-700">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-1">AI Runtime Signals</h3>
                  <RiskAlertBanner 
                    var95={simResult?.status === 'READY' ? simResult.result.var95 : 0} 
                    retryProb={activeSnapshot.systemicRisk.retryCascadeProb || 0} 
                  />
                  <RuntimeSignalsGrid signals={activeSnapshot.runtimeSignals} />
                </div>
              )}

              {simResult?.status === 'NOT_READY' ? (
                <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-amber-50 text-amber-600 rounded-full"><Zap size={40} /></div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-headline font-bold text-amber-700">Incomplete Economic Context</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">The risk engine is missing: <span className="font-mono font-bold">{simResult.missing.join(', ')}</span>. Set these in your profile to run survival simulations.</p>
                  </div>
                  <Button asChild className="font-headline font-bold shadow-lg"><Link href="/profile">Set Economic Guardrails</Link></Button>
                </Card>
              ) : simResult?.status === 'READY' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6 border-none shadow-sm bg-white">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">P50 Baseline Burn (Annual)</p>
                      <p className="text-2xl font-headline font-bold text-primary">${simResult.result.p50Burn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </Card>
                    <Card className="p-6 border-none shadow-sm bg-white">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Full Survival Prob (12mo)</p>
                      <p className="text-2xl font-headline font-bold text-green-600">{(simResult.result.survivalProbability * 100).toFixed(1)}%</p>
                    </Card>
                    <Card className="p-6 border-none shadow-sm bg-white border-l-4 border-destructive">
                      <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-1">Surprise Delta (VaR)</p>
                      <p className="text-2xl font-headline font-bold text-destructive">${simResult.result.var95.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </Card>
                    <Card className="p-6 border-none shadow-sm bg-white">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Forensic Volatility</p>
                      <p className="text-2xl font-headline font-bold text-accent">{(activeSnapshot.economics.burnVolatility! * 100).toFixed(1)}%</p>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
                      <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-lg font-headline">Institutional Burn Attribution</CardTitle>
                        <CardDescription>Visualizing deterministic burn (USD) and operational throughput (Requests).</CardDescription>
                      </CardHeader>
                      <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activeSnapshot.usage.daily}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} />
                            <YAxis axisLine={false} tickLine={false} fontSize={10} />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-background border p-3 rounded-xl shadow-2xl text-[10px] font-mono space-y-1">
                                      <p className="font-bold border-b pb-1 mb-1 uppercase tracking-widest opacity-70">{label}</p>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-primary font-bold">BURN:</span>
                                        <span className="font-bold">${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">UNITS:</span>
                                        <span className="font-bold">{payload[0].payload.requests?.toLocaleString()} REQS</span>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="cost" 
                              stroke="hsl(var(--primary))" 
                              fill="hsl(var(--primary))" 
                              fillOpacity={0.1} 
                              strokeWidth={3} 
                              name="Burn (USD)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="border-none shadow-sm bg-white p-6">
                      <CardHeader className="px-0 pt-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg font-headline">Usage Attribution</CardTitle>
                            <CardDescription>Risk distribution by feature.</CardDescription>
                          </div>
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><Info size={14} /></Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[200px]">
                                Features responsible for over 50% of burn are flagged as high-risk drivers for the Surprise Delta.
                              </TooltipContent>
                            </UITooltip>
                          </TooltipProvider>
                        </div>
                      </CardHeader>
                      <div className="space-y-6 mt-6">
                        {Object.entries(activeSnapshot.usage.byFeature || {}).sort((a, b) => b[1].cost - a[1].cost).map(([id, stats]) => (
                          <div key={id} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase tracking-tight flex items-center gap-1 ${stats.status === 'BREACHED' ? 'text-destructive' : ''}`}>
                                  {id}
                                  {stats.status === 'BREACHED' && <ShieldAlert size={12} className="animate-pulse" />}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{stats.requests.toLocaleString()} Requests</span>
                              </div>
                              <span className="text-sm font-headline font-bold">${stats.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <Progress value={stats.riskContribution * 100} className={`h-1 ${stats.riskContribution > 0.4 || stats.status === 'BREACHED' ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} />
                            <div className="flex justify-between text-[8px] font-bold uppercase text-muted-foreground">
                              <span>Risk Contribution</span>
                              <span className="flex items-center gap-1">
                                {(stats.riskContribution * 100).toFixed(0)}% 
                                {stats.trend !== 0 && (
                                  <span className={stats.trend > 0 ? 'text-destructive' : 'text-green-600'}>
                                    ({stats.trend > 0 ? '+' : ''}{(stats.trend * 100).toFixed(0)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 pt-6 border-t flex flex-col gap-2">
                        <Button asChild variant="outline" className="w-full text-[10px] font-bold uppercase tracking-widest h-10 group">
                          <Link href="/ledger">
                            View Forensic Ledger
                            <ArrowRight size={12} className="ml-2 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest h-10">
                          <Link href="/optimizer">
                            Analyze Playbook
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
