
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  ShieldAlert, 
  Zap, 
  Settings2, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Loader2, 
  Info,
  Flame,
  Clock,
  LayoutGrid,
  ShieldCheck,
  Power,
  ChevronRight
} from "lucide-react"
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from "@/firebase"
import { doc, collection, query, orderBy, limit } from "firebase/firestore"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { toast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function GuardrailsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resuming, setResuming] = useState(false)

  // Local state for form
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<"alert" | "soft_stop" | "hard_stop">("alert")
  const [dailyBudget, setDailyBudget] = useState("100")
  const [hourlyBudget, setHourlyBudget] = useState("25")
  const [retryRisk, setRetryRisk] = useState("0.1")
  const [loopRisk, setLoopRisk] = useState("0.05")

  useEffect(() => {
    setMounted(true)
  }, [])

  const configRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "organizations", `org_${user.uid}`, "guardrailConfig");
  }, [firestore, user]);

  const { data: config, isLoading: loadingConfig } = useDoc(configRef);

  const breachesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "organizations", `org_${user.uid}`, "breaches"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
  }, [firestore, user]);

  const { data: breaches, isLoading: loadingBreaches } = useCollection(breachesQuery);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled || false)
      setMode(config.mode || "alert")
      setDailyBudget(config.dailyBudgetUsd?.toString() || "100")
      setHourlyBudget(config.hourlyBudgetUsd?.toString() || "25")
      setRetryRisk(config.maxRetryCascadeRisk?.toString() || "0.1")
      setLoopRisk(config.maxLoopRiskScore?.toString() || "0.05")
    }
  }, [config]);

  const handleSave = () => {
    if (!configRef || !user) return;
    setSaving(true);

    setDocumentNonBlocking(configRef, {
      enabled,
      mode,
      dailyBudgetUsd: parseFloat(dailyBudget) || 0,
      hourlyBudgetUsd: parseFloat(hourlyBudget) || 0,
      maxRetryCascadeRisk: parseFloat(retryRisk) || 0,
      maxLoopRiskScore: parseFloat(loopRisk) || 0,
      updatedAt: new Date().toISOString(),
      // Reset status to active when updating if not already suspended
      status: config?.status === 'suspended' ? 'suspended' : 'active'
    }, { merge: true });

    // Log action to audit ledger
    const auditRef = collection(firestore, "organizations", `org_${user.uid}`, "auditLogs");
    addDocumentNonBlocking(auditRef, {
      timestamp: new Date().toISOString(),
      actorEmail: user.email,
      action: "GUARDRAIL_CONFIG_UPDATED",
      category: "security",
      details: `Mode set to ${mode}. Daily: $${dailyBudget}.`,
      status: "success",
      userAgent: navigator.userAgent
    });

    setTimeout(() => {
      setSaving(false);
      toast({ title: "Guardrail Policy Synced", description: "Operational safety parameters are now live." });
    }, 600);
  };

  const handleResume = () => {
    if (!configRef || !user) return;
    setResuming(true);

    setDocumentNonBlocking(configRef, {
      status: 'active',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const auditRef = collection(firestore, "organizations", `org_${user.uid}`, "auditLogs");
    addDocumentNonBlocking(auditRef, {
      timestamp: new Date().toISOString(),
      actorEmail: user.email,
      action: "PROJECT_MANUALLY_RESUMED",
      category: "security",
      details: "Manual override triggered to resume AI requests.",
      status: "success"
    });

    setTimeout(() => {
      setResuming(false);
      toast({ title: "System Resumed", description: "All AI ingestion channels are now active." });
    }, 600);
  };

  if (!mounted) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Safety Guardrails</h1>
          </div>
          <div className="flex items-center gap-3">
            {config?.status === 'suspended' && (
              <Badge className="bg-destructive text-white border-none gap-1 px-3 py-1 animate-pulse uppercase text-[10px] font-bold">
                <ShieldAlert size={12} /> System Suspended
              </Badge>
            )}
            {config?.status === 'throttled' && (
              <Badge className="bg-amber-500 text-white border-none gap-1 px-3 py-1 uppercase text-[10px] font-bold">
                <AlertTriangle size={12} /> Throttled
              </Badge>
            )}
            {config?.status === 'active' && config.enabled && (
              <Badge className="bg-green-600 text-white border-none gap-1 px-3 py-1 uppercase text-[10px] font-bold">
                <ShieldCheck size={12} /> Guardrail Active
              </Badge>
            )}
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                      <Settings2 size={18} className="text-primary" /> Auto Kill Protocol
                    </CardTitle>
                    <CardDescription>Configure deterministic safety triggers to prevent capital leakage.</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-full border border-primary/10">
                    <Label htmlFor="master-switch" className="text-[10px] font-bold uppercase text-primary">Protection</Label>
                    <Switch id="master-switch" checked={enabled} onCheckedChange={setEnabled} />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Zap size={14} className="text-primary" /> Enforcement Mode
                    </Label>
                    <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Label
                        htmlFor="mode-alert"
                        className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 bg-popover hover:bg-muted/50 cursor-pointer transition-all ${mode === 'alert' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                      >
                        <RadioGroupItem value="alert" id="mode-alert" className="sr-only" />
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-bold border-primary/20 text-primary">OBSERVE</Badge>
                          <span className="font-bold text-sm">Alert Only</span>
                          <p className="text-[10px] text-center text-muted-foreground leading-tight">Logs breaches but allows requests to continue.</p>
                        </div>
                      </Label>
                      <Label
                        htmlFor="mode-soft"
                        className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 bg-popover hover:bg-muted/50 cursor-pointer transition-all ${mode === 'soft_stop' ? 'border-amber-500 bg-amber-50' : 'border-muted'}`}
                      >
                        <RadioGroupItem value="soft_stop" id="mode-soft" className="sr-only" />
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-bold border-amber-500/20 text-amber-600">THROTTLE</Badge>
                          <span className="font-bold text-sm">Soft Stop</span>
                          <p className="text-[10px] text-center text-muted-foreground leading-tight">Rejects high-risk requests based on telemetry.</p>
                        </div>
                      </Label>
                      <Label
                        htmlFor="mode-hard"
                        className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 bg-popover hover:bg-muted/50 cursor-pointer transition-all ${mode === 'hard_stop' ? 'border-destructive bg-destructive/5' : 'border-muted'}`}
                      >
                        <RadioGroupItem value="hard_stop" id="mode-hard" className="sr-only" />
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-bold border-destructive/20 text-destructive">AUTO-KILL</Badge>
                          <span className="font-bold text-sm">Hard Stop</span>
                          <p className="text-[10px] text-center text-muted-foreground leading-tight">Immediately blocks all requests for the project.</p>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                          <span>Daily Budget Breach ($)</span>
                          <TooltipProvider><Tooltip><TooltipTrigger><Info size={12} /></TooltipTrigger><TooltipContent>Total project cost over the last 24 hours.</TooltipContent></Tooltip></TooltipProvider>
                        </Label>
                        <Input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className="bg-muted/20 font-mono" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                          <span>Hourly Spike Limit ($)</span>
                          <TooltipProvider><Tooltip><TooltipTrigger><Info size={12} /></TooltipTrigger><TooltipContent>Maximum allowed spend in any rolling 60-minute window.</TooltipContent></Tooltip></TooltipProvider>
                        </Label>
                        <Input type="number" value={hourlyBudget} onChange={(e) => setHourlyBudget(e.target.value)} className="bg-muted/20 font-mono" />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                          <span>Max Retry Cascade Risk</span>
                          <TooltipProvider><Tooltip><TooltipTrigger><Info size={12} /></TooltipTrigger><TooltipContent>Threshold for repetitive agent retry behavior (0.0 to 1.0).</TooltipContent></Tooltip></TooltipProvider>
                        </Label>
                        <Input type="number" step="0.01" value={retryRisk} onChange={(e) => setRetryRisk(e.target.value)} className="bg-muted/20 font-mono" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                          <span>Max Loop Risk Score</span>
                          <TooltipProvider><Tooltip><TooltipTrigger><Info size={12} /></TooltipTrigger><TooltipContent>Forensic probability of an infinite agent loop (0.0 to 1.0).</TooltipContent></Tooltip></TooltipProvider>
                        </Label>
                        <Input type="number" step="0.01" value={loopRisk} onChange={(e) => setLoopRisk(e.target.value)} className="bg-muted/20 font-mono" />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-headline font-bold shadow-xl">
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" size={18} />}
                    Sync Safety Policy
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-muted/20 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-headline flex items-center gap-2">
                      <History size={16} className="text-primary" /> Deterministic Breach Ledger
                    </CardTitle>
                    <CardDescription className="text-[10px]">Audit trail of all safety threshold violations.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/5 uppercase text-[9px] font-bold tracking-widest text-muted-foreground">
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Observed</TableHead>
                        <TableHead>Limit</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingBreaches && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
                      )}
                      {breaches?.map((breach) => (
                        <TableRow key={breach.id} className="text-[11px]">
                          <TableCell className="font-mono text-muted-foreground">{new Date(breach.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase text-[8px] font-bold py-0 h-4 border-destructive/20 text-destructive bg-destructive/5">
                              {breach.triggerType?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold">
                            {breach.triggerType?.includes('budget') || breach.triggerType?.includes('spike') ? `$${breach.observedValue.toFixed(2)}` : `${(breach.observedValue * 100).toFixed(1)}%`}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {breach.triggerType?.includes('budget') || breach.triggerType?.includes('spike') ? `$${breach.thresholdValue}` : `${(breach.thresholdValue * 100).toFixed(1)}%`}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-zinc-950 text-white border-none text-[8px] uppercase font-bold">{breach.actionTaken}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loadingBreaches && breaches?.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No safety violations detected.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-sm bg-zinc-950 text-zinc-50 overflow-hidden">
                <CardHeader className="bg-primary/20 border-b border-primary/10">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Power size={14} /> System Authority
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-zinc-500">Current Ingestion State</p>
                    <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${config?.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                        <span className="font-bold uppercase tracking-tight">{config?.status || 'active'}</span>
                      </div>
                      {config?.status !== 'active' && (
                        <Button 
                          onClick={handleResume} 
                          disabled={resuming} 
                          size="sm" 
                          variant="outline" 
                          className="h-8 bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white font-bold text-[10px]"
                        >
                          {resuming ? <Loader2 className="animate-spin h-3 w-3" /> : <RotateCcw className="mr-1 h-3 w-3" />}
                          RESUME SDK
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-2 text-primary">
                      <ShieldCheck size={16} />
                      <p className="text-xs font-bold uppercase">Safety Policy Active</p>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                      "Manual Resume" will override all active budget blocks and restore telemetry flow immediately. Use with caution during identified spikes.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Flame size={14} className="text-destructive" /> Real-time Exposure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold uppercase opacity-70">Daily Limit Used</span>
                      <span className="font-mono font-bold">42.5%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: '42.5%' }} />
                    </div>
                  </div>
                  <div className="p-4 bg-muted/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-muted-foreground" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Rolling Hourly Risk</span>
                    </div>
                    <p className="text-2xl font-headline font-bold">$12.40 <span className="text-[10px] font-normal opacity-50">/ $25.00</span></p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
