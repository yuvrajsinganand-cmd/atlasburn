
"use client"

import { useState, useMemo, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, BarChart3, Activity, Target, SlidersHorizontal, Zap, Loader2, Beaker, ShieldCheck, Flame, Clock } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { generateRiskProfile } from "@/lib/math-engine"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function AtlasBurnDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [volatilityAdj, setVolatilityAdj] = useState<number | null>(null);
  const [growthAdj, setGrowthAdj] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<number>(90); // Default to 3 months (90 days)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (!usageRecords || !mounted) return null;
    return generateRiskProfile(usageRecords, organization, {
      volatility: volatilityAdj ?? undefined,
      growth: growthAdj ?? undefined,
      daysRemaining: horizon
    });
  }, [usageRecords, organization, growthAdj, volatilityAdj, horizon, mounted]);

  const chartData = useMemo(() => {
    if (!usageRecords || usageRecords.length === 0 || !mounted) return [];
    const grouped = usageRecords.reduce((acc: any, rec) => {
      const date = new Date(rec.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      if (!acc[date]) acc[date] = { date, burn: 0 };
      acc[date].burn += rec.cost || 0;
      return acc;
    }, {});
    return Object.values(grouped).reverse();
  }, [usageRecords, mounted]);

  const horizonLabel = useMemo(() => {
    if (horizon === 90) return "Quarterly Outlook";
    if (horizon === 180) return "6 Month Projection";
    if (horizon === 365) return "1 Year Forecast";
    if (horizon >= 1095) return "Survival Horizon (Full)";
    return `${Math.round(horizon / 30)} Month Outlook`;
  }, [horizon]);

  if (orgLoading || usageLoading || !mounted) {
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
            <h1 className="font-headline text-xl font-bold tracking-tighter text-primary uppercase">Atlas Burn <span className="text-muted-foreground text-[10px] font-mono ml-2 uppercase tracking-widest">Institutional Mode</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={horizon.toString()} onValueChange={(v) => setHorizon(parseInt(v))} className="hidden md:block">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="90" className="text-[10px] font-bold">3M</TabsTrigger>
                <TabsTrigger value="180" className="text-[10px] font-bold">6M</TabsTrigger>
                <TabsTrigger value="365" className="text-[10px] font-bold">12M</TabsTrigger>
                <TabsTrigger value="1095" className="text-[10px] font-bold">FULL</TabsTrigger>
              </TabsList>
            </Tabs>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-headline font-bold">
                  <SlidersHorizontal size={14} /> Stress Injector
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold font-headline text-sm text-primary">Systemic Shock Parameters</h4>
                  <p className="text-[10px] text-muted-foreground uppercase leading-tight">Injecting variables into Log-Normal risk engine.</p>
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
                <p className="text-muted-foreground">The Log-Normal Risk Engine requires history to derive operational CV. Inject a forensic test to prime the simulation.</p>
              </div>
              <Button asChild size="lg" className="rounded-full px-8 font-headline font-bold shadow-xl"><Link href="/usage">Run Ingestion Test</Link></Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Baseline Burn</span><Flame size={16} className="text-amber-500" /></div>
                  <div className="text-2xl font-headline font-bold text-amber-500">
                    ${riskProfile!.baselineMonthlyBurn.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal opacity-70">/mo</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Institutional Floor Applied</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white border-l-4 border-green-600">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Survival Prob</span><ShieldCheck size={16} className="text-green-600" /></div>
                  <div className="text-2xl font-headline font-bold text-green-600">
                    {(riskProfile!.simulation.survivalProbability * 100).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">{horizonLabel}</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white border-l-4 border-destructive">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-destructive uppercase tracking-widest">Value at Risk (VaR)</span><TrendingUp size={16} className="text-destructive" /></div>
                  <div className="text-2xl font-headline font-bold text-destructive">
                    ${riskProfile!.simulation.var95.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Period Surprise Stress</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Projected Runway</span><Target size={16} className="text-primary" /></div>
                  <div className="text-2xl font-headline font-bold text-primary">
                    {riskProfile!.simulation.expectedRunwayMonths.toFixed(1)} <span className="text-lg font-normal opacity-70">Mo</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Median Forecast Horizon</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Forensic Volatility</span><Activity size={16} className="text-accent" /></div>
                  <div className="text-2xl font-headline font-bold text-accent">
                    {(riskProfile!.volatility * 100).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Coefficient of Variation (CV)</p>
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
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Conditional VaR (CVaR)</p>
                      <p className="text-3xl font-headline font-bold">${riskProfile!.simulation.cvar95.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-[9px] opacity-60 mt-1 uppercase tracking-tight">Avg burn in worst 5% tail scenarios</p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed opacity-90 italic">
                        "{riskProfile!.marginStatus.description}"
                      </p>
                      <Button variant="outline" className="w-full bg-white text-primary hover:bg-white/90 font-headline font-bold h-12 shadow-xl" asChild>
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
