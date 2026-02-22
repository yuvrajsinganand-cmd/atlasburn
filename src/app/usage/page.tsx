
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Info, TrendingUp, Zap, MousePointer2, Loader2, Database, Play } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { toast } from "@/hooks/use-toast"

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
    if (!usageRecords) return [];
    return usageRecords.map(record => ({
      date: new Date(record.timestamp).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      tokens: (record.inputTokens || 0) + (record.outputTokens || 0),
      cost: record.cost || 0
    }));
  }, [usageRecords]);

  const handleSimulateCall = () => {
    if (!user || !firestore || !selectedSubId) return;
    setSimulating(true);
    
    const usageCol = collection(firestore, 'users', user.uid, 'aiSubscriptions', selectedSubId, 'apiUsageRecords');
    
    const input = Math.floor(Math.random() * 2000) + 500;
    const output = Math.floor(Math.random() * 1000) + 200;
    const cost = (input + output) * 0.00002;

    addDocumentNonBlocking(usageCol, {
      id: Math.random().toString(36).substring(7),
      aiSubscriptionId: selectedSubId,
      timestamp: new Date().toISOString(),
      apiCallType: 'chat_completion',
      inputTokens: input,
      outputTokens: output,
      cost: cost,
      latencyMs: Math.floor(Math.random() * 1200) + 300,
      userProfileId: user.uid
    });

    setTimeout(() => {
      setSimulating(false);
      toast({
        title: "API Call Simulated",
        description: `Logged ${input + output} tokens to Firestore.`,
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
            <h1 className="font-headline text-xl font-bold">Usage Intelligence</h1>
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
              Simulate Call
            </Button>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {!selectedSubId ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground space-y-4">
              <Database size={48} className="opacity-20" />
              <p className="text-lg">Select a subscription to view usage metrics.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-headline">API Traffic Heatmap</CardTitle>
                      <CardDescription>Token consumption for {currentSubName}</CardDescription>
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
                            <Area type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <TrendingUp size={16} /> Latest Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Tokens (Period)</span>
                          <span className="font-bold">{chartData.reduce((acc, curr) => acc + curr.tokens, 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Cost (Period)</span>
                          <span className="font-bold text-primary">${chartData.reduce((acc, curr) => acc + curr.cost, 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
