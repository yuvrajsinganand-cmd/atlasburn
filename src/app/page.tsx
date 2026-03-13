
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldCheck, Zap, Server, Loader2, Lock, ArrowRight, Info, ShieldAlert, TrendingUp, Calendar, BarChart3, AlertCircle, Cpu } from "lucide-react"
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
        "gpt-4o": { cost: 8400, prompt_tokens: 300000000, completion_tokens: 80000000, requests: 500000 },
        "claude-3-5-sonnet": { cost: 4050.75, prompt_tokens: 150000000, completion_tokens: 40000000, requests: 342000 }
      },
      byFeature: {
        "support-bot-alpha": { cost: 7200, requests: 400000, riskContribution: 0.58, status: 'BREACHED', trend: 4.2 },
        "document-analysis": { cost: 3100, requests: 200000, riskContribution: 0.25, status: 'PROTECTED', trend: -0.1 },
        "realtime-chat": { cost: 2150.75, requests: 242000, riskContribution: 0.17, status: 'PROTECTED', trend: 0.05 }
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

  const metricConfig = {
    cost: { label: "Deterministic Burn", color: "hsl(var(--primary))", unit: "$", description: "Visualizing daily capital outflow in USD." },
    risk: { label: "Survival Probability", color: "hsl(var(--chart-5))", unit: "%", description: "Probabilistic health based on stochastic modeling." },
    delta: { label: "Surprise Delta (VaR)", color: "hsl(var(--destructive))", unit: "$", description: "The P95 risk gap between expected and stress outcomes." },
    volatility: { label: "Forensic Volatility", color: "hsl(var(--accent))", unit: "%", description: "Statistical variance in token consumption patterns." }
  };

  const budgetThreshold = organization?.fixedMonthlyBurn ? (organization.fixedMonthlyBurn / 30) : 100;

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

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
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
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Runtime Signals</h3>
                    <Badge variant="outline" className="bg-primary/5 text-primary text-[9px] font-bold border-primary/10">LIVE TELEMETRY</Badge>
                  </div>
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
                    <button 
                      onClick={() => setActiveMetric('cost')}
                      className={cn(
                        "p-6 border rounded-xl text-left transition-all duration-300 group hover:shadow-md",
                        activeMetric === 'cost' ? "bg-white border-primary shadow-lg ring-2 ring-primary/10" : "bg-white border-transparent"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Today's Institutional Burn</p>
                        <div className={cn("p-1.5 rounded-lg transition-colors", activeMetric === 'cost' ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary")}>
                          <Zap size={14} />
                        </div>
                      </div>
                      <p className={cn("text-2xl font-headline font-bold transition-colors", activeMetric === 'cost' ? "text-primary" : "text-foreground")}>
                        ${(latestMetric?.cost || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-2 font-medium">Deterministic real-time capture</p>
                    </button>

                    <button 
                      onClick={() => setActiveMetric('risk')}
                      className={cn(
                        "p-6 border rounded-xl text-left transition-all duration-300 group hover:shadow-md",
                        activeMetric === 'risk' ? "bg-white border-green-600 shadow-lg ring-2 ring-green-600/10" : "bg-white border-transparent"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Today's Survival Health</p>
                        <div className={cn("p-1.5 rounded-lg transition-colors", activeMetric === 'risk' ? "bg-green-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-green-600/10 group-hover:text-green-600")}>
                          <ShieldCheck size={14} />
                        </div>
                      </div>
                      <p className={cn("text-2xl font-headline font-bold transition-colors", activeMetric === 'risk' ? "text-green-600" : "text-foreground")}>
                        {(simResult.result.survivalProbability * 100).toFixed(1)}%
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-2 font-medium">10k Path Stochastic Result</p>
                    </button>

                    <button 
                      onClick={() => setActiveMetric('delta')}
                      className={cn(
                        "p-6 border rounded-xl text-left transition-all duration-300 group hover:shadow-md",
                        activeMetric === 'delta' ? "bg-white border-destructive shadow-lg ring-2 ring-destructive/10" : "bg-white border-transparent"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">Today's Surprise Delta</p>
                        <div className={cn("p-1.5 rounded-lg transition-colors", activeMetric === 'delta' ? "bg-destructive text-white" : "bg-muted text-muted-foreground group-hover:bg-destructive/10 group-hover:text-destructive")}>
                          <TrendingUp size={14} />
                        </div>
                      </div>
                      <p className={cn("text-2xl font-headline font-bold transition-colors", activeMetric === 'delta' ? "text-destructive" : "text-foreground")}>
                        ${(simResult.result.var95).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-2 font-medium">P95 Simulated Stress Gap</p>
                    </button>

                    <button 
                      onClick={() => setActiveMetric('volatility')}
                      className={cn(
                        "p-6 border rounded-xl text-left transition-all duration-300 group hover:shadow-md",
                        activeMetric === 'volatility' ? "bg-white border-accent shadow-lg ring-2 ring-accent/10" : "bg-white border-transparent"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Today's Forensic Volatility</p>
                        <div className={cn("p-1.5 rounded-lg transition-colors", activeMetric === 'volatility' ? "bg-accent text-white" : "bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent")}>
                          <BarChart3 size={14} />
                        </div>
                      </div>
                      <p className={cn("text-2xl font-headline font-bold transition-colors", activeMetric === 'volatility' ? "text-accent" : "text-foreground")}>
                        {((latestMetric?.volatility || 0) * 100).toFixed(1)}%
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-2 font-medium">Active noise coefficient</p>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
                      <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-headline flex items-center gap-2">
                            {metricConfig[activeMetric].label} 
                            <span className="text-xs font-mono font-normal opacity-50 px-2 py-0.5 bg-muted rounded-full uppercase tracking-widest">{period === "1" ? "Today" : `${period}D Horizon`}</span>
                          </CardTitle>
                          <CardDescription>{metricConfig[activeMetric].description}</CardDescription>
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
                                <stop offset="5%" stopColor={metricConfig[activeMetric].color} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={metricConfig[activeMetric].color} stopOpacity={0}/>
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
                            <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => activeMetric === 'cost' || activeMetric === 'delta' ? `$${val}` : `${(val * 100).toFixed(0)}%`} />
                            
                            {/* Budget Guardrail Line */}
                            {activeMetric === 'cost' && (
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
                            )}

                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-background border p-3 rounded-xl shadow-2xl text-[10px] font-mono space-y-2 min-w-[180px]">
                                      <p className="font-bold border-b pb-1 mb-1 uppercase tracking-widest opacity-70">{new Date(label).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                      <div className="flex justify-between gap-4">
                                        <span className="font-bold uppercase" style={{ color: metricConfig[activeMetric].color }}>{activeMetric}:</span>
                                        <span className="font-bold">
                                          {activeMetric === 'cost' || activeMetric === 'delta' ? `$${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `${(Number(payload[0].value) * 100).toFixed(1)}%`}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground uppercase">LOAD:</span>
                                        <span className="font-bold">{data.requests?.toLocaleString()} REQS</span>
                                      </div>
                                      
                                      {data.isAnomaly && activeMetric === 'cost' && (
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
                              dataKey={activeMetric} 
                              stroke={metricConfig[activeMetric].color} 
                              fill="url(#colorMetric)" 
                              strokeWidth={3} 
                              animationDuration={1000}
                              dot={(props) => {
                                const { payload, cx, cy } = props;
                                if (payload.isAnomaly && activeMetric === 'cost') {
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
