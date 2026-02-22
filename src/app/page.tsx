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
import { TrendingUp, AlertTriangle, ArrowRight, Zap, ShieldAlert, BarChart3, Cpu, Wallet, ShieldCheck, Mail, Lock, Landmark, Activity, Target, Shield } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { initiateGoogleSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { calculateRunway, calculateUnitEconomics } from "@/lib/math-engine"

const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "o1-preview", value: "o1-preview" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
  ],
  anthropic: [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
    { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku" },
    { label: "Claude 3 Opus", value: "claude-3-opus" },
    { label: "Claude 3 Haiku", value: "claude-3-haiku" },
    { label: "Claude 4.5 Preview", value: "claude-4-5" },
    { label: "Claude 4.6 Preview", value: "claude-4-6" },
  ],
  azure: [
    { label: "Azure GPT-4o", value: "azure-gpt-4o" },
  ]
};

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [step, setStep] = useState<number | null>(null);

  // Form State
  const [spend, setSpend] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [usersCount, setUsersCount] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

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

  const metrics = useMemo(() => {
    const s = parseFloat(spend) || 5000;
    const u = parseFloat(usersCount) || 500;
    const runway = calculateRunway(s / 30, s * 5, 1.05);
    const unitEcon = calculateUnitEconomics(s, u * 20, 0.5);
    const dailyBurn = s / 30;
    const forecastBill = s * 1.15; // Simulated growth

    let marginStatus = { label: "SAFE", color: "text-green-600", bg: "bg-green-100", icon: ShieldCheck };
    if (unitEcon.margin < 30) {
      marginStatus = { label: "RISK", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle };
    } else if (unitEcon.margin < 50) {
      marginStatus = { label: "WATCH", color: "text-amber-600", bg: "bg-amber-100", icon: ShieldAlert };
    }

    return { 
      costPerUser: s / u, 
      growth2x: s * 2.4, 
      optimizedSpend: s * 0.55, 
      savings: s - (s * 0.55),
      runway,
      margin: unitEcon.margin,
      dailyBurn,
      forecastBill,
      marginStatus
    };
  }, [spend, usersCount]);

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
      apiBudgetUsd: parseFloat(spend) * 2 || 10000,
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

    // Seed initial subscription from onboarding data
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
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Positioning
  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-8 max-w-2xl mx-auto">
        <div className="bg-primary p-4 rounded-3xl text-primary-foreground shadow-2xl mb-4">
          <ShieldAlert size={48} />
        </div>
        <h1 className="text-5xl md:text-6xl font-headline font-bold tracking-tight text-foreground">
          Your API Spend <br /> Control Center.
        </h1>
        <p className="text-xl text-muted-foreground font-medium">
          Detect model waste. Forecast cost spikes. Protect margins.
        </p>
        <Button size="lg" onClick={handleStartAnalysis} className="h-16 px-10 text-xl font-headline font-bold bg-accent hover:bg-accent/90 shadow-xl rounded-2xl group">
          Start Cost Analysis <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    );
  }

  // Snapshot
  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        <div className="w-full space-y-2 text-center">
          <Badge className="bg-primary/10 text-primary border-none mb-2 uppercase tracking-widest text-[10px] font-bold">Step 1 — Forensic Audit</Badge>
          <h2 className="text-3xl font-headline font-bold">API Spend Snapshot</h2>
          <p className="text-muted-foreground">Quick entry for real-time risk calculation.</p>
        </div>
        <Card className="w-full border-none shadow-2xl">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Current monthly API spend ($)</Label>
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
                    <SelectItem value="azure">Azure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Most Used Model</Label>
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
              <Label>Monthly Active Users</Label>
              <Input type="number" placeholder="500" value={usersCount} onChange={(e) => setUsersCount(e.target.value)} className="h-12" />
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !spend || !provider || !model} className="w-full h-14 text-lg font-headline font-bold bg-primary">
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Analyze My Spend"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Risk Reveal
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-3xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-4">
          <Badge className="bg-destructive/10 text-destructive border-none uppercase tracking-widest text-[10px] font-bold">Risk Assessment — Critical</Badge>
          <h2 className="text-4xl font-headline font-bold leading-tight">
            At 2× growth, your monthly API bill becomes: <br />
            <span className="text-destructive font-bold text-5xl md:text-6xl">${metrics.growth2x.toLocaleString()}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Card className="p-6 space-y-4 border-none shadow-sm">
            <div className="flex justify-between items-center"><span className="text-sm font-medium text-muted-foreground">COST PER USER</span><span className="text-2xl font-bold font-headline">${metrics.costPerUser.toFixed(2)}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm font-medium text-muted-foreground">MARGIN BUFFER</span><span className="text-lg font-bold text-green-600">{metrics.margin.toFixed(0)}%</span></div>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5 p-6 space-y-4 border-2">
            <div className="flex items-center gap-3 text-destructive"><AlertTriangle size={32} /><h3 className="text-xl font-bold font-headline uppercase">Safety Breach</h3></div>
            <p className="text-sm text-destructive font-medium">Your current routing logic lacks cost-density optimization. No circuit breakers detected.</p>
          </Card>
        </div>
        <Button onClick={handleSimulate} size="lg" className="h-16 px-12 text-xl font-headline font-bold bg-accent">Simulate Optimization</Button>
      </div>
    );
  }

  // Optimization
  if (step === 3) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-4xl mx-auto w-full space-y-8 animate-in zoom-in-95 duration-700">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-headline font-bold">Projected Leverage</h2>
          <p className="text-lg text-muted-foreground">“If we switch 40% of traffic to a lower-cost model with &lt;2% quality drop…”</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-center">
          <Card className="p-6 bg-primary text-primary-foreground"><p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Target Spend</p><p className="text-3xl font-headline font-bold">${metrics.optimizedSpend.toLocaleString()}</p></Card>
          <Card className="p-6"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monthly Savings</p><p className="text-3xl font-headline font-bold text-green-600">${metrics.savings.toLocaleString()}</p></Card>
          <Card className="p-6"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Annual Impact</p><p className="text-3xl font-headline font-bold text-green-600">${(metrics.savings * 12).toLocaleString()}</p></Card>
        </div>
        <Button onClick={handleGoToLock} size="lg" className="h-16 px-12 text-xl font-headline font-bold bg-primary">Get Full Audit Report</Button>
      </div>
    );
  }

  // Lock / Signup
  if (step === 4) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 max-w-md mx-auto w-full space-y-8 animate-in fade-in">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg mb-2"><Lock size={32} /></div>
          <h2 className="text-3xl font-headline font-bold">Unlock Cost Report</h2>
          <p className="text-muted-foreground text-sm">Create your organization account to access the detailed forensic map.</p>
        </div>
        <Card className="w-full border-none shadow-2xl p-6 space-y-6">
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2"><Label>Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Founder Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full h-12 font-headline font-bold bg-primary">Unlock Audit Report</Button>
          </form>
          <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-card px-2">Quick Access</span></div></div>
          <Button variant="outline" className="w-full h-12 gap-2" onClick={() => auth && initiateGoogleSignIn(auth)}>Google Login</Button>
        </Card>
      </div>
    );
  }

  // Step 5: Dashboard
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background/50">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2"><SidebarTrigger className="-ml-1" /><h1 className="font-headline text-xl font-bold">Sleek Dashboard</h1></div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${metrics.marginStatus.bg} ${metrics.marginStatus.color}`}>
              <metrics.marginStatus.icon size={14} />
              MARGIN {metrics.marginStatus.label}
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 border-none shadow-sm">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Daily Burn</span><Landmark size={16} className="text-primary" /></div>
              <div className="text-3xl font-headline font-bold text-primary">${metrics.dailyBurn.toFixed(2)}</div>
              <p className="text-[10px] text-muted-foreground mt-2">Current 30-day average</p>
            </Card>
            <Card className="p-6 border-none shadow-sm">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MTD Forecast</span><TrendingUp size={16} className="text-accent" /></div>
              <div className="text-3xl font-headline font-bold text-accent">${metrics.forecastBill.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-2">Projected month-end bill</p>
            </Card>
            <Card className="p-6 border-none shadow-sm">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Runway Impact</span><Target size={16} className="text-primary" /></div>
              <div className="text-3xl font-headline font-bold">{metrics.runway} <span className="text-lg font-normal opacity-70">Days</span></div>
              <p className="text-[10px] text-muted-foreground mt-2">Assuming current cash buffer</p>
            </Card>
            <Card className="p-6 border-none shadow-sm">
              <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unit Margin</span><Activity size={16} className="text-green-600" /></div>
              <div className="text-3xl font-headline font-bold text-green-600">{metrics.margin.toFixed(0)}%</div>
              <p className="text-[10px] text-muted-foreground mt-2">Gross buffer per token</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
              <CardHeader className="px-0 pt-0"><CardTitle className="text-lg font-headline">Spend Normalization</CardTitle><CardDescription>Forecasting trajectory for next 90 days.</CardDescription></CardHeader>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Oct', cost: 12000 }, { name: 'Nov', cost: 15500 }, { name: 'Dec', cost: 22000 }]}>
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
                <CardTitle className="text-lg font-headline">Top Cost Drivers</CardTitle>
                <CardDescription>Highest impact segments identified.</CardDescription>
              </CardHeader>
              <div className="space-y-4 mt-4">
                {[
                  { title: "GPT-4o Production", share: "42%", cost: "$2,100" },
                  { title: "Retry Loops", share: "18%", cost: "$900" },
                  { title: "Feature: Summarize", share: "12%", cost: "$600" },
                  { title: "Batch Jobs", share: "9%", cost: "$450" }
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-secondary/30 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.share} total share</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.cost}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function Loader2({ className }: { className?: string }) {
  return <TrendingUp className={`animate-pulse ${className}`} />
}
