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
import { TrendingUp, AlertTriangle, ArrowRight, Zap, ShieldAlert, BarChart3, Loader2, Cpu, Wallet, ShieldCheck, Mail, Lock } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { initiateGoogleSignIn, initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login"
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "o1-preview", value: "o1-preview" },
    { label: "o1-mini", value: "o1-mini" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
  ],
  anthropic: [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
    { label: "Claude 3.5 Sonnet v2", value: "claude-3-5-sonnet-v2" },
    { label: "Claude 4.6 (Preview)", value: "claude-4-6" },
    { label: "Claude 4.5 (Beta)", value: "claude-4-5" },
    { label: "Claude 3 Opus", value: "claude-3-opus" },
    { label: "Claude 3 Haiku", value: "claude-3-haiku" },
  ],
  azure: [
    { label: "Azure GPT-4o", value: "azure-gpt-4o" },
    { label: "Azure GPT-4", value: "azure-gpt-4" },
    { label: "Azure GPT-3.5", value: "azure-gpt-35" },
  ],
  mixed: [
    { label: "GPT-4o + Claude 3.5", value: "mixed-high" },
    { label: "GPT-3.5 + Haiku", value: "mixed-low" },
    { label: "Multi-Model Router", value: "router" },
  ]
};

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  // Steps: 0: Welcome, 1: Snapshot, 2: Risk, 3: Optimization, 4: Lock/Signup, 5: Dashboard
  const [step, setStep] = useState(0);

  // Form State for Onboarding
  const [spend, setSpend] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [usersCount, setUsersCount] = useState("");
  const [reqPerUser, setReqPerUser] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [revenueStage, setRevenueStage] = useState("seed");

  // Dashboard Data (Only active in step 5)
  const subscriptionsQuery = useMemoFirebase(() => {
    if (!firestore || !user || step < 5) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'));
  }, [firestore, user, step]);

  const budgetQuery = useMemoFirebase(() => {
    if (!firestore || !user || step < 5) return null;
    return query(collection(firestore, 'users', user.uid, 'userBudgets'));
  }, [firestore, user, step]);

  const { data: subscriptions } = useCollection(subscriptionsQuery);
  const { data: budgets } = useCollection(budgetQuery);

  const activeSubscriptions = subscriptions || [];
  const currentBudget = budgets?.[0] || { monthlyBudgetCap: 0, currentSpend: 0 };
  
  // Heuristic Calculations
  const metrics = useMemo(() => {
    const s = parseFloat(spend) || 0;
    const u = parseFloat(usersCount) || 1;
    const r = parseFloat(reqPerUser) || 1;
    
    const costPerUser = s / u;
    const growth2x = s * 2.4; 
    const optimizedSpend = s * 0.55;
    const savings = s - optimizedSpend;

    return { costPerUser, growth2x, optimizedSpend, savings };
  }, [spend, usersCount, reqPerUser]);

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

  // Persistence Logic
  const saveDataToFirestore = (uid: string) => {
    if (!firestore) return;

    // Create a budget record
    const budgetRef = doc(firestore, 'users', uid, 'userBudgets', 'onboarding');
    setDocumentNonBlocking(budgetRef, {
      userProfileId: uid,
      monthYear: new Date().toISOString().substring(0, 7),
      monthlyBudgetCap: parseFloat(spend) * 1.5,
      alertThresholdPercentage: 80,
      currentSpend: parseFloat(spend),
      lastUpdatedAt: new Date().toISOString(),
    }, { merge: true });

    // Create a subscription record
    const subRef = collection(firestore, 'users', uid, 'aiSubscriptions');
    addDocumentNonBlocking(subRef, {
      userProfileId: uid,
      name: model,
      customName: `${companyName || 'Main'} ${model}`,
      providerName: provider,
      subscriptionType: 'API Key',
      monthlyFixedCost: parseFloat(spend),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleGoogleSignup = () => {
    if (!auth) return;
    initiateGoogleSignIn(auth);
  };

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    initiateEmailSignUp(auth, email, password);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    initiateEmailSignIn(auth, email, password);
  };

  useEffect(() => {
    // If a user becomes authenticated and we are on the lock step, save data and go to dashboard
    if (user && step === 4) {
      saveDataToFirestore(user.uid);
      setStep(5);
    }
  }, [user, step]);

  useEffect(() => {
    // If user is already logged in, skip onboarding if they visit root
    if (user && !user.isAnonymous && step < 5) {
      setStep(5);
    }
  }, [user]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Step 0: POSITIONING
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

  // Step 1: SNAPSHOT
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
                    <SelectItem value="mixed">Mixed Providers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Most Used Model</Label>
                <Select value={model} onValueChange={setModel} disabled={!provider}>
                  <SelectTrigger className="h-12"><SelectValue placeholder={provider ? "Select Model" : "Select Provider First"} /></SelectTrigger>
                  <SelectContent>
                    {provider && PROVIDER_MODELS[provider]?.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Active Users</Label>
                <Input type="number" placeholder="500" value={usersCount} onChange={(e) => setUsersCount(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Avg. Req/User/Day</Label>
                <Input type="number" placeholder="20" value={reqPerUser} onChange={(e) => setReqPerUser(e.target.value)} className="h-12" />
              </div>
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !spend || !provider || !model} className="w-full h-14 text-lg font-headline font-bold bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Analyze My Spend"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: RISK REVEAL
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
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground uppercase">Cost per active user</span>
                <span className="text-2xl font-bold font-headline">${metrics.costPerUser.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground uppercase">Retention growth impact</span>
                <span className="text-lg font-bold text-accent">+${(metrics.growth2x * 0.2).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground uppercase">Margin Decay Projected</span>
                <span className="text-lg font-bold text-destructive">18.4%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5 flex flex-col justify-center p-6 space-y-4 border-2">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle size={32} />
              <h3 className="text-xl font-bold font-headline uppercase leading-tight">Safety Breach</h3>
            </div>
            <p className="text-sm text-destructive font-medium leading-relaxed">
              Your current routing logic lacks cost-density optimization. No circuit breakers detected in logic flow.
            </p>
          </Card>
        </div>

        <Button onClick={handleSimulate} size="lg" className="h-16 px-12 text-xl font-headline font-bold bg-accent hover:bg-accent/90 shadow-2xl rounded-2xl">
          Simulate Optimization
        </Button>
      </div>
    );
  }

  // Step 3: OPTIMIZATION
  if (step === 3) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-4xl mx-auto w-full space-y-8 animate-in zoom-in-95 duration-700">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-headline font-bold">Projected Leverage</h2>
          <p className="text-lg text-muted-foreground">“If we switch 40% of traffic to a lower-cost model with &lt;2% quality drop…”</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="p-6 bg-primary rounded-2xl text-primary-foreground space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Target Monthly Spend</p>
            <p className="text-3xl font-headline font-bold">${metrics.optimizedSpend.toLocaleString()}</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border-none shadow-sm space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monthly Savings</p>
            <p className="text-3xl font-headline font-bold text-green-600">${metrics.savings.toLocaleString()}</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border-none shadow-sm space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Annual Margin Impact</p>
            <p className="text-3xl font-headline font-bold text-green-600">${(metrics.savings * 12).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {[
            { title: "Batch Potential", value: "High", desc: "Detected 65% non-streaming reqs." },
            { title: "Caching Gap", value: "Critical", desc: "12% redundant prompt overlap." },
            { title: "Routing Overkill", value: "Flagged", desc: "High-tier used for classification." }
          ].map((item, i) => (
            <div key={i} className="flex flex-col p-5 bg-secondary/50 rounded-xl border border-primary/10">
              <span className="text-[10px] font-bold uppercase text-primary tracking-widest mb-1">{item.title}</span>
              <span className="text-lg font-bold font-headline mb-1">{item.value}</span>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <Button onClick={handleGoToLock} size="lg" className="h-16 px-12 text-xl font-headline font-bold bg-primary hover:bg-primary/90 shadow-2xl rounded-2xl">
          Get Full Audit Report
        </Button>
      </div>
    );
  }

  // Step 4: LOCK / SIGNUP REQUIRED
  if (step === 4) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 max-w-md mx-auto w-full space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg mb-2">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl font-headline font-bold">Unlock Cost Report</h2>
          <p className="text-muted-foreground text-sm px-4">Create your account to access the detailed breakdown, cost-per-feature map, and model switch simulator.</p>
        </div>

        <Card className="w-full border-none shadow-2xl">
          <CardHeader className="pb-0">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Company Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme AI" className="h-11" />
              </div>
              <div className="grid gap-2">
                <Label>Revenue Stage</Label>
                <Select value={revenueStage} onValueChange={setRevenueStage}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre">Pre-revenue</SelectItem>
                    <SelectItem value="seed">Seed ($10k-$50k MRR)</SelectItem>
                    <SelectItem value="growth">Growth ($50k+ MRR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="signup">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="login">Login</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleEmailSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="founder@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full h-12 font-headline font-bold">Unlock Audit Report</Button>
                </form>
              </TabsContent>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full h-12 font-headline font-bold">Sign In & Unlock</Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-card px-2 text-muted-foreground">Quick Access</span></div>
            </div>

            <Button variant="outline" className="w-full h-12 gap-2" onClick={handleGoogleSignup}>
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.28z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 5: FOUNDER DASHBOARD
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background/50">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Sleek Intelligence</h1>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1 border-primary/20 bg-primary/5 text-primary">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Live Monitoring
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Risk Index</CardTitle>
                <ShieldAlert size={16} className="text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold text-destructive">68/100</div>
                <div className="w-full bg-destructive/10 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-destructive h-full" style={{ width: '68%' }} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Opt. Score</CardTitle>
                <Zap size={16} className="text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold text-primary">42%</div>
                <div className="w-full bg-primary/10 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '42%' }} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monthly Burn</CardTitle>
                <Wallet size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold">${currentBudget.currentSpend.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Budget: ${currentBudget.monthlyBudgetCap.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Models</CardTitle>
                <Cpu size={16} className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold">{activeSubscriptions.length}</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Across {new Set(activeSubscriptions.map(s => s.providerName)).size} vendors
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Margin Forecast (3 Mo)</CardTitle>
                <CardDescription>Projected API costs vs baseline at current growth rate.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Month 1', cost: currentBudget.currentSpend, risk: currentBudget.currentSpend * 1.1 },
                      { name: 'Month 2', cost: currentBudget.currentSpend * 1.3, risk: currentBudget.currentSpend * 1.5 },
                      { name: 'Month 3', cost: currentBudget.currentSpend * 1.6, risk: currentBudget.currentSpend * 2.2 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(103, 58, 183, 0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="cost" fill="#673AB7" radius={[4, 4, 0, 0]} name="Baseline" />
                      <Bar dataKey="risk" fill="#EF4444" radius={[4, 4, 0, 0]} name="Inefficiency Risk" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Model Switch Suggestions</CardTitle>
                <CardDescription>Highest ROI switches detected.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { from: 'GPT-4o', to: 'Claude 3.5 Sonnet', saving: '$420/mo', quality: '99%' },
                  { from: 'Claude 3 Opus', to: 'GPT-4o mini', saving: '$1,200/mo', quality: '94%' },
                  { from: 'GPT-4', to: 'Llama 3 70B', saving: '$2,800/mo', quality: '92%' },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-secondary/30 rounded-lg flex justify-between items-center group cursor-pointer hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{item.from} → {item.to}</p>
                      <p className="text-xs font-medium">Quality Match: <span className="font-bold">{item.quality}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">Save {item.saving}</p>
                      <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
