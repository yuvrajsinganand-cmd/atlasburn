
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldCheck, Zap, Server, Loader2, Lock } from "lucide-react"
import { useUser } from "@/firebase"
import { runInstitutionalSimulation } from "@/lib/probabilistic-engine"
import { type SdkProjectSnapshot } from "@/types/sdk"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import Link from "next/link"
import { SystemPulse } from "@/components/system-pulse"
import { useDemoMode } from "@/components/demo-provider"

const getMockSnapshot = (): SdkProjectSnapshot => ({
  projectId: "demo-project",
  isConnected: true,
  hasEvents: true,
  windowDays: 90,
  usage: {
    totalCost: 12450.75,
    promptTokens: 450000000,
    completionTokens: 120000000,
    requests: 842000,
    byModel: {
      "gpt-4o": { cost: 8400, promptTokens: 300000000, completionTokens: 80000000, requests: 500000 },
      "claude-3-5-sonnet": { cost: 4050.75, promptTokens: 150000000, completionTokens: 40000000, requests: 342000 }
    },
    daily: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cost: 300 + Math.random() * 200,
      promptTokens: 10000000,
      completionTokens: 2000000,
      requests: 20000
    }))
  },
  economics: {
    mrr: 45000,
    currentDailyBurn: 415.02,
    burnVolatility: 0.12,
    monthlyGrowthRate: 0.08,
    churnRate: 0.02,
    capitalReserves: 250000
  },
  systemicRisk: {
    outageProb: 0.01,
    retryCascadeProb: 0.03
  }
});

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const { isDemoMode } = useDemoMode();
  const [snapshot, setSnapshot] = useState<SdkProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchSnapshot() {
      if (isUserLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/projects/${user.uid}/snapshot?windowDays=90`);
        const data = await res.json();
        setSnapshot(data);
      } catch (e) {
        console.error("Failed to fetch forensic snapshot", e);
      } finally {
        setLoading(false);
      }
    }
    fetchSnapshot();
  }, [user, isUserLoading]);

  const activeSnapshot = useMemo(() => {
    if (!mounted) return null;
    if (snapshot?.hasEvents) return snapshot;
    if (isDemoMode) return getMockSnapshot();
    return snapshot;
  }, [snapshot, isDemoMode, mounted]);

  if (!mounted || isUserLoading || (loading && !isDemoMode)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
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
              <Badge variant="outline" className={`${isDemoMode && !snapshot?.hasEvents ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'} gap-1 uppercase text-[10px] font-bold`}>
                <ShieldCheck size={12} /> {isDemoMode && !snapshot?.hasEvents ? 'Simulated Feed' : 'Live Ingestion'}
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
                <Card className="flex-1 p-8 border-none shadow-xl bg-white flex flex-col items-center gap-6 group hover:ring-2 hover:ring-primary/20 transition-all">
                  <Server className="text-primary group-hover:scale-110 transition-transform" size={48} />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Initialize SDK</h3>
                    <p className="text-sm text-muted-foreground">Follow the integration protocol to connect your production cluster.</p>
                  </div>
                  <Button asChild variant="outline" className="w-full h-12 font-headline font-bold">
                    <Link href="/usage">Integration Protocol</Link>
                  </Button>
                </Card>

                <Card className="flex-1 p-8 border-none shadow-xl bg-white flex flex-col items-center gap-6 group hover:ring-2 hover:ring-primary/20 transition-all">
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
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">P50 Baseline Burn</p>
                      <p className="text-2xl font-headline font-bold text-primary">${simResult.result.p50Burn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </Card>
                    <Card className="p-6 border-none shadow-sm bg-white">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Survival Probability</p>
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

                  <Card className="border-none shadow-sm bg-white p-6">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-lg font-headline">Institutional Burn Attribution</CardTitle>
                    </CardHeader>
                    <div className="h-[300px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeSnapshot.usage.daily}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} />
                          <Tooltip />
                          <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
