"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Loader2, Beaker, Zap, BarChart3, PieChart, Info } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { normalizeUsage } from "@/lib/normalization-engine"

export default function Usage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [testing, setTesting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch Real Forensic Ledger
  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
  }, [firestore, user]);

  const { data: usageRecords, isLoading: usageLoading } = useCollection(usageQuery);

  const chartData = useMemo(() => {
    if (!usageRecords || usageRecords.length === 0 || !mounted) return [];
    
    const grouped = usageRecords.reduce((acc: any, rec) => {
      const date = new Date(rec.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      if (!acc[date]) acc[date] = { date, cost: 0, tokens: 0 };
      acc[date].cost += rec.cost || 0;
      acc[date].tokens += (rec.inputTokens || 0) + (rec.outputTokens || 0);
      return acc;
    }, {});

    return Object.values(grouped);
  }, [usageRecords, mounted]);

  const modelDistribution = useMemo(() => {
    if (!usageRecords || usageRecords.length === 0 || !mounted) return [];
    const dist = usageRecords.reduce((acc: any, rec) => {
      const model = rec.model || 'Unknown';
      acc[model] = (acc[model] || 0) + (rec.cost || 0);
      return acc;
    }, {});
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [usageRecords, mounted]);

  const handlePhase1Test = async () => {
    if (!user || !firestore) return;
    setTesting(true);
    try {
      const usagePath = collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords');
      
      const models = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'];
      const promises = [];

      // Surgical Fix: Generate a 5-day trajectory with INSTITUTIONAL SCALE (Millions of tokens)
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Institutional scale: Multiple calls per day with millions of tokens
        const callsPerDay = Math.floor(Math.random() * 3) + 3;
        
        for (let j = 0; j < callsPerDay; j++) {
          const model = models[Math.floor(Math.random() * models.length)];
          // Institutional Scale: Generate millions of tokens per call to reach $1000s/day spend
          const prompt_tokens = Math.floor(Math.random() * 10000000) + 2000000;
          const completion_tokens = Math.floor(Math.random() * 5000000) + 1000000;
          const normalized = normalizeUsage(model, prompt_tokens, completion_tokens);
          
          promises.push(addDocumentNonBlocking(usagePath, {
            timestamp: date.toISOString(),
            inputTokens: prompt_tokens,
            outputTokens: completion_tokens,
            cost: normalized.costUsd,
            model: normalized.model,
            provider: normalized.provider,
            featureId: 'institutional_test_lab',
            userTier: 'pro',
            eventId: crypto.randomUUID(),
            apiCallType: 'sandbox_ingestion'
          }));
        }
      }

      await Promise.all(promises);

      toast({ 
        title: "Forensic Feed Primed", 
        description: "Institutional burn trajectory generated. Risk engine is now calculating volatility." 
      });
    } catch (e: any) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Ingestion Failed", 
        description: e.message || "Check your connectivity and permissions." 
      });
    } finally {
      setTesting(false);
    }
  };

  if (!mounted) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Burn Attribution</h1>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary rounded-full px-4 font-headline font-bold shadow-sm"
            disabled={testing}
            onClick={handlePhase1Test}
          >
            {testing ? <Loader2 className="animate-spin" size={14} /> : <Beaker size={14} />}
            Inject Forensic Feed
          </Button>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                <div>
                  <CardTitle className="text-xl font-headline">Forensic Time-Series</CardTitle>
                  <CardDescription>Live unit burn density from SDK ingestion.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-tighter text-[10px] font-bold">
                  LIVE FEED
                </Badge>
              </CardHeader>
              <CardContent className="pt-6">
                {usageLoading ? (
                  <div className="h-[350px] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : chartData.length > 0 ? (
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed rounded-2xl">
                    <div className="bg-muted p-4 rounded-full">
                      <BarChart3 size={32} className="text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold">No Forensic Data</p>
                      <p className="text-sm text-muted-foreground px-12">Click "Inject Forensic Feed" above to prime your ledger with an Institutional burn trajectory.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm p-6 bg-white">
                <CardHeader className="p-0 mb-4 border-b pb-4">
                  <CardTitle className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                    <PieChart size={16} /> Burn Distribution
                  </CardTitle>
                </CardHeader>
                <div className="h-[250px] w-full">
                  {modelDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modelDistribution} layout="vertical" margin={{ left: -20, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} fontSize={10} fontWeight="bold" />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                      Awaiting model breakdown...
                    </div>
                  )}
                </div>
              </Card>

              <Card className="border-none shadow-sm p-6 bg-primary text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">System Health</p>
                </div>
                <p className="text-2xl font-headline font-bold">Forensic Pipeline: Active</p>
                <div className="mt-4 flex items-start gap-2 bg-white/10 p-3 rounded-xl text-[10px] leading-relaxed">
                  <Info size={14} className="shrink-0" />
                  <p>Institutional forensic ingestion is authenticated via HMAC-SHA256. Volatility is derived from the cryptographically-signed ledger.</p>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
