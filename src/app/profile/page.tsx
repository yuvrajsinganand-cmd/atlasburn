"use client"

import { useState, useMemo, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { User, Wallet, Save, Loader2, Database, Activity, Server, ShieldCheck, Target, Zap, Key, ShieldAlert } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { calculateRunway, getMarginStatus, calculateMonthEndForecast } from "@/lib/math-engine"

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [budgetCap, setBudgetCap] = useState("10000");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const orgRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "organizations", `org_${user.uid}`);
  }, [firestore, user]);
  const { data: organization } = useDoc(orgRef);

  const subQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "users", user.uid, "aiSubscriptions"));
  }, [firestore, user]);
  const { data: subscriptions } = useCollection(subQuery);

  const engineMetrics = useMemo(() => {
    if (!subscriptions || !mounted) return null;
    
    const monthlyBurn = subscriptions.reduce((acc, sub) => acc + (sub.monthlyFixedCost || 0), 0);
    const dailyBurn = monthlyBurn / 30;
    const capital = organization?.capitalReserves || parseFloat(budgetCap) || 10000;
    
    const forecasts = calculateMonthEndForecast(
      monthlyBurn,
      15, // Snapshot mid-month
      30,
      0.05,
      capital,
      0.15 // Institutional base volatility
    );
    
    const runwayDays = calculateRunway(dailyBurn, capital);
    const marginInfo = getMarginStatus(forecasts.probabilityOfRunwayBreach, 50); 

    return {
      runwayMonths: (runwayDays / 30).toFixed(1),
      breachProb: (forecasts.probabilityOfRunwayBreach * 100).toFixed(0),
      status: marginInfo.label,
      statusColor: marginInfo.color,
      statusBg: marginInfo.bg,
    };
  }, [subscriptions, organization, budgetCap, mounted]);

  const handleSaveBudget = () => {
    if (!user || !firestore) return;
    setSaving(true);
    
    const orgRef = doc(firestore, "organizations", `org_${user.uid}`);
    
    setDocumentNonBlocking(orgRef, {
      capitalReserves: parseFloat(budgetCap) || 0,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    setTimeout(() => {
      setSaving(false);
      toast({ title: "Guardrails Updated", description: "Operational limits have been persisted." });
    }, 500);
  };

  if (isUserLoading || !mounted) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background/50">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight">Command Authority</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 text-[10px] font-bold py-1">
              <Server size={10} /> v3.1-QUANT
            </Badge>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Database size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Variance Engine</p>
                <p className="text-sm font-bold">Forensic</p>
              </div>
            </Card>
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-primary/10 text-primary rounded-lg"><Zap size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Decision Engine</p>
                <p className="text-sm font-bold">Active</p>
              </div>
            </Card>
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monte Carlo</p>
                <p className="text-sm font-bold">Simulation</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 border border-primary/10 shadow-inner">
                    <User size={40} className="text-primary/60" />
                  </div>
                  <CardTitle className="font-headline text-lg">{user?.displayName || "Lead Founder"}</CardTitle>
                  <CardDescription className="text-xs truncate px-4">{user?.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <Separator className="opacity-50" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-tight">Org Role</span>
                    <Badge className="bg-primary text-white border-none font-bold text-[10px]">OWNER</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-tight">Risk Authority</span>
                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 text-[10px]">
                      <ShieldCheck size={10} className="mr-1" /> VERIFIED
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80 flex items-center gap-2">
                    <Target size={14} /> Health Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase opacity-60 font-bold mb-1">Forecast Runway</p>
                      <p className="text-2xl font-headline font-bold">{engineMetrics?.runwayMonths || "0.0"} Mo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase opacity-60 font-bold mb-1">Breach Prob (P90)</p>
                      <p className="text-xl font-headline font-bold text-amber-300">{engineMetrics?.breachProb || "0"}%</p>
                    </div>
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase opacity-60 font-bold mb-1">Survival Status</p>
                      <p className={`text-sm font-bold ${engineMetrics?.statusColor || 'text-green-300'}`}>{engineMetrics?.status || 'STABLE'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline">
                    <Wallet className="text-primary" size={20} /> Capital Reserves
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Manage your institution's survival capital. These reserves are used by the Monte Carlo engine to calculate survival probability and VaR.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-1">
                    <div className="space-y-2">
                      <Label htmlFor="budget-cap" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Capital Reserves ($)</Label>
                      <Input id="budget-cap" type="number" value={budgetCap} onChange={(e) => setBudgetCap(e.target.value)} className="h-10 bg-muted/20" />
                    </div>
                  </div>
                  <Button onClick={handleSaveBudget} disabled={saving} className="w-full h-12 font-headline font-bold shadow-sm">
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                    Sync Capital Reserves
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-sm font-headline uppercase tracking-tight flex items-center gap-2">
                    <Key size={16} className="text-muted-foreground" /> Access Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Auth Method</p>
                      <p className="text-xs font-mono">{user?.providerData[0]?.providerId || "password"}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">QUANT-VERIFIED</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground px-2">
                    <ShieldAlert size={12} className="text-amber-500" />
                    <p>Security overrides require a 24-hour forensic verification window.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
