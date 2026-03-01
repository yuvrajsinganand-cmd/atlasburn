
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
import { collection, query, doc, limit } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { User, Wallet, Save, Loader2, Database, Activity, Server, ShieldCheck, Target, Zap, Key, ShieldAlert, TrendingUp, Flame } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { calculateRunway, getMarginStatus, calculateMonthEndForecast } from "@/lib/math-engine"
import { calculateUsageVariance } from "@/lib/variance-engine"
import { INSTITUTIONAL_DEFAULTS } from "@/lib/risk-config"

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [budgetCap, setBudgetCap] = useState("0"); 
  const [mrrInput, setMrrInput] = useState("0");
  const [fixedBurnInput, setFixedBurnInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hook declarations FIRST
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

  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      limit(100)
    );
  }, [firestore, user]);
  const { data: usageRecords } = useCollection(usageQuery);

  // Effects AFTER hook declarations
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (organization) {
      setBudgetCap((organization.capitalReserves || 0).toString());
      setMrrInput((organization.monthlyRevenue || 0).toString());
      setFixedBurnInput((organization.fixedMonthlyBurn || 0).toString());
    }
  }, [organization]);

  const engineMetrics = useMemo(() => {
    if (!mounted) return null;
    
    // Calculate composite baseline burn
    const fixedMonthlyBurn = subscriptions?.reduce((acc, sub) => acc + (sub.monthlyFixedCost || 0), 0) || 0;
    const variableBurnInfo = calculateUsageVariance(usageRecords || []);
    
    const varDailyMean = variableBurnInfo.status === 'READY' ? variableBurnInfo.result.dailyMean : 0;
    const varCV = variableBurnInfo.status === 'READY' ? variableBurnInfo.result.cv : INSTITUTIONAL_DEFAULTS.COEFFICIENT_OF_VARIATION;

    const compositeDailyMean = (fixedMonthlyBurn / 30) + varDailyMean;
    const capital = parseFloat(budgetCap) || 0;
    const revenue = parseFloat(mrrInput) || 0;
    const manualBurnFloor = parseFloat(fixedBurnInput) || 0;
    
    // Institutional Floor Applied to modeling
    const effectiveDailyMean = Math.max(compositeDailyMean, manualBurnFloor / 30);
    
    // Model month-end forecast
    const forecasts = calculateMonthEndForecast(
      effectiveDailyMean * 15, // Mid-month snapshot
      15, 
      30,
      INSTITUTIONAL_DEFAULTS.MONTHLY_GROWTH,
      capital,
      varCV
    );
    
    const netDailyBurn = effectiveDailyMean - (revenue / 30);
    const runwayDays = calculateRunway(netDailyBurn, capital);
    const projectedMonthlyBurn = effectiveDailyMean * 30;
    const currentMargin = revenue > 0 ? ((revenue - projectedMonthlyBurn) / revenue) * 100 : 0;
    
    const marginInfo = getMarginStatus(forecasts.probabilityOfRunwayBreach, currentMargin); 

    return {
      runwayMonths: capital === 0 && effectiveDailyMean > 0 ? "0.0" : (runwayDays > 3650 ? "Profitable" : (runwayDays / 30).toFixed(1)),
      breachProb: capital === 0 && effectiveDailyMean > 0 ? "100" : (forecasts.probabilityOfRunwayBreach * 100).toFixed(0),
      status: marginInfo.label,
      statusColor: marginInfo.color,
      statusBg: marginInfo.bg,
      baselineMonthly: projectedMonthlyBurn.toFixed(2)
    };
  }, [subscriptions, usageRecords, budgetCap, mrrInput, fixedBurnInput, mounted]);

  const handleSaveSettings = () => {
    if (!user || !firestore) return;
    setSaving(true);
    
    const orgRefToUpdate = doc(firestore, "organizations", `org_${user.uid}`);
    
    setDocumentNonBlocking(orgRefToUpdate, {
      capitalReserves: parseFloat(budgetCap) || 0,
      monthlyRevenue: parseFloat(mrrInput) || 0,
      fixedMonthlyBurn: parseFloat(fixedBurnInput) || 0,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    setTimeout(() => {
      setSaving(false);
      toast({ title: "Economic Guardrails Synced", description: "Institutional parameters updated in control plane." });
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
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Command Authority</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 text-[10px] font-bold py-1">
              <Server size={10} /> v3.2-BLOOMBERG
            </Badge>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Database size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Composite Baseline</p>
                <p className="text-sm font-bold">${engineMetrics?.baselineMonthly || "0.00"}/mo</p>
              </div>
            </Card>
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-primary/10 text-primary rounded-lg"><Zap size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Risk Monitoring</p>
                <p className="text-sm font-bold">Active</p>
              </div>
            </Card>
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Engine Status</p>
                <p className="text-sm font-bold">Forensic Loop</p>
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
                  <CardTitle className="font-headline text-lg">{user?.displayName || "Forensic User"}</CardTitle>
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
                      <p className="text-2xl font-headline font-bold">{engineMetrics?.runwayMonths === "Profitable" ? "∞" : `${engineMetrics?.runwayMonths || "0.0"} Mo`}</p>
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
                    <Wallet className="text-primary" size={20} /> Economic Parameters
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Adjust your deterministic financial context. These values drive the survival engine.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="budget-cap" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Capital Reserves ($)</Label>
                      <Input id="budget-cap" type="number" value={budgetCap} onChange={(e) => setBudgetCap(e.target.value)} className="h-10 bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mrr-input" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Monthly Revenue (MRR) ($)</Label>
                      <Input id="mrr-input" type="number" value={mrrInput} onChange={(e) => setMrrInput(e.target.value)} className="h-10 bg-muted/20" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="fixed-burn" className="text-[10px] font-bold uppercase text-primary tracking-widest flex items-center gap-2">
                        <Flame size={12} /> Institutional Burn Baseline ($)
                      </Label>
                      <Input id="fixed-burn" type="number" value={fixedBurnInput} onChange={(e) => setFixedBurnInput(e.target.value)} className="h-10 bg-primary/5 border-primary/20" />
                      <p className="text-[10px] text-muted-foreground">Manual override for modeling risk at a specific operational scale.</p>
                    </div>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-primary">
                      <TrendingUp size={12} /> Economic Impact
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Adjusting your Capital and MRR act as the "Economic Offset" for your forensic burn. Higher reserves significantly reduce Breach Probability across all horizons.
                    </p>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={saving} className="w-full h-12 font-headline font-bold shadow-sm">
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                    Sync Economic Context
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-sm font-headline uppercase tracking-tight flex items-center gap-2">
                    <Key size={16} className="text-muted-foreground" /> Access Authority
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Verification Method</p>
                      <p className="text-xs font-mono">{user?.providerData[0]?.providerId || "password"}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">SECURE</Badge>
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
