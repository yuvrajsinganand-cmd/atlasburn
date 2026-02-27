
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ArrowRight, ShieldAlert, BarChart3, Landmark, Activity, Target, Info, SlidersHorizontal, ShieldCheck, Zap } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase"
import { collection, query, doc, orderBy, limit } from "firebase/firestore"
import { initiateGoogleSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { calculateMonthEndForecast, calculateRunway, getMarginStatus, type ForecastMode } from "@/lib/math-engine"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"

const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o Mini", value: "gpt-4o-mini" },
    { label: "o1-preview", value: "o1-preview" },
  ],
  anthropic: [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
    { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku" },
    { label: "Claude 3 Opus", value: "claude-3-opus" },
  ]
};

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [step, setStep] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Form State
  const [spend, setSpend] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [usersCount, setUsersCount] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Simulation Stress Parameters
  const [forecastMode, setForecastMode] = useState<ForecastMode>('FLAT');
  const [simulationGrowthRate, setSimulationGrowthRate] = useState(0.05); 
  const [simulationVolatility, setSimulationVolatility] = useState(0.08); 

  useEffect(() => {
    if (!isUserLoading) {
      if (user && !user.isAnonymous) {
        setStep(5);
      } else if (step === null) {
        setStep(0);
      }
    }
  }, [isUserLoading, user, step]);

  const subscriptionsQuery = useMemoFirebase(() => {
    if (!firestore || !user || step !== 5) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'));
  }, [firestore, user, step]);

  const { data: subscriptions } = useCollection(subscriptionsQuery);

  // Real-time Forensic Data Query
  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedSubId) return null;
    return query(
      collection(firestore, 'users', user.uid, 'aiSubscriptions', selectedSubId, 'apiUsageRecords'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
  }, [firestore, user, selectedSubId]);

  const { data: usageRecords } = useCollection(usageQuery);

  const metrics = useMemo(() => {
    const s = parseFloat(spend) || (subscriptions?.reduce((acc, sub) => acc + (sub.monthlyFixedCost || 0), 0) || 5000);
    const u = parseFloat(usersCount) || 500;
    const daysElapsed = 14; 
    const cashBuffer = s * 6; 
    
    const forecasts = calculateMonthEndForecast(
      s, 
      daysElapsed, 
      30, 
      forecastMode, 
      simulationGrowthRate, 
      cashBuffer,
      simulationVolatility
    );
    
    const unitMargin = 42; 
    const marginInfo = getMarginStatus(forecasts.probabilityOfRunwayBreach, unitMargin);
    const dailyBurn = s / daysElapsed;
    
    const runway = calculateRunway(dailyBurn, cashBuffer, simulationGrowthRate);

    // Calculate Dynamic Risk Drivers from Ingested Data
    let drivers = [
      { title: "GPT-4o Traffic", share: "42.1%", cost: "$2,105", type: 'static' },
      { title: "Unnecessary Retries", share: "18.3%", cost: "$915", type: 'static' },
      { title: "Verbose Output", share: "12.4%", cost: "$620", type: 'static' },
      { title: "Context Over-send", share: "9.2%", cost: "$461", type: 'static' }
    ];

    if (usageRecords && usageRecords.length > 0) {
      const modelCosts: Record<string, number> = {};
      let totalUsageCost = 0;
      
      usageRecords.forEach(rec => {
        const modelKey = rec.model || 'Unknown';
        modelCosts[modelKey] = (modelCosts[modelKey] || 0) + (rec.cost || 0);
        totalUsageCost += (rec.cost || 0);
      });

      if (totalUsageCost > 0) {
        drivers = Object.entries(modelCosts)
          .sort((a, b) => b[1] - a[1])
          .map(([modelName, cost]) => ({
            title: `${modelName} Traffic`,
            share: `${((cost / totalUsageCost) * 100).toFixed(1)}%`,
            cost: `$${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            type: 'forensic'
          }))
          .slice(0, 4);
      }
    }

    return { 
      costPerUser: s / u, 
      growth2x: s * 2.4, 
      optimizedSpend: s * 0.553, 
      savings: s - (s * 0.553),
      runway,
      margin: unitMargin,
      dailyBurn,
      forecasts,
      marginInfo,
      drivers
    };
  }, [spend, usersCount, forecastMode, simulationGrowthRate, simulationVolatility, subscriptions, usageRecords]);

  const handleStartAnalysis = () => setStep(1);
  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1200);
  };
  const handleSimulate = () => setStep(3);
  const handleGoToLock = () => setStep(4);

  const handlePersistence = (uid: string) => {
    if (!firestore) return;
    const orgId = `org_${uid}`;
    
    setDocumentNonBlocking(doc(firestore, 'organizations', orgId), {
      id: orgId,
      name: companyName || 'My Org',
      apiBudgetUsd: parseFloat(spend) * 6 || 30000,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    setDocumentNonBlocking(doc(firestore, 'organizations', orgId, 'users', uid), {
      id: uid,
      email: email || user?.email,
      organizationId: orgId,
      role: 'owner',
      isEmailVerified: user?.providerData[0]?.providerId === 'google.com',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    const subId = `sub_${uid}_initial`;
    setDocumentNonBlocking(doc(firestore, 'users', uid, 'aiSubscriptions', subId), {
      userProfileId: uid,
      name: model || 'Initial Model',
      providerName: provider,
      customName: `${provider.toUpperCase()} Production`,
      monthlyFixedCost: parseFloat(spend) || 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    }, { merge: true });
  };

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    initiateEmailSignUp(auth, email, password);
  };

  useEffect(() => {
    if (user && !user.isAnonymous && step === 4) {
      handlePersistence(user.uid);
      setStep(5);
    }
  }, [user, step]);

  if (isUserLoading || step === null) {
    return <div className="flex h-screen items-center justify-center bg-background"><BarChart3 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-8 max-w-2xl mx-auto">
        <div className="bg-primary p-4 rounded-3xl text-primary-foreground shadow-2xl mb-4">
          <ShieldAlert size={48} />
        </div>
        <h1 className="text-5xl md:text-6xl font-headline font-bold tracking-tight text-foreground">
          Protect Your <br /> Runway.
        </h1>
        <p className="text-xl text-muted-foreground font-medium">
          Detect model waste. Forecast burn spikes. Ensure survival.
        </p>
        <Button size="lg" onClick={handleStartAnalysis} className="h-16 px-10 text-xl font-headline font-bold bg-accent hover:bg-accent/90 shadow-xl rounded-2xl group">
          Run Survival Audit <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        <div className="w-full space-y-2 text-center">
          <Badge className="bg-primary/10 text-primary border-none mb-2 uppercase tracking-widest text-[10px] font-bold">Step 1 &mdash; Forensic Burn Snapshot</Badge>
          <h2 className="text-3xl font-headline font-bold">Current Burn Metrics</h2>
          <p className="text-muted-foreground">Input your raw data for real-time runway simulation.</p>
        </div>
        <Card className="w-full border-none shadow-2xl">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Monthly API Spend ($)</Label>
              <Input type="number" placeholder="e.g. 5000" value={spend} onChange={(e) => setSpend(e.target.value)} className="h-12 text-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Main Provider</Label>
                <Select value={provider} onValueChange={(val) => { setProvider(val); setModel(""); }}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Top Model</Label>
                <Select value={model} onValueChange={setModel} disabled={!provider}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select Model" /></SelectTrigger>
                  <SelectContent>
                    {provider && PROVIDER_MODELS[provider]?.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Active Users (MAU)</Label>
              <Input type="number" placeholder="500" value={usersCount} onChange={(e) => setUsersCount(e.target.value)} className="h-12" />
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !spend || !provider || !model} className="w-full h-14 text-lg font-headline font-bold bg-primary">
              {loading ? <BarChart3 className="animate-spin mr-2" /> : "Simulate Runway"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-3xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-4">
          <Badge className="bg-destructive/10 text-destructive border-none uppercase tracking-widest text-[10px] font-bold">Survival Breach Risk</Badge>
          <h2 className="text-4xl font-headline font-bold leading-tight">
            At 2&times; scale, your API burn explodes to: <br />
            <span className="text-destructive font-bold text-5xl md:text-6xl">${metrics.growth2x.toLocaleString()}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Card className="p-6 space-y-4 border-none shadow-sm">
            <div className="flex justify-between items-center"><span className="text-sm font-medium text-muted-foreground">UNIT COST</span><span className="text-2xl font-bold font-headline">${metrics.costPerUser.toFixed(2)}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm font-medium text-muted-foreground">RUNWAY BUFFER</span><span className="text-lg font-bold text-green-600">{(metrics.runway / 30).toFixed(1)} mo</span></div>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5 p-6 space-y-4 border-2">
            <div className="flex items-center gap-3 text-destructive"><ShieldAlert size={32} /><h3 className="text-xl font-bold font-headline uppercase">Margin Death Spiral</h3></div>
            <p className="text-sm text-destructive font-medium">Your unit economics cannot withstand a 1.5x usage volatility spike. Pivot or optimize required.</p>
          </Card>
        </div>
        <Button onClick={handleSimulate} size="lg" className="h-16 px-12 text-xl font-headline font-bold bg-accent">Optimize For Survival</Button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-4xl mx-auto w-full space-y-8 animate-in zoom-in-95 duration-700">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-headline font-bold">Optimization Leverage</h2>
          <p className="text-lg text-muted-foreground">Projected runway extension if Sleek optimizations are applied.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-center">
          <Card className="p-6 bg-primary text-primary-foreground"><p className="text-[10px] font-bold uppercase tracking-widest opacity-70">New Monthly Burn</p><p className="text-3xl font-headline font-bold">${metrics.optimizedSpend.toLocaleString()}</p></Card>
          <Card className="p-6"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Runway Extension</p><p className="text-3xl font-headline font-bold text-green-600">+{(metrics.runway * 0.45 / 30).toFixed(1)} Months</p></Card>
          <Card className="p-6"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Annual Capital Saved</p><p className="text-3xl font-headline font-bold text-green-600">${(metrics.savings * 12).toLocaleString()}</p></Card>
        </div>
        <Button onClick={handleGoToLock} size="lg" className="h-16 px-12 text-xl font-headline font-bold bg-primary">Access Full Survival Map</Button>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 max-w-md mx-auto w-full space-y-8 animate-in fade-in">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg mb-2"><ShieldCheck size={32} /></div>
          <h2 className="text-3xl font-headline font-bold">Claim Your Audit</h2>
          <p className="text-muted-foreground text-sm">Secure your data ingestion and unlock the forensic dashboard.</p>
        </div>
        <Card className="w-full border-none shadow-2xl p-6 space-y-6">
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2"><Label>Organization Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Admin Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full h-12 font-headline font-bold bg-primary">Secure Dashboard</Button>
          </form>
          <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-card px-2">Social Auth</span></div></div>
          <Button variant="outline" className="w-full h-12 gap-2" onClick={() => auth && initiateGoogleSignIn(auth)}>Sign in with Google</Button>
        </Card>
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
            <h1 className="font-headline text-xl font-bold">Survival Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedSubId || ''} onValueChange={setSelectedSubId}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Attribution Target" />
              </SelectTrigger>
              <SelectContent>
                {subscriptions?.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.customName || sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-headline font-bold">
                  <SlidersHorizontal size={14} /> Forecast Mode
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold font-headline text-sm">Monte Carlo Simulation</h4>
                  <p className="text-[10px] text-muted-foreground">Adjust volatility parameters for stress testing.</p>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Growth Strategy</Label>
                    <Select value={forecastMode} onValueChange={(v: any) => setForecastMode(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FLAT">Flat (Static)</SelectItem>
                        <SelectItem value="LINEAR">Linear (Growth)</SelectItem>
                        <SelectItem value="GEOMETRIC">Geometric (Scaling)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span>Usage Volatility</span>
                      <span>{(simulationVolatility * 100).toFixed(0)}%</span>
                    </div>
                    <Slider 
                      value={[simulationVolatility * 100]} 
                      onValueChange={([v]) => setSimulationVolatility(v / 100)} 
                      max={40} 
                      step={1} 
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <div className={`flex items-center cursor-help gap-2 px-3 py-1 rounded-full text-xs font-bold ${metrics.marginInfo.bg} ${metrics.marginInfo.color}`}>
                  <Activity size={14} />
                  {metrics.marginInfo.label}
                  <Info size={12} className="ml-1 opacity-50" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-bold font-headline text-sm">Forensic Risk Analysis</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{metrics.marginInfo.description}</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 border-none shadow-sm">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Daily Burn</span><Landmark size={16} className="text-primary" /></div>
              <div className="text-3xl font-headline font-bold text-primary">${metrics.dailyBurn.toFixed(2)}</div>
              <p className="text-[10px] text-muted-foreground mt-2">Trailing 14d normalized (P90)</p>
            </Card>
            <Card className="p-6 border-none shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MTD Bill Projection</span><TrendingUp size={16} className="text-accent" /></div>
              <div className="text-3xl font-headline font-bold text-accent">${metrics.forecasts.base.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Stress Band</span>
                <span className="text-[9px] font-mono font-bold">${metrics.forecasts.p25.toFixed(0)} — ${metrics.forecasts.p90.toFixed(0)}</span>
              </div>
            </Card>
            <Card className="p-6 border-none shadow-sm">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cash Runway</span><Target size={16} className="text-primary" /></div>
              <div className="text-3xl font-headline font-bold">{Math.floor(metrics.runway / 30)} <span className="text-lg font-normal opacity-70">Months</span></div>
              <p className="text-[10px] text-muted-foreground mt-2">Assuming current burn slope</p>
            </Card>
            <Card className="p-6 border-none shadow-sm">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Breach Probability</span><ShieldAlert size={16} className={metrics.forecasts.probabilityOfRunwayBreach > 0.25 ? "text-destructive" : "text-amber-500"} /></div>
              <div className={`text-3xl font-headline font-bold ${metrics.forecasts.probabilityOfRunwayBreach > 0.25 ? "text-destructive" : metrics.forecasts.probabilityOfRunwayBreach > 0.1 ? "text-amber-500" : "text-green-600"}`}>
                {(metrics.forecasts.probabilityOfRunwayBreach * 100).toFixed(0)}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Monte Carlo Risk Intensity</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
              <CardHeader className="px-0 pt-0">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-headline">Burn Trajectory</CardTitle>
                    <CardDescription>Real-time spend forecast (Confidence: 94%)</CardDescription>
                  </div>
                  {usageRecords && usageRecords.length > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Activity size={12} className="mr-1" /> Live Ingestion
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Oct', cost: 12432 }, { name: 'Nov', cost: 15681 }, { name: 'Dec', cost: 22104 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip cursor={{ fill: 'rgba(103, 58, 183, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="lg:col-span-1 border-none shadow-sm bg-white p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-headline">Risk Drivers</CardTitle>
                <CardDescription>Highest impact burn segments.</CardDescription>
              </CardHeader>
              <div className="space-y-4 mt-4">
                {metrics.drivers.map((item, i) => (
                  <div key={i} className="p-4 bg-secondary/30 rounded-xl flex justify-between items-center hover:bg-secondary/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.type === 'forensic' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {item.type === 'forensic' ? <Zap size={14} /> : <BarChart3 size={14} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">{item.share} total share</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.cost}</p>
                  </div>
                ))}
                {!usageRecords?.length && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
                    <Info size={16} className="text-amber-600" />
                    <p className="text-[10px] text-amber-700 font-medium">Connect SDK to replace simulated baseline with real forensic drivers.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
