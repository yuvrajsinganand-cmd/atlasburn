
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldCheck, Zap, Server, Loader2, Lock, ArrowRight, Info, ShieldAlert, TrendingUp, Calendar, BarChart3, AlertCircle, Cpu, Clock, MousePointer2 } from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { runInstitutionalSimulation } from "@/lib/probabilistic-engine"
import { type SdkProjectSnapshot } from "@/types/sdk"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts"
import Link from "next/link"
import { SystemPulse } from "@/components/system-pulse"
import { useDemoMode } from "@/components/demo-provider"
import { generateMockSignals, translateSignalsToEconomicFactors } from "@/lib/runtime-signals"
import { RuntimeSignalsGrid } from "@/components/runtime-signals-grid"
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
import { cn } from "@/lib/utils"

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
  const [period, setPeriod] = useState<"1" | "7" | "14" | "30">("7");
  const [activeMetric, setActiveMetric] = useState<"cost" | "risk" | "delta" | "volatility">("cost");

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

  // Fetch Guardrail Config for the graph threshold
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
      snap.usage.daily = snap.usage.daily.map(d => ({
        ...d,
        risk: Math.max(0, 1 - (d.cost / (snap.economics.currentDailyBurn || 1) * 0.5)),
        delta: d.cost * 0.15,
        volatility: snap.economics.burnVolatility || 0.15
      }));
      return snap;
    }
    
    if (isDemoMode && !realDataExists) {
      return getMockSnapshot(windowDays);
    }
    
    return {
      projectId: user?.uid || 'anonymous',
      isConnected: true,
      hasEvents: false,
      windowDays: windowDays,
      usage: { totalCost: 0, promptTokens: 0, completionTokens: 0, requests: 0, byModel: {}, byFeature: {}, daily: [] },
      economics: { mrr: organization?.monthlyRevenue || 0, capitalReserves: organization?.capitalReserves || 0 },
      systemicRisk: { spikeAlerts: [] }
    } as SdkProjectSnapshot;
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
              <div className="relative">
                <div className="bg-primary/10 p-8 rounded-[2rem] text-primary">
                  <Lock size={64} />
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 bg-background border rounded-full shadow-lg">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              </div>
              <div className="space-y-4 max-w-xl">
                <h2 className="text-4xl font-headline font-bold">Awaiting Ingestion Heartbeat</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  AtlasBurn is listening for real-time forensic metadata. Connect your production cluster via the SDK to activate deterministic modeling.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
                <Card className="flex-1 p-8 border-none shadow-xl bg-white flex flex-col items-center gap-6 group hover:ring-2 hover:ring-primary/20 transition-all text-left">
                  <Server className="text-primary group-hover:scale-110 transition-transform" size={48} />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Initialize SDK</h3>
                    <p className="text-sm text-muted-foreground">The Dashboard will activate automatically upon the first token flush.</p>
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
              {/* SECTION 1: OBSERVED AI SPEND */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-headline font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <BarChart3 size={20} /> AI Spend — Observed (Real-Time)
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">Deterministic metrics captured directly from your SDK telemetry.</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">REAL-TIME TELEMETRY</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white border-none shadow-sm p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Observed Spend Today</p>
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Zap size={14} />
                      </div>
                    </div>
                    <p className="text-3xl font-headline font-bold text-primary">
                      ${(latestMetric?.cost || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-2 font-medium">Ground-truth capture for {new Date().toLocaleDateString()}</p>
                  </Card>

                  <Card className="bg-white border-none shadow-sm p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Burn Rate</p>
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Clock size={14} />
                      </div>
                    </div>
                    <p className="text-3xl font-headline font-bold text-foreground">
                      ${burnRatePerMin.toFixed(4)} <span className="text-xs font-normal opacity-50 uppercase tracking-widest">/ min</span>
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-2 font-medium">Current velocity based on recent activity</p>
                  </Card>

                  <Card className="bg-white border-none shadow-sm p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg. Unit Economics</p>
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <MousePointer2 size={14} />
                      </div>
                    </div>
                    <p className="text-3xl font-headline font-bold text-foreground">
                      {formatCostPerRequest(globalCostPerRequest)} <span className="text-xs font-normal opacity-50 uppercase tracking-widest">/ req</span>
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-2 font-medium">Blended average across all active features</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
                    <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-headline flex items-center gap-2">
                          Observed Spend Trends
                          <span className="text-xs font-mono font-normal opacity-50 px-2 py-0.5 bg-muted rounded-full uppercase tracking-widest">{period === "1" ? "Today" : `${period}D Horizon`}</span>
                        </CardTitle>
                        <CardDescription>Visualizing deterministic capital outflow captured from telemetry.</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                         <Tabs value={period} onValueChange={(v: any) => setPeriod(v)} className="bg-muted/50 p-1 rounded-lg">
                          <TabsList className="bg-transparent h-8 gap-1">
                            <TabsTrigger value="1" className="text-[10px] font-bold uppercase px-3 h-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Real-time</TabsTrigger>
                            <TabsTrigger value="7" className="text-[10px] font-bold uppercase px-3 h-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">7 Days</TabsTrigger>
                            <TabsTrigger value="14" className="text-[10px] font-bold uppercase px-3 h-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">14 Days</TabsTrigger>
                            <TabsTrigger value="30" className="text-[10px] font-bold uppercase px-3 h-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">This Month</TabsTrigger>
                          </TabsList>
                        </Tabs>
                         <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(activeSnapshot.usage.daily[0]?.date || Date.now()).toLocaleDateString()} — {new Date().toLocaleDateString()}</span>
                         </div>
                      </div>
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
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            fontSize={10} 
                            tickFormatter={(str) => {
                              const d = new Date(str);
                              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            }}
                          />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `$${val}`} />
                          
                          <ReferenceLine 
                            y={budgetThreshold} 
                            stroke="hsl(var(--destructive))" 
                            strokeDasharray="3 3" 
                            label={{ 
                              value: `GUARDRAIL: $${budgetThreshold.toFixed(0)}/DAY`, 
                              position: 'insideBottomRight', 
                              fill: 'hsl(var(--destructive))',
                              fontSize: 9,
                              fontWeight: 'bold',
                              dy: -10
                            }} 
                          />

                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-background border p-3 rounded-xl shadow-2xl text-[10px] font-mono space-y-2 min-w-[180px]">
                                    <p className="font-bold border-b pb-1 mb-1 uppercase tracking-widest opacity-70">{new Date(label).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                    <div className="flex justify-between gap-4">
                                      <span className="font-bold uppercase text-primary">OBSERVED:</span>
                                      <span className="font-bold">
                                        ${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-muted-foreground uppercase">LOAD:</span>
                                      <span className="font-bold">{data.requests?.toLocaleString()} REQS</span>
                                    </div>
                                    
                                    {data.isAnomaly && (
                                      <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                                        <div className="flex items-center gap-1 text-destructive font-bold uppercase text-[8px]">
                                          <AlertCircle size={10} /> Deterministic Spike Detected
                                        </div>
                                        <p className="text-[9px] text-destructive leading-tight italic">
                                          {data.anomalyDetails}
                                        </p>
                                      </div>
                                    )}
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
                            fill="url(#colorMetric)" 
                            strokeWidth={3} 
                            animationDuration={1000}
                            dot={(props) => {
                              const { payload, cx, cy } = props;
                              if (payload.isAnomaly) {
                                return (
                                  <circle 
                                    key={`anomaly-${payload.date}`}
                                    cx={cx} 
                                    cy={cy} 
                                    r={5} 
                                    fill="hsl(var(--destructive))" 
                                    stroke="white" 
                                    strokeWidth={2} 
                                    className="animate-pulse cursor-help"
                                  />
                                );
                              }
                              return null as any;
                            }}
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
                          <CardDescription>Ground-truth risk by feature.</CardDescription>
                        </div>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><Info size={14} /></Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              Features responsible for over 50% of burn are flagged as high-risk drivers for potential budget breaches.
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>
                    <div className="space-y-6 mt-6">
                      {Object.entries(activeSnapshot.usage.byFeature || {}).sort((a, b) => b[1].cost - a[1].cost).map(([id, stats]) => (
                        <div key={id} className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold uppercase tracking-tight flex items-center gap-1 ${stats.status === 'BREACHED' ? 'text-destructive' : ''}`}>
                                {id}
                                {stats.status === 'BREACHED' && <ShieldAlert size={12} className="animate-pulse" />}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{stats.requests.toLocaleString()} Requests</span>
                            </div>
                            <div className="flex flex-col items-end text-right">
                              <span className="text-sm font-headline font-bold">${stats.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} total</span>
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[10px] text-muted-foreground font-medium cursor-help">
                                      {formatCostPerRequest(stats.costPerRequest)} / req
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    Average cost for each request executed by this feature. Helps identify inefficient or expensive AI features.
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          <Progress value={stats.riskContribution * 100} className={`h-1 ${stats.riskContribution > 0.4 || stats.status === 'BREACHED' ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} />
                          <div className="flex justify-between text-[8px] font-bold uppercase text-muted-foreground">
                            <span>Attribution</span>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white border-none shadow-sm p-6 group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Budget Safety Forecast</p>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info size={12} className="text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                              Probability that current usage patterns remain within budget. Computed using 10,000 stochastic paths.
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <div className="p-1.5 rounded-lg bg-green-100 text-green-600">
                        <ShieldCheck size={14} />
                      </div>
                    </div>
                    <p className="text-3xl font-headline font-bold text-green-600">
                      {simResult?.status === 'READY' ? (simResult.result.survivalProbability * 100).toFixed(1) : '---'}%
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter italic">Forecast based on Monte Carlo simulation</p>
                  </Card>

                  <Card className="bg-white border-none shadow-sm p-6 group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Worst Case Cost Risk</p>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info size={12} className="text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                              Estimated P95 cost spike (Surprise Delta) based on stochastic simulation. This is your "Value at Risk".
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
                        <TrendingUp size={14} />
                      </div>
                    </div>
                    <p className="text-3xl font-headline font-bold text-destructive">
                      ${simResult?.status === 'READY' ? (simResult.result.var95).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter italic">Forecast based on Monte Carlo simulation</p>
                  </Card>

                  <Card className="bg-white border-none shadow-sm p-6 group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cost Instability Index</p>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info size={12} className="text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                              Measures volatility in token consumption patterns. High volatility drives higher risk in survival paths.
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                        <BarChart3 size={14} />
                      </div>
                    </div>
                    <p className="text-3xl font-headline font-bold text-accent">
                      {latestMetric?.volatility ? (latestMetric.volatility * 100).toFixed(1) : '---'}%
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter italic">Risk simulation input parameter</p>
                  </Card>
                </div>

                {activeSnapshot.runtimeSignals && (
                  <div className="pt-4">
                    <RiskAlertBanner 
                      var95={simResult?.status === 'READY' ? simResult.result.var95 : 0} 
                      retryProb={activeSnapshot.systemicRisk.retryCascadeProb || 0} 
                    />
                    <RuntimeSignalsGrid signals={activeSnapshot.runtimeSignals} />
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
