
"use client"

import { useState, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ShieldAlert, BarChart3, Landmark, Activity, Target, SlidersHorizontal, Zap, Scale, Loader2, Beaker } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { calculateEconomicImpact, type EconomicContext } from "@/lib/economic-engine"
import { calculateMonthEndForecast, getMarginStatus } from "@/lib/math-engine"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import Link from "next/link"

export default function AtlasBurnDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  // Simulation Controls (Closed Loop)
  const [volatility, setVolatility] = useState(0.08);
  const [growthRate, setGrowthRate] = useState(0.05);

  // Fetch Organizational Baseline
  const orgRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'organizations', `org_${user.uid}`);
  }, [firestore, user]);
  const { data: organization, isLoading: orgLoading } = useDoc(orgRef);

  // Fetch Real Forensic Ingestion Stream
  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
  }, [firestore, user]);
  const { data: usageRecords, isLoading: usageLoading } = useCollection(usageQuery);

  const economicData = useMemo(() => {
    // Economic Root Values (Fallback for empty state)
    const revenue = organization?.monthlyRevenue || 15000;
    const capital = organization?.capitalReserves || 125000;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysElapsed = Math.max(1, Math.floor((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Aggregate real burn from Firestore records
    const currentBurn = usageRecords?.reduce((acc, rec) => {
      const recDate = new Date(rec.timestamp);
      return recDate >= startOfMonth ? acc + (rec.cost || 0) : acc;
    }, 0) || 0;

    const ctx: EconomicContext = {
      monthlyRevenue: revenue,
      capitalReserves: capital,
      currentMonthlyBurn: currentBurn,
      daysElapsed,
      totalDaysInMonth: 30
    };

    const impact = calculateEconomicImpact(ctx);
    
    // Probabilistic Forecast
    const forecasts = calculateMonthEndForecast(
      currentBurn,
      daysElapsed,
      30,
      'LINEAR',
      growthRate,
      capital,
      volatility
    );

    const marginStatus = getMarginStatus(forecasts.probabilityOfRunwayBreach, impact.grossMargin * 100);

    // Prepare Dynamic Chart Data
    const chartData = Array.from({ length: 4 }, (_, i) => {
      const week = i + 1;
      const weekBurn = usageRecords?.reduce((acc, rec) => {
        const recDate = new Date(rec.timestamp);
        const recWeek = Math.ceil(recDate.getDate() / 7);
        return recWeek === week ? acc + (rec.cost || 0) : acc;
      }, 0) || 0;

      return {
        name: `Week ${week}`,
        burn: weekBurn > 0 ? weekBurn : (week < Math.ceil(daysElapsed / 7) ? 0 : null),
        revenue: revenue / 4 // Weekly revenue slice
      };
    });

    return { impact, forecasts, marginStatus, revenue, capital, chartData, hasData: usageRecords && usageRecords.length > 0 };
  }, [usageRecords, organization, growthRate, volatility]);

  if (orgLoading || usageLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
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
            <h1 className="font-headline text-xl font-bold tracking-tighter">ATLAS BURN <span className="text-primary/50 text-xs font-mono ml-2">v2.0-CORE</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-headline font-bold">
                  <SlidersHorizontal size={14} /> Stress Scenarios
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold font-headline text-sm">Economic Scenario Injection</h4>
                  <p className="text-[10px] text-muted-foreground uppercase">Recalculating burn-to-revenue probability.</p>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span>Usage Growth Rate</span>
                      <span>{(growthRate * 100).toFixed(0)}%</span>
                    </div>
                    <Slider value={[growthRate * 100]} onValueChange={([v]) => setGrowthRate(v / 100)} max={50} step={1} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span>API Price Volatility</span>
                      <span>{(volatility * 100).toFixed(0)}%</span>
                    </div>
                    <Slider value={[volatility * 100]} onValueChange={([v]) => setVolatility(v / 100)} max={40} step={1} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${economicData.marginStatus.bg} ${economicData.marginStatus.color}`}>
              <Activity size={14} />
              {economicData.marginStatus.label}
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {!economicData.hasData ? (
            <Card className="p-12 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-6 bg-white/50">
              <div className="bg-primary/10 p-4 rounded-full text-primary">
                <Beaker size={48} />
              </div>
              <div className="space-y-2 max-w-md">
                <h2 className="text-2xl font-headline font-bold">Awaiting Forensic Ingestion</h2>
                <p className="text-muted-foreground">The dashboard is dynamic. It recalculates based on real API calls. Run a test to see the economic engine in action.</p>
              </div>
              <Button asChild size="lg" className="rounded-full px-8 font-headline font-bold">
                <Link href="/usage">Run Forensic Test</Link>
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gross Margin</span><Scale size={16} className="text-primary" /></div>
                  <div className={`text-3xl font-headline font-bold ${economicData.impact.grossMargin < 0.3 ? 'text-destructive' : 'text-primary'}`}>
                    {(economicData.impact.grossMargin * 100).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Revenue vs real token burn</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Survival Runway</span><Target size={16} className="text-accent" /></div>
                  <div className="text-3xl font-headline font-bold text-accent">
                    {economicData.impact.runwayMonths.toFixed(1)} <span className="text-lg font-normal opacity-70">Months</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">At current volatility: {volatility * 100}%</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monthly Revenue</span><Landmark size={16} className="text-primary" /></div>
                  <div className="text-3xl font-headline font-bold">${economicData.revenue.toLocaleString()}</div>
                  <p className="text-[10px] text-muted-foreground mt-2">Organization MRR</p>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Breach Risk</span><ShieldAlert size={16} className={economicData.forecasts.probabilityOfRunwayBreach > 0.2 ? 'text-destructive' : 'text-green-600'} /></div>
                  <div className={`text-3xl font-headline font-bold ${economicData.forecasts.probabilityOfRunwayBreach > 0.2 ? 'text-destructive' : 'text-green-600'}`}>
                    {(economicData.forecasts.probabilityOfRunwayBreach * 100).toFixed(0)}%
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">P90 Probabilistic Risk</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg font-headline">Economic Trajectory</CardTitle>
                    <CardDescription>Real Weekly Burn vs Revenue Baseline.</CardDescription>
                  </CardHeader>
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={economicData.chartData}>
                        <defs>
                          <linearGradient id="colorBurn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="burn" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorBurn)" strokeWidth={3} />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                
                <Card className="border-none shadow-sm bg-primary text-primary-foreground p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><Zap /> Optimization Insight</CardTitle>
                  </CardHeader>
                  <div className="space-y-6">
                    <div className="p-4 bg-white/10 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Burn/Revenue Ratio</p>
                      <p className="text-2xl font-headline font-bold">{(economicData.impact.burnToRevenueRatio * 100).toFixed(0)}%</p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed opacity-90 italic">
                        {economicData.impact.grossMargin < 0.5 
                          ? "Critical alert: Your token-to-revenue efficiency is low. Consider transitioning high-volume tasks to smaller, optimized models to protect runway."
                          : "Margin health is within safe operational parameters. Your current architecture is sustainable."
                        }
                      </p>
                      <Button variant="outline" className="w-full bg-white text-primary hover:bg-white/90 font-headline font-bold" asChild>
                        <Link href="/optimizer">Open Optimization Playbook</Link>
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
