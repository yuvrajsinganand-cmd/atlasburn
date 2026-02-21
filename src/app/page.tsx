
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
import { TrendingUp, AlertTriangle, ArrowRight, Zap, ShieldAlert, BarChart3, Loader2, Cpu, Wallet, AlertCircle } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"

const COLORS = ['#673AB7', '#6F00FF', '#9C27B0', '#E1BEE7'];

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [step, setStep] = useState(0);

  // Form State for Onboarding
  const [spend, setSpend] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [usersCount, setUsersCount] = useState("");
  const [reqPerUser, setReqPerUser] = useState("");
  const [loading, setLoading] = useState(false);

  // Dashboard Data
  const subscriptionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'));
  }, [firestore, user]);

  const budgetQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'userBudgets'));
  }, [firestore, user]);

  const { data: subscriptions, isLoading: subsLoading } = useCollection(subscriptionsQuery);
  const { data: budgets } = useCollection(budgetQuery);

  const activeSubscriptions = subscriptions || [];
  const currentBudget = budgets?.[0] || { monthlyBudgetCap: 100, currentSpend: 0 };
  
  // Heuristic Calculations
  const metrics = useMemo(() => {
    const s = parseFloat(spend) || 0;
    const u = parseFloat(usersCount) || 1;
    const r = parseFloat(reqPerUser) || 1;
    
    const costPerUser = s / u;
    const costPerRequest = s / (u * r * 30);
    const growth2x = s * 2.4; // Weighted for inefficiency
    const growth3x = s * 4.2;
    const optimizedSpend = s * 0.55;
    const savings = s - optimizedSpend;

    return { costPerUser, costPerRequest, growth2x, growth3x, optimizedSpend, savings };
  }, [spend, usersCount, reqPerUser]);

  const handleStartAnalysis = () => setStep(1);
  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1500);
  };
  const handleSimulate = () => setStep(3);
  const handleUnlock = () => setStep(4);

  const finishOnboarding = () => {
    if (auth) initiateAnonymousSignIn(auth);
    setStep(5);
  };

  // If user is already logged in (not anonymous) or we've finished onboarding
  useEffect(() => {
    if (user && !user.isAnonymous) {
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

  // STEP 0: Positioning
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

  // STEP 1: Snapshot Form
  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-xl mx-auto w-full space-y-8">
        <div className="w-full space-y-2 text-center">
          <Badge className="bg-primary/10 text-primary border-none mb-2">Step 1 of 3</Badge>
          <h2 className="text-3xl font-headline font-bold">API Spend Snapshot</h2>
          <p className="text-muted-foreground">Quick data entry. No login required.</p>
        </div>
        <Card className="w-full border-none shadow-2xl p-2">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Current monthly API spend ($)</Label>
              <Input type="number" placeholder="e.g. 5000" value={spend} onChange={(e) => setSpend(e.target.value)} className="h-12 text-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Main Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
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
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt4">GPT-4o</SelectItem>
                    <SelectItem value="claude35">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="gpt35">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="llama3">Llama 3 (Self-hosted)</SelectItem>
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
            <Button onClick={handleAnalyze} disabled={loading || !spend} className="w-full h-14 text-lg font-headline font-bold bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Analyze My Spend"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 2: Risk Reveal
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-700">
        <div className="text-center space-y-4">
          <Badge className="bg-destructive/10 text-destructive border-none">High Risk Detected</Badge>
          <h2 className="text-4xl font-headline font-bold">
            At 2× growth, your monthly API bill becomes: <span className="text-destructive">${metrics.growth2x.toLocaleString()}</span>
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
                <span className="text-sm font-medium text-muted-foreground uppercase">GPT-4 Tier Upgrade</span>
                <span className="text-lg font-bold text-accent">+${(parseFloat(spend) * 1.5).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5 flex flex-col justify-center p-6 space-y-4 border-2">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle size={32} />
              <h3 className="text-xl font-bold font-headline uppercase leading-tight">Operating without safeguards</h3>
            </div>
            <p className="text-sm text-destructive font-medium leading-relaxed">
              Your current routing logic lacks cost-density optimization. Margin decay is projected to hit 18% in next quarter.
            </p>
          </Card>
        </div>

        <Button onClick={handleSimulate} size="lg" className="h-16 px-12 text-xl font-headline font-bold bg-accent hover:bg-accent/90 shadow-2xl rounded-2xl">
          Simulate Optimization
        </Button>
      </div>
    );
  }

  // STEP 3: Optimization Simulation
  if (step === 3) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-headline font-bold">Projected Leverage</h2>
          <p className="text-lg text-muted-foreground">“If we switch 40% of traffic to a lower-cost model with &lt;2% quality drop…”</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="p-6 bg-primary rounded-2xl text-primary-foreground space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">New Projected Cost</p>
            <p className="text-3xl font-headline font-bold">${metrics.optimizedSpend.toLocaleString()}</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border-none shadow-sm space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monthly Savings</p>
            <p className="text-3xl font-headline font-bold text-green-600">${metrics.savings.toLocaleString()}</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border-none shadow-sm space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Annual Impact</p>
            <p className="text-3xl font-headline font-bold text-green-600">${(metrics.savings * 12).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            { title: "Batch Potential", value: "High", desc: "65% of your reqs are non-streaming." },
            { title: "Caching Opportunity", value: "Detected", desc: "12% redundancy in prompt templates." },
            { title: "Cost Overkill", value: "Flagged", desc: "GPT-4 used for simple classification." }
          ].map((item, i) => (
            <div key={i} className="flex flex-col p-5 bg-secondary/50 rounded-xl border border-primary/10">
              <span className="text-[10px] font-bold uppercase text-primary tracking-widest mb-1">{item.title}</span>
              <span className="text-lg font-bold font-headline mb-1">{item.value}</span>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <Button onClick={handleUnlock} size="lg" className="h-16 px-12 text-xl font-headline font-bold bg-primary hover:bg-primary/90 shadow-2xl rounded-2xl">
          Get Full Audit Report
        </Button>
      </div>
    );
  }

  // STEP 4: Lock Value (Signup Gate)
  if (step === 4) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 max-w-md mx-auto w-full space-y-8 animate-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <BarChart3 size={32} />
          </div>
          <h2 className="text-2xl font-headline font-bold">Unlock Cost Report</h2>
          <p className="text-muted-foreground text-sm">Access your detailed breakdown, cost-per-feature map, and model switch simulator.</p>
        </div>

        <Card className="w-full border-none shadow-xl">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Company Email</Label>
              <Input placeholder="founder@yourcompany.com" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input placeholder="Acme AI" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Revenue Stage</Label>
              <Select defaultValue="seed">
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre">Pre-revenue</SelectItem>
                  <SelectItem value="seed">Seed ($10k-50k MRR)</SelectItem>
                  <SelectItem value="growth">Growth ($50k+ MRR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={finishOnboarding} className="w-full h-14 text-lg font-headline font-bold bg-accent hover:bg-accent/90">
              Unlock Full Cost Report
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 5: Founder Dashboard
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
          {/* Executive Summary Widgets */}
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
                  Budget: ${currentBudget.monthlyBudgetCap}
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
                  Across 3 vendors
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
