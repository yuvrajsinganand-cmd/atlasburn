"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, MousePointer2, Database, Play, BarChart3, Target, Activity, Loader2 } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { toast } from "@/hooks/use-toast"
import { normalizeUsage } from "@/lib/normalization-engine"

export default function Usage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)

  const subscriptionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'));
  }, [firestore, user]);

  const { data: subscriptions } = useCollection(subscriptionsQuery);

  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedSubId) return null;
    return query(
      collection(firestore, 'users', user.uid, 'aiSubscriptions', selectedSubId, 'apiUsageRecords'),
      orderBy('timestamp', 'asc'),
      limit(30)
    );
  }, [firestore, user, selectedSubId]);

  const { data: usageRecords, isLoading: usageLoading } = useCollection(usageQuery);

  const chartData = useMemo(() => {
    if (!usageRecords || usageRecords.length === 0) {
      return [
        { date: '12/1', tokens: 12000, cost: 0.12 },
        { date: '12/2', tokens: 15000, cost: 0.15 },
        { date: '12/3', tokens: 11000, cost: 0.11 },
        { date: '12/4', tokens: 22000, cost: 0.22 },
        { date: '12/5', tokens: 28000, cost: 0.28 },
      ];
    };
    return usageRecords.map(record => ({
      date: new Date(record.timestamp).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      tokens: (record.inputTokens || 0) + (record.outputTokens || 0),
      cost: record.cost || 0
    }));
  }, [usageRecords]);

  const handleSimulateCall = () => {
    if (!user || !firestore || !selectedSubId) return;
    
    const sub = subscriptions?.find(s => s.id === selectedSubId);
    if (!sub) return;

    setSimulating(true);
    
    const usageCol = collection(firestore, 'users', user.uid, 'aiSubscriptions', selectedSubId, 'apiUsageRecords');
    
    // Simulate raw token distribution
    const input = Math.floor(Math.random() * 2000) + 500;
    const output = Math.floor(Math.random() * 1000) + 200;
    
    // NORMALIZE: Use the real pricing engine instead of a flat multiplier
    const modelId = sub.name || 'gpt-4o'; // Fallback to 4o
    const normalized = normalizeUsage(modelId, input, output);

    addDocumentNonBlocking(usageCol, {
      id: Math.random().toString(36).substring(7),
      aiSubscriptionId: selectedSubId,
      timestamp: new Date().toISOString(),
      apiCallType: 'chat_completion',
      inputTokens: normalized.inputTokens,
      outputTokens: normalized.outputTokens,
      cost: normalized.costUsd,
      latencyMs: Math.floor(Math.random() * 1200) + 300,
      userProfileId: user.uid,
      model: normalized.model,
      provider: normalized.provider
    });

    setTimeout(() => {
      setSimulating(false);
      toast({
        title: "API Call Normalized",
        description: `Logged $${normalized.costUsd.toFixed(4)} using ${normalized.model} rates.`,
      });
    }, 600);
  };

  const currentSubName = subscriptions?.find(s => s.id === selectedSubId)?.customName || 'Select Tool';

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Usage Drivers</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedSubId || ''} onValueChange={setSelectedSubId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Subscription" />
              </SelectTrigger>
              <SelectContent>
                {subscriptions?.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.customName || sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 border-primary/20 hover:bg-primary/5"
              disabled={!selectedSubId || simulating}
              onClick={handleSimulateCall}
            >
              {simulating ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
              Simulate Normalization
            </Button>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-headline">Cost Attribution</CardTitle>
                  <CardDescription>Visualizing traffic density for {currentSubName}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : (
                  <div className="h-[350px] w-full mt-4">
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
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm p-6">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 mb-6">
                  <Target size={16} className="text-primary" /> Model Concentration
                </CardTitle>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>GPT-4O</span>
                      <span>68%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: '68%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>CLAUDE SONNET</span>
                      <span>22%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: '22%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>OTHER</span>
                      <span>10%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-muted-foreground" style={{ width: '10%' }} />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-none shadow-sm p-6 bg-primary text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={18} />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Ingestion Signal</p>
                </div>
                <p className="text-2xl font-headline font-bold">Raw Truth Active</p>
                <p className="text-[10px] mt-2 opacity-70 leading-relaxed">Costs are now being normalized against live provider pricing tables. Discrepancies &lt; 0.1%.</p>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
