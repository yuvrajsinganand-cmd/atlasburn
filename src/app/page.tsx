"use client"

import { useState, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, BarChart3, Activity, Target, SlidersHorizontal, Zap, Loader2, Beaker, ShieldCheck } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { generateRiskProfile } from "@/lib/math-engine"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import Link from "next/link"

export default function AtlasBurnDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [volatilityAdj, setVolatilityAdj] = useState<number | null>(null);
  const [growthAdj, setGrowthAdj] = useState<number | null>(null);

  const orgRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'organizations', `org_${user.uid}`);
  }, [firestore, user]);
  const { data: organization, isLoading: orgLoading } = useDoc(orgRef);

  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
  }, [firestore, user]);
  const { data: usageRecords, isLoading: usageLoading } = useCollection(usageQuery);

  const riskProfile = useMemo(() => {
    if (!usageRecords) return null;
    return generateRiskProfile(usageRecords, organization, {
      volatility: volatilityAdj ?? undefined,
      growth: growthAdj ?? undefined
    });
  }, [usageRecords, organization, growthAdj, volatilityAdj]);

  const chartData = useMemo(() => {
    if (!usageRecords || usageRecords.length === 0) return [];
    const grouped = usageRecords.reduce((acc: any, rec) => {
      const date = new Date(rec.timestamp).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      if (!acc[date]) acc[date] = { date, burn: 0 };
      acc[date].burn += rec.cost || 0;
      return acc;
    }, {});
    return Object.values(grouped).reverse();
  }, [usageRecords]);

  if (orgLoading || usageLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background/50">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold tracking-tighter">ATLAS BURN <span className="text-primary/50 text-xs font-mono ml-2">v3.1-QUANT</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-headline font-bold">
                  <SlidersHorizontal size={14} /> Stress Injector
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold font-headline text-sm text-primary">Systemic Shock Parameters</h4>
                  <p className="text-[10px] text-muted-foreground uppercase leading-tight">Injecting variables into Monte Carlo risk engine.</p>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span>Usage Growth Intensity</span>
                      <span>{((growthAdj ?? 0.05) * 100).toFixed(0)}%</span>
                    </div>
                    <Slider value={[((growthAdj ?? 0.05) * 100)]} onValueChange={([v]) => setGrowthAdj(v / 100)} max={100} step={1} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span>Engine Volatility (CV)</span>
                      <span>{((volatilityAdj ?? riskProfile?.volatility ?? 0.1) * 100).toFixed(0)}%</span>
                    </div>
                    <Slider value={[((volatilityAdj ?? riskProfile?.volatility ?? 0.1) * 100)]} onValueChange={([v]) => setVolatilityAdj(v / 100)} max={100} step={1} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${riskProfile?.marginStatus.bg} ${riskProfile?.marginStatus.color}`}>
              <Activity size={14} />
              {riskProfile?.marginStatus.label}
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {!usageRecords?.length ? (
            <Card className="p-12 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-6 bg-white/50">
              <div className="bg-primary/10 p-4 rounded-full text-primary"><Beaker size={48} /></div>
              <div className="space-y-2 max-w-md">
                <h2 className="text-2xl font-headline font-bold">Awaiting Forensic Feed</h2>
                <p className="text-muted-foreground">The Institutional Engine requires usage history to derive volatility. Inject a forensic test to prime the simulation.</p>
              </div>
              <Button asChild size="lg" className="rounded-full px-8 font-headline font-bold"><Link href="/usage">Run Ingestion Test</Link></Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Survival Prob</span><ShieldCheck size={16} className="text-green-600" /></div>
                  <div className="text-3xl font-headline font-bold text-green-600">
                    {(riskProfile!.simulation.survivalProbability * 100).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Institutional Confidence Level</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Value at Risk (VaR)</span><TrendingUp size={16} className="text-destructive" /></div>
                  <div className="text-3xl font-headline font-bold text-destructive">
                    ${riskProfile!.simulation.var95.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Potential P95 Monthly Spike</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Projected Runway</span><Target size={16} className="text-primary" /></div>
                  <div className="text-3xl font-headline font-bold text-primary">
                    {riskProfile!.simulation.expectedRunwayMonths.toFixed(1)} <span className="text-lg font-normal opacity-70">Mo</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Median Forecast Horizon</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Forensic Volatility</span><Activity size={16} className="text-accent" /></div>
                  <div className="text-3xl font-headline font-bold text-accent">
                    {(riskProfile!.volatility * 100).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Derived from Ingestion Variance</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg font-headline">Forensic Burn Trajectory</CardTitle>
                    <CardDescription>Rolling daily burn derived from real SDK ingestion stream.</CardDescription>
                  </CardHeader>
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorBurn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="burn" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorBurn)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                
                <Card className="border-none shadow-sm bg-primary text-primary-foreground p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><Zap /> Quantitative Analysis</CardTitle>
                  </CardHeader>
                  <div className="space-y-6">
                    <div className="p-4 bg-white/10 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Conditional VaR (CVaR)</p>
                      <p className="text-2xl font-headline font-bold">${riskProfile!.simulation.cvar95.toFixed(2)}</p>
                      <p className="text-[9px] opacity-60 mt-1 uppercase tracking-tight">Average burn in worst 5% scenarios</p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed opacity-90 italic">
                        "{riskProfile!.marginStatus.description}"
                      </p>
                      <Button variant="outline" className="w-full bg-white text-primary hover:bg-white/90 font-headline font-bold" asChild>
                        <Link href="/optimizer">Execute Optimization Playbook</Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
