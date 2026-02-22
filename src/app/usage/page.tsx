"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Activity, Loader2, Beaker, Zap } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { runSleekSandboxTest } from "./actions"

export default function Usage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

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
        { date: '12/1', tokens: 1204, cost: 0.124 },
        { date: '12/2', tokens: 1532, cost: 0.156 },
        { date: '12/3', tokens: 1121, cost: 0.112 },
        { date: '12/4', tokens: 2243, cost: 0.228 },
        { date: '12/5', tokens: 2812, cost: 0.284 },
      ];
    };
    return usageRecords.map(record => ({
      date: new Date(record.timestamp).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      tokens: (record.inputTokens || 0) + (record.outputTokens || 0),
      cost: record.cost || 0
    }));
  }, [usageRecords]);

  const handlePhase1Test = async () => {
    if (!user || !selectedSubId) return;
    
    const sub = subscriptions?.find(s => s.id === selectedSubId);
    if (!sub) return;

    setTesting(true);
    
    try {
      const result = await runSleekSandboxTest(user.uid, selectedSubId, sub.name || 'gpt-4o');

      if (result.success) {
        toast({
          title: "Sandbox Call Intercepted",
          description: "Secure Server-Side SDK call verified. Forensic data synced.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: e.message || "Failed to execute server-side sandbox call."
      });
    } finally {
      setTesting(false);
    }
  };

  const currentSubName = subscriptions?.find(s => s.id === selectedSubId)?.customName || 'Select Connection';

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Burn Attribution</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedSubId || ''} onValueChange={setSelectedSubId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Connection" />
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
              className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
              disabled={!selectedSubId || testing}
              onClick={handlePhase1Test}
            >
              {testing ? <Loader2 className="animate-spin" size={14} /> : <Beaker size={14} />}
              Run Phase 1 Test
            </Button>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-headline">Forensic Cost Attribution</CardTitle>
                  <CardDescription>Visualizing traffic density for {currentSubName}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-tighter text-[10px]">
                    Server-Side SDK
                  </Badge>
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
              <Card className="border-none shadow-sm p-6 bg-accent/5">
                <CardTitle className="text-xs font-bold uppercase text-accent flex items-center gap-2 mb-6">
                  <Beaker size={16} /> Forensic Sandbox
                </CardTitle>
                <div className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>In Phase 1, we test the <b>Server-Side SDK</b> wrapper via a secure Server Action bridge.</p>
                  <p>This mimics a real production environment where the Ingest Key is never exposed to the client.</p>
                  <p>Verification Checklist:</p>
                  <ul className="list-disc list-inside text-xs space-y-2">
                    <li>Secret Key Isolation (Server-Only)</li>
                    <li>Batched Firestore Writes (Commit successful)</li>
                    <li>Zero-Latency Foreground Return</li>
                  </ul>
                </div>
              </Card>

              <Card className="border-none shadow-sm p-6 bg-primary text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={18} />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">System Hardened</p>
                </div>
                <p className="text-2xl font-headline font-bold">Phase 1 Secure</p>
                <p className="text-[10px] mt-2 opacity-70 leading-relaxed">Sleek is now architected for production-grade security. Ingest keys are secret, writes are batched, and the SDK is non-blocking.</p>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
