
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldCheck, Zap, Server, Loader2, Lock, ArrowRight, Info, ShieldAlert, TrendingUp, Calendar, BarChart3, AlertCircle, Cpu, Clock, MousePointer2, Repeat, Maximize, Layers } from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { runInstitutionalSimulation } from "@/lib/probabilistic-engine"
import { type SdkProjectSnapshot } from "@/types/sdk"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts"
import Link from "next/link"
import { SystemPulse } from "@/components/system-pulse"
import { useDemoMode } from "@/components/demo-provider"
import { generateMockSignals, translateSignalsToEconomicFactors } from "@/lib/runtime-signals"
import { RiskAlertBanner } from "@/components/risk-alert-banner"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Tooltip as UITooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { aggregateSnapshot } from "@/lib/forensic-engine"

const getMockSnapshot = (windowDays: number): SdkProjectSnapshot => {
  const signals = generateMockSignals();
  const impacts = translateSignalsToEconomicFactors(signals);

  return {
    projectId: "demo-project",
    isConnected: true,
    hasEvents: true,
    windowDays: windowDays,
    runtimeSignals: signals,
    usage: {
      totalCost: 12450.75 * (windowDays / 30),
      promptTokens: 450000000,
      completionTokens: 120000000,
      requests: 842000,
      requestsPerSecond: signals.requestRate,
      byModel: {
        "gpt-4o": { cost: 8400, promptTokens: 300000000, completionTokens: 80000000, requests: 500000 },
        "claude-3-5-sonnet": { cost: 4050.75, promptTokens: 150000000, completionTokens: 40000000, requests: 342000 }
      },
      byFeature: {
        "support-bot-alpha": { cost: 7200, requests: 400000, riskContribution: 0.58, status: 'BREACHED', trend: 4.2, costPerRequest: 0.018 },
        "document-analysis": { cost: 3100, requests: 200000, riskContribution: 0.25, status: 'PROTECTED', trend: -0.1, costPerRequest: 0.0155 },
        "realtime-chat": { cost: 2150.75, requests: 242000, riskContribution: 0.17, status: 'PROTECTED', trend: 0.05, costPerRequest: 0.0089 }
      },
      daily: Array.from({ length: windowDays }, (_, i) => {
        const baseCost = 300 + Math.random() * 200;
        const isAnomaly = i === Math.floor(windowDays / 2);
        return {
          date: new Date(Date.now() - (windowDays - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cost: isAnomaly ? 850 : baseCost,
          promptTokens: 10000000,
          completionTokens: 2000000,
          requests: 20000 + Math.floor(Math.random() * 5000),
          risk: Math.max(0, 1 - (baseCost / 600)),
          delta: baseCost * (0.1 + Math.random() * 0.2),
          volatility: 0.1 + Math.random() * 0.1,
          isAnomaly,
          anomalyDetails: isAnomaly ? "Support-bot-alpha retry cascade: +420% token burst" : null
        };
      })
    },
    economics: {
      mrr: 45000,
      currentDailyBurn: 415.02,
      burnVolatility: impacts.burnVolatility,
      monthlyGrowthRate: 0.08,
      churnRate: 0.02,
      capitalReserves: 250000,
      projectedMonthlyBill: 12450.75,
      budgetRunwayDays: 28
    },
    systemicRisk: {
      outageProb: impacts.outageProb,
      retryCascadeProb: impacts.retryCascadeProb,
      scenarioImpactUsd: 3200,
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
  const [period, setPeriod] = useState<"1" | "7" | "14" | "30">("7");

  useEffect(() => {
    setMounted(true);
  }, []);

  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      orderBy('timestamp', 'desc'),
      limit(1000)
    );
  }, [firestore, user]);

  const { data: usageRecords, isLoading: loadingUsage } = useCollection(usageQuery);

  const orgRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'organizations', `org_${user.uid}`);
  }, [firestore, user]);

  const { data: organization } = useDoc(orgRef);

  const guardrailRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "organizations", `org_${user.uid}`, "guardrail", "config");
  }, [firestore, user]);

  const { data: guardrailConfig } = useDoc(guardrailRef);

  const activeSnapshot = useMemo(() => {
    if (!mounted || loadingUsage) return null;
    
    const windowDays = parseInt(period);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);

    const filteredRecords = usageRecords?.filter(r => {
      const recordDate = new Date(r.timestamp);
      return recordDate >= cutoffDate;
    }) || [];

    const realDataExists = filteredRecords.length > 0;

    if (realDataExists) {
      const snap = aggregateSnapshot(user?.uid || 'anonymous', filteredRecords, organization || {}, windowDays);
      return snap;
    }
    
    if (isDemoMode && !realDataExists) {
      return getMockSnapshot(windowDays);
    }
    
    return null;
  }, [usageRecords, organization, isDemoMode, mounted, user, loadingUsage, period]);

  const simResult = useMemo(() => {
    return activeSnapshot?.hasEvents ? runInstitutionalSimulation(activeSnapshot) : null;
  }, [activeSnapshot]);

  const latestMetric = useMemo(() => {
    if (!activeSnapshot?.usage?.daily || activeSnapshot.usage.daily.length === 0) return null;
    return activeSnapshot.usage.daily[activeSnapshot.usage.daily.length - 1];
  }, [activeSnapshot]);

  const burnRatePerMin = useMemo(() => {
    if (!latestMetric?.cost) return 0;
    const now = new Date();
    const minutesElapsed = now.getHours() * 60 + now.getMinutes();
    return latestMetric.cost / Math.max(minutesElapsed, 1);
  }, [latestMetric]);

  const globalCostPerRequest = useMemo(() => {
    if (!activeSnapshot?.usage?.totalCost || !activeSnapshot?.usage?.requests) return 0;
    return activeSnapshot.usage.totalCost / activeSnapshot.usage.requests;
  }, [activeSnapshot]);

  const budgetThreshold = useMemo(() => {
    if (guardrailConfig?.enabled && guardrailConfig.dailyBudgetUsd) {
      return guardrailConfig.dailyBudgetUsd;
    }
    return organization?.fixedMonthlyBurn ? (organization.fixedMonthlyBurn / 30) : 100;
  }, [guardrailConfig, organization]);

  if (!mounted || isUserLoading || (loadingUsage && !isDemoMode && user)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Scanning Ingestion Feed...</p>
        </div>
      </div>
    );
  }

  const formatCostPerRequest = (val: number | undefined) => {
    if (!val || val === 0) return 'N/A';
    if (val < 1) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(2)}`;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Forensic Command</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Est. Monthly AI Bill</span>
              <span className="text-sm font-headline font-bold text-primary">${activeSnapshot?.economics.projectedMonthlyBill?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            {simResult?.status === 'READY' && (
              <Badge variant="outline" className="hidden md:flex bg-primary/5 text-primary border-primary/20 gap-2 px-3 py-1 uppercase text-[10px] font-bold tracking-widest transition-all">
                <Cpu size={12} className="animate-pulse" />
                Monte Carlo Engine: Active
              </Badge>
            )}
            <SystemPulse 
              hasData={!!activeSnapshot?.hasEvents}
              breachProb={simResult?.status === 'READY' ? (1 - simResult.result.survivalProbability) : 0}
              p95BurnDelta={simResult?.status === 'READY' ? simResult.result.var95 : 0}
            />
          </div>
        </header>

        <main className="p-6 space-y-12 max-w-7xl mx-auto w-full">
          {!activeSnapshot || !activeSnapshot.hasEvents ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-8 animate-in fade-in duration-700">
              <div className="bg-primary/10 p-8 rounded-[2rem] text-primary">
                <Lock size={64} />
              </div>
              <div className="space-y-4 max-w-xl">
                <h2 className="text-4xl font-headline font-bold">Awaiting Ingestion Heartbeat</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  AtlasBurn is listening for real-time forensic metadata. Connect your production cluster via the SDK to activate deterministic modeling.
                </p>
              </div>
              <Button asChild size="lg" className="h-14 px-8 font-headline font-bold">
                <Link href="/usage">Integration Protocol</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* SECTION 1: OBSERVED AI SPEND */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-headline font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <BarChart3 size={20} /> AI Spend — Observed (Real-Time)
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">Deterministic operational metrics captured directly from SDK telemetry.</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">REAL-TIME TELEMETRY</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Spend Today</p>
                    <p className="text-xl font-headline font-bold text-primary">${(latestMetric?.cost || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Burn Rate</p>
                    <p className="text-xl font-headline font-bold">${burnRatePerMin.toFixed(4)} <span className="text-[8px] opacity-50 uppercase">/ min</span></p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Cost / Req</p>
                    <p className="text-xl font-headline font-bold">{formatCostPerRequest(globalCostPerRequest)}</p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Throughput</p>
                    <p className="text-xl font-headline font-bold text-foreground">{(activeSnapshot.usage.requestsPerSecond).toFixed(1)} <span className="text-[8px] opacity-50 uppercase">rps</span></p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Model Mix</p>
                      <Layers size={10} className="text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-xl font-headline font-bold">65%</p>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Reasoning</span>
                    </div>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2 group hover:ring-1 hover:ring-destructive/30 transition-all">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Retry Risk</p>
                      <Repeat size={10} className="text-destructive" />
                    </div>
                    <p className="text-xl font-headline font-bold text-destructive">{(activeSnapshot.runtimeSignals?.retryRate ? activeSnapshot.runtimeSignals.retryRate * 100 : 0).toFixed(1)}%</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
                    <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-headline flex items-center gap-2">Observed Spend Trends</CardTitle>
                        <CardDescription>Visualizing deterministic capital outflow from telemetry pulses.</CardDescription>
                      </div>
                      <Tabs value={period} onValueChange={(v: any) => setPeriod(v)} className="bg-muted/50 p-1 rounded-lg">
                        <TabsList className="bg-transparent h-8 gap-1">
                          <TabsTrigger value="1" className="text-[10px] font-bold uppercase px-3 h-6">Real-time</TabsTrigger>
                          <TabsTrigger value="7" className="text-[10px] font-bold uppercase px-3 h-6">7 Days</TabsTrigger>
                          <TabsTrigger value="14" className="text-[10px] font-bold uppercase px-3 h-6">14 Days</TabsTrigger>
                          <TabsTrigger value="30" className="text-[10px] font-bold uppercase px-3 h-6">30 Days</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </CardHeader>
                    <div className="h-[350px] w-full mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeSnapshot.usage.daily}>
                          <defs>
                            <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `$${val}`} />
                          <ReferenceLine y={budgetThreshold} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: `GUARDRAIL: $${budgetThreshold}/DAY`, position: 'insideBottomRight', fill: 'hsl(var(--destructive))', fontSize: 9, fontWeight: 'bold', dy: -10 }} />
                          <Tooltip content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border p-3 rounded-xl shadow-2xl text-[10px] font-mono space-y-2 min-w-[180px]">
                                  <p className="font-bold border-b pb-1 mb-1 uppercase tracking-widest opacity-70">{new Date(label).toLocaleDateString()}</p>
                                  <div className="flex justify-between gap-4"><span className="font-bold uppercase text-primary">OBSERVED:</span><span className="font-bold">${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground uppercase">LOAD:</span><span className="font-bold">{data.requests?.toLocaleString()} REQS</span></div>
                                  {data.isAnomaly && (
                                    <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                                      <div className="flex items-center gap-1 text-destructive font-bold uppercase text-[8px]"><AlertCircle size={10} /> Diagnostic Spike Detected</div>
                                      <p className="text-[9px] text-destructive leading-tight italic">{data.anomalyDetails}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }} />
                          <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fill="url(#colorMetric)" strokeWidth={3} animationDuration={1000} dot={(props) => {
                            const { payload, cx, cy } = props;
                            if (payload.isAnomaly) return <circle key={`anomaly-${payload.date}`} cx={cx} cy={cy} r={5} fill="hsl(var(--destructive))" stroke="white" strokeWidth={2} className="animate-pulse" />;
                            return null as any;
                          }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm bg-white p-6">
                    <CardHeader className="px-0 pt-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-headline">Usage Attribution</CardTitle>
                          <CardDescription>Risk and efficiency by feature.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Info size={14} /></Button>
                      </div>
                    </CardHeader>
                    <div className="space-y-6 mt-6">
                      {Object.entries(activeSnapshot.usage.byFeature || {}).sort((a, b) => b[1].cost - a[1].cost).slice(0, 4).map(([id, stats]) => (
                        <div key={id} className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 ${stats.status === 'BREACHED' ? 'text-destructive' : ''}`}>
                                {id} {stats.status === 'BREACHED' && <ShieldAlert size={10} className="animate-pulse" />}
                              </span>
                              <span className="text-[9px] text-muted-foreground">{stats.requests.toLocaleString()} Requests</span>
                            </div>
                            <div className="flex flex-col items-end text-right">
                              <span className="text-xs font-bold">${stats.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} total</span>
                              <span className="text-[9px] text-muted-foreground font-medium">{formatCostPerRequest(stats.costPerRequest)} / req</span>
                            </div>
                          </div>
                          <Progress value={stats.riskContribution * 100} className={`h-1 ${stats.riskContribution > 0.4 ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 pt-6 border-t">
                      <Button asChild variant="outline" className="w-full text-[10px] font-bold uppercase tracking-widest h-10">
                        <Link href="/ledger">Full Forensic Ledger <ArrowRight size={12} className="ml-2" /></Link>
                      </Button>
                    </div>
                  </Card>
                </div>
              </section>

              {/* SECTION 2: AI COST RISK FORECAST */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-headline font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                      <Activity size={20} /> AI Cost Risk Forecast
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">Stochastic outcomes derived from 10,000-path Monte Carlo simulations.</p>
                  </div>
                  <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 font-bold uppercase tracking-widest text-[10px]">
                    <Cpu size={12} className="mr-1" /> MONTE CARLO ENGINE
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Safety Forecast</p>
                    <p className="text-xl font-headline font-bold text-green-600">{simResult?.status === 'READY' ? (simResult.result.survivalProbability * 100).toFixed(1) : '---'}%</p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Worst Case Risk</p>
                    <p className="text-xl font-headline font-bold text-destructive">${simResult?.status === 'READY' ? (simResult.result.p95Burn).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---'}</p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Surprise Delta</p>
                    <p className="text-xl font-headline font-bold text-accent">${simResult?.status === 'READY' ? (simResult.result.var95).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---'}</p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2 group hover:ring-1 hover:ring-primary/30 transition-all">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Budget Runway</p>
                      <Clock size={10} className="text-primary" />
                    </div>
                    <p className="text-xl font-headline font-bold text-foreground">
                      {activeSnapshot.economics.budgetRunwayDays || '∞'} <span className="text-[8px] opacity-50 uppercase">days</span>
                    </p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Token Volatility</p>
                      <Maximize size={10} className="text-muted-foreground" />
                    </div>
                    <p className="text-xl font-headline font-bold text-accent">{(activeSnapshot.economics.burnVolatility! * 100).toFixed(1)}%</p>
                  </Card>
                  <Card className="bg-white border-none shadow-sm p-4 space-y-2 group hover:ring-1 hover:ring-amber-500/30 transition-all">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Scenario Impact</p>
                      <TrendingUp size={10} className="text-amber-600" />
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-xl font-headline font-bold text-amber-600">+${activeSnapshot.systemicRisk.scenarioImpactUsd?.toLocaleString()}</p>
                      <span className="text-[7px] font-bold text-muted-foreground uppercase">@ 2x LOAD</span>
                    </div>
                  </Card>
                </div>

                <div className="pt-4">
                  <RiskAlertBanner var95={simResult?.status === 'READY' ? simResult.result.var95 : 0} retryProb={activeSnapshot.systemicRisk.retryCascadeProb || 0} />
                </div>
              </section>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
