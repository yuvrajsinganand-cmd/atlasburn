
"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, History, Zap, Plus, Trash2, Loader2, AlertTriangle, BarChart4, CheckCircle2, TrendingDown, Clock, ShieldAlert } from "lucide-react"
import { detectModelQualityDegradation, type DetectModelQualityDegradationOutput } from "@/ai/flows/detect-model-quality-degradation"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore } from "@/firebase"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { collection } from "firebase/firestore"

interface DriftOutput extends DetectModelQualityDegradationOutput {
  driftScore: number;
  severity: "LOW" | "MODERATE" | "CRITICAL";
  deltaFromBaseline: number;
  timestamp: string;
}

export default function QualityMonitor() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [historicalOutputs, setHistoricalOutputs] = useState<string[]>([""])
  const [currentOutput, setCurrentOutput] = useState("")
  const [criteria, setCriteria] = useState("coherence, factual accuracy, tone consistency")
  const [threshold, setThreshold] = useState(5)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DriftOutput | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const addHistorical = () => setHistoricalOutputs([...historicalOutputs, ""])
  const updateHistorical = (index: number, val: string) => {
    const newArr = [...historicalOutputs]
    newArr[index] = val
    setHistoricalOutputs(newArr)
  }
  const removeHistorical = (index: number) => {
    if (historicalOutputs.length <= 1) return
    setHistoricalOutputs(historicalOutputs.filter((_, i) => i !== index))
  }

  const initiateAudit = async () => {
    const filteredHistorical = historicalOutputs.filter(o => o.trim() !== "")
    if (filteredHistorical.length === 0 || !currentOutput) {
      toast({ variant: "destructive", title: "Forensic Insufficiency", description: "Provide production baseline and current output." })
      return
    }

    setLoading(true)
    try {
      const res = await detectModelQualityDegradation({
        historicalOutputs: filteredHistorical,
        currentOutput,
        qualityCriteria: criteria,
        degradationThresholdPercent: threshold
      })

      const enhanced: DriftOutput = {
        ...res,
        driftScore: (res.qualityDropPercentage || 0) * 2, // Normalized Drift Index
        severity: (res.qualityDropPercentage || 0) > 10 ? "CRITICAL" : (res.qualityDropPercentage || 0) > 5 ? "MODERATE" : "LOW",
        deltaFromBaseline: -(res.qualityDropPercentage || 0),
        timestamp: new Date().toISOString()
      };

      setResults(enhanced)

      // Log to Audit Ledger if degradation exceeded
      if (enhanced.degradationDetected && firestore && user) {
        const auditRef = collection(firestore, "organizations", `org_${user.uid}`, "auditLogs");
        addDocumentNonBlocking(auditRef, {
          timestamp: new Date().toISOString(),
          actorEmail: user.email,
          action: "PRODUCTION_DRIFT_ALERT",
          category: "security",
          status: "failure",
          details: `Significant model drift detected: ${enhanced.driftScore.toFixed(1)} Index. Criteria: ${criteria}`,
          userAgent: navigator.userAgent
        });
      }

      toast({
        title: "Forensic Audit Complete",
        description: res.degradationDetected ? "Production drift detected. Alert logged." : "Operational quality confirmed."
      })
    } catch (e) {
      toast({ variant: "destructive", title: "Audit Failed", description: "Analysis engines stalled." })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background/50">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Quality Sentry</h1>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 text-[10px] font-bold py-1">
            <ShieldAlert size={10} /> DRIFT MONITOR ACTIVE
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <History className="text-primary" size={20} /> Production Baseline
                  </CardTitle>
                  <CardDescription>Establish a deterministic baseline using confirmed high-quality production outputs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {historicalOutputs.map((output, idx) => (
                    <div key={idx} className="flex gap-2 group">
                      <div className="flex-1">
                        <Textarea 
                          placeholder={`Production Sample ${idx + 1}...`}
                          value={output}
                          onChange={(e) => updateHistorical(idx, e.target.value)}
                          className="min-h-[100px] bg-muted/20 focus:bg-white transition-all"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeHistorical(idx)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addHistorical} className="w-full border-dashed border-primary/20 text-primary font-bold">
                    <Plus size={14} className="mr-2" /> Add Baseline Fragment
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Zap className="text-accent" size={20} /> Live Production Sample
                  </CardTitle>
                  <CardDescription>The current output subject to forensic drift analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    placeholder="Paste the latest production response..."
                    value={currentOutput}
                    onChange={(e) => setCurrentOutput(e.target.value)}
                    className="min-h-[200px] bg-accent/5 border-accent/20 focus:bg-white transition-all"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Forensic Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-70">Evaluation Criteria</Label>
                    <Input value={criteria} onChange={(e) => setCriteria(e.target.value)} className="bg-muted/30" />
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between text-xs font-bold uppercase">
                      <span>Degradation Threshold</span>
                      <span className="text-primary">{threshold}%</span>
                    </div>
                    <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} max={20} min={1} step={1} />
                  </div>

                  <Button className="w-full h-14 font-headline font-bold shadow-xl mt-4" disabled={loading} onClick={initiateAudit}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <BarChart4 size={18} className="mr-2" />}
                    Initiate Forensic Audit
                  </Button>
                </CardContent>
              </Card>

              {results && (
                <Card className={`border-none shadow-2xl transition-all duration-700 animate-in slide-in-from-right-8 ${results.degradationDetected ? 'bg-destructive text-white' : 'bg-primary text-white'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="secondary" className="bg-white/20 text-white border-none font-bold text-[9px]">
                        {results.severity} DRIFT
                      </Badge>
                      <span className="text-[10px] opacity-70 font-mono">{new Date(results.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <CardTitle className="font-headline text-2xl flex items-center gap-3">
                      {results.driftScore.toFixed(1)} <span className="text-sm font-normal opacity-70 tracking-widest uppercase">Drift Index</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                        <p className="text-[9px] uppercase font-bold opacity-70 mb-1">Baseline Score</p>
                        <p className="text-2xl font-headline font-bold">{results.historicalAverageQualityScore?.toFixed(1) || "N/A"}</p>
                      </div>
                      <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                        <p className="text-[9px] uppercase font-bold opacity-70 mb-1">Current Score</p>
                        <p className="text-2xl font-headline font-bold">{results.currentQualityScore?.toFixed(1) || "N/A"}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-black/20 rounded-2xl text-sm leading-relaxed italic border-l-4 border-white/30">
                      "{results.reasoning}"
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
