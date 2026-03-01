"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldCheck, Zap, Terminal, Loader2, ArrowRight } from "lucide-react"
import { useUser } from "@/firebase"
import { runInstitutionalSimulation } from "@/lib/probabilistic-engine"
import { type SdkProjectSnapshot } from "@/types/sdk"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import Link from "next/link"

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const [snapshot, setSnapshot] = useState<SdkProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSnapshot() {
      if (!user) return;
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
    if (!isUserLoading) fetchSnapshot();
  }, [user, isUserLoading]);

  if (isUserLoading || loading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  // SDK GATE 1: Not Connected
  if (!snapshot || !snapshot.isConnected) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-8">
            <div className="bg-primary/10 p-6 rounded-3xl text-primary"><Terminal size={64} /></div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-3xl font-headline font-bold">Connect the SDK</h2>
              <p className="text-muted-foreground">AtlasBurn requires real forensic ingestion to model risk. Connect your product to begin capital simulation.</p>
            </div>
            <div className="bg-zinc-950 text-zinc-50 p-6 rounded-2xl font-mono text-left text-xs max-w-xl w-full border-l-4 border-primary">
              <p className="text-primary mb-2">// Setup Integration</p>
              <p>npm install @atlasburn/sdk</p>
              <p className="mt-4 text-zinc-500">const client = withAtlasBurn(llm, {'{'}</p>
              <p className="pl-4">apiKey: process.env.ATLASBURN_KEY,</p>
              <p className="pl-4">projectId: "{user?.uid}"</p>
              <p>{'}'});</p>
            </div>
            <Button asChild size="lg" className="rounded-full px-8 font-headline font-bold"><Link href="/settings">Configure Keys <ArrowRight className="ml-2" /></Link></Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // SDK GATE 2: No Events
  if (!snapshot.hasEvents) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
            <div className="bg-primary/10 p-6 rounded-3xl text-primary animate-pulse"><Activity size={64} /></div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-3xl font-headline font-bold">Waiting for Forensic Feed</h2>
              <p className="text-muted-foreground">SDK connected. Awaiting your first API events to prime the Log-Normal Risk Engine.</p>
            </div>
            <Button asChild variant="outline" className="rounded-full px-8 font-headline font-bold"><Link href="/usage">Run Test Ingestion</Link></Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const simResult = runInstitutionalSimulation(snapshot);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Forensic Command</h1>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 uppercase text-[10px] font-bold">
            <ShieldCheck size={12} /> Live Forensic Stream
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {simResult.status === 'NOT_READY' ? (
            <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-full"><Zap size={40} /></div>
              <div className="space-y-1">
                <h3 className="text-xl font-headline font-bold text-amber-700">Incomplete Economic Context</h3>
                <p className="text-sm text-muted-foreground">The risk engine is missing: <span className="font-mono font-bold">{simResult.missing.join(', ')}</span></p>
              </div>
              <Button asChild className="font-headline font-bold"><Link href="/profile">Set Economic Guardrails</Link></Button>
            </Card>
          ) : (
            <>
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
                  <p className="text-2xl font-headline font-bold text-accent">{(snapshot.economics.burnVolatility! * 100).toFixed(1)}%</p>
                </Card>
              </div>

              <Card className="border-none shadow-sm bg-white p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-lg font-headline">Historical Burn Attribution</CardTitle>
                </CardHeader>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={snapshot.usage.daily}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} />
                      <YAxis axisLine={false} tickLine={false} fontSize={10} />
                      <Tooltip />
                      <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
