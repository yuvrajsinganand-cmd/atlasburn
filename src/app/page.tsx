
"use client"

import { useState, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ShieldAlert, BarChart3, Landmark, Activity, Target, SlidersHorizontal, Zap, Scale } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { calculateEconomicImpact, type EconomicContext } from "@/lib/economic-engine"
import { calculateMonthEndForecast, getMarginStatus } from "@/lib/math-engine"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

export default function AtlasBurnDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  // Simulation Controls (Closed Loop)
  const [volatility, setVolatility] = useState(0.08);
  const [growthRate, setGrowthRate] = useState(0.05);

  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
  }, [firestore, user]);

  const { data: usageRecords } = useCollection(usageQuery);

  const economicData = useMemo(() => {
    // These would normally come from the 'Organization' document
    const revenue = 15000;
    const capital = 125000;
    const daysElapsed = 14;
    
    // Aggregate real burn from ingested records
    const currentBurn = usageRecords?.reduce((acc, rec) => acc + (rec.cost || 0), 0) || 4200;

    const ctx: EconomicContext = {
      monthlyRevenue: revenue,
      capitalReserves: capital,
      currentMonthlyBurn: currentBurn,
      daysElapsed,
      totalDaysInMonth: 30
    };

    const impact = calculateEconomicImpact(ctx);
    
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

    return { impact, forecasts, marginStatus, revenue, capital };
  }, [usageRecords, growthRate, volatility]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 border-none shadow-sm bg-white">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gross Margin</span><Scale size={16} className="text-primary" /></div>
              <div className={`text-3xl font-headline font-bold ${economicData.impact.grossMargin < 0.3 ? 'text-destructive' : 'text-primary'}`}>
                {(economicData.impact.grossMargin * 100).toFixed(1)}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Revenue vs projected API burn</p>
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
              <p className="text-[10px] text-muted-foreground mt-2">Fixed MRR Baseline</p>
            </Card>
            <Card className="p-6 border-none shadow-sm bg-white">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Breach Risk</span><ShieldAlert size={16} className={economicData.forecasts.probabilityOfRunwayBreach > 0.2 ? 'text-destructive' : 'text-green-600'} /></div>
              <div className={`text-3xl font-headline font-bold ${economicData.forecasts.probabilityOfRunwayBreach > 0.2 ? 'text-destructive' : 'text-green-600'}`}>
                {(economicData.forecasts.probabilityOfRunwayBreach * 100).toFixed(0)}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Monte Carlo P90 Probability</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-headline">Economic Trajectory</CardTitle>
                <CardDescription>Probabilistic burn projection vs Revenue Baseline.</CardDescription>
              </CardHeader>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Week 1', burn: 2100, revenue: 15000 },
                    { name: 'Week 2', burn: 4200, revenue: 15000 },
                    { name: 'Week 3 (Est)', burn: 7100, revenue: 15000 },
                    { name: 'Week 4 (Est)', burn: 10400, revenue: 15000 },
                  ]}>
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
                <CardTitle className="text-lg font-headline flex items-center gap-2"><Zap /> Governance Insight</CardTitle>
              </CardHeader>
              <div className="space-y-6">
                <div className="p-4 bg-white/10 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Efficiency Delta</p>
                  <p className="text-2xl font-headline font-bold">{(economicData.impact.burnToRevenueRatio * 100).toFixed(0)}% <span className="text-xs font-normal opacity-70">Burn/Rev</span></p>
                </div>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed opacity-90 italic">
                    "Your current unit margin is {(economicData.impact.grossMargin * 100).toFixed(0)}%. To reach a healthy 70% SaaS margin, you must reduce token density by 42% or transition Pro users to GPT-4o-mini for summary tasks."
                  </p>
                  <Button className="w-full bg-white text-primary hover:bg-white/90 font-headline font-bold">
                    View Optimization Plan
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
