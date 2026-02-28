
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Activity, Loader2, Beaker, Zap, BarChart3, PieChart } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { runSleekSandboxTest } from "./actions"

export default function Usage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [testing, setTesting] = useState(false)

  // Fetch Forensic Ledger
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
    if (!usageRecords || usageRecords.length === 0) return [];
    
    // Group by Day
    const grouped = usageRecords.reduce((acc: any, rec) => {
      const date = new Date(rec.timestamp).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      if (!acc[date]) acc[date] = { date, cost: 0, tokens: 0 };
      acc[date].cost += rec.cost || 0;
      acc[date].tokens += (rec.inputTokens || 0) + (rec.outputTokens || 0);
      return acc;
    }, {});

    return Object.values(grouped);
  }, [usageRecords]);

  const modelDistribution = useMemo(() => {
    if (!usageRecords || usageRecords.length === 0) return [];
    const dist = usageRecords.reduce((acc: any, rec) => {
      const model = rec.model || 'Unknown';
      acc[model] = (acc[model] || 0) + (rec.cost || 0);
      return acc;
    }, {});
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [usageRecords]);

  const handlePhase1Test = async () => {
    if (!user) return;
    setTesting(true);
    try {
      const result = await runSleekSandboxTest(user.uid, 'manual-test', 'gpt-4o');
      if (result.success) {
        toast({ title: "Sandbox Call Intercepted", description: "Secure Server-Side SDK call verified. Forensic data synced." });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Test Failed", description: e.message || "Failed to execute server-side sandbox call." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight">Burn Attribution</h1>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
            disabled={testing}
            onClick={handlePhase1Test}
          >
            {testing ? <Loader2 className="animate-spin" size={14} /> : <Beaker size={14} />}
            Inject Forensic Test
          </Button>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-headline">Forensic Time-Series</CardTitle>
                  <CardDescription>Visualizing unit burn density across the ingestion window.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-tighter text-[10px]">
                  Real-Time SDK
                </Badge>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <div className="h-[350px] flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                ) : chartData.length > 0 ? (
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
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-4">
                    <BarChart3 size={48} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground italic">Awaiting forensic ingestion stream...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm p-6 bg-white">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                    <PieChart size={16} /> Model Distribution
                  </CardTitle>
                </CardHeader>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelDistribution} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border-none shadow-sm p-6 bg-primary text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={18} />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Attribution Core</p>
                </div>
                <p className="text-2xl font-headline font-bold">Closed-Loop Active</p>
                <p className="text-[10px] mt-2 opacity-70 leading-relaxed">Every point on this chart represents an authenticated SDK event. Replay protection and server-side verification are active.</p>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
