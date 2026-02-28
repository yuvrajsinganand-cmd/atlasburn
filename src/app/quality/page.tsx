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
import { 
  ShieldAlert, 
  ShieldCheck, 
  History, 
  Zap, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  BarChart4,
  CheckCircle2
} from "lucide-react"
import { detectModelQualityDegradation, type DetectModelQualityDegradationOutput } from "@/ai/flows/detect-model-quality-degradation"
import { toast } from "@/hooks/use-toast"

export default function QualityMonitor() {
  const [historicalOutputs, setHistoricalOutputs] = useState<string[]>([""])
  const [currentOutput, setCurrentOutput] = useState("")
  const [criteria, setCriteria] = useState("coherence, factual accuracy, tone consistency")
  const [threshold, setThreshold] = useState(5)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DetectModelQualityDegradationOutput | null>(null)
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

  const handleAudit = async () => {
    const filteredHistorical = historicalOutputs.filter(o => o.trim() !== "")
    if (filteredHistorical.length === 0 || !currentOutput) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide at least one historical output and the latest output."
      })
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
      setResults(res)
      toast({
        title: "Audit Complete",
        description: res.degradationDetected 
          ? "Significant quality degradation detected." 
          : "Model quality remains within operational thresholds."
      })
    } catch (e) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "Audit Failed",
        description: "Failed to evaluate model quality. Check console for details."
      })
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
            <ShieldCheck size={10} /> DRIFT MONITOR ACTIVE
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <History className="text-primary" size={20} /> Historical Baseline
                  </CardTitle>
                  <CardDescription>Provide previous successful model outputs to establish a quality baseline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {historicalOutputs.map((output, idx) => (
                    <div key={idx} className="flex gap-2 group">
                      <div className="flex-1">
                        <Textarea 
                          placeholder={`Output sample ${idx + 1}...`}
                          value={output}
                          onChange={(e) => updateHistorical(idx, e.target.value)}
                          className="min-h-[100px] bg-muted/20"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeHistorical(idx)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addHistorical} className="w-full border-dashed">
                    <Plus size={14} className="mr-2" /> Add History Sample
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Zap className="text-accent" size={20} /> Latest Production Output
                  </CardTitle>
                  <CardDescription>The recent output you want to verify against the established baseline.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    placeholder="Paste the current model response here..."
                    value={currentOutput}
                    onChange={(e) => setCurrentOutput(e.target.value)}
                    className="min-h-[200px] bg-accent/5 border-accent/20"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Audit Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase opacity-70">Evaluation Criteria</Label>
                    <Input 
                      value={criteria}
                      onChange={(e) => setCriteria(e.target.value)}
                      className="bg-muted/30"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Comma-separated list of quality vectors.</p>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between text-xs font-bold uppercase">
                      <span>Degradation Threshold</span>
                      <span className="text-primary">{threshold}%</span>
                    </div>
                    <Slider 
                      value={[threshold]} 
                      onValueChange={([v]) => setThreshold(v)} 
                      max={20} 
                      min={1}
                      step={1} 
                    />
                    <p className="text-[10px] text-muted-foreground">Drop in quality score that triggers a forensic alert.</p>
                  </div>

                  <Button 
                    className="w-full h-12 font-headline font-bold shadow-lg mt-4"
                    disabled={loading}
                    onClick={handleAudit}
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <BarChart4 size={18} className="mr-2" />}
                    Run Quality Audit
                  </Button>
                </CardContent>
              </Card>

              {results && (
                <Card className={`border-none shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-right-4 ${results.degradationDetected ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
                  <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                      {results.degradationDetected ? <AlertTriangle /> : <CheckCircle2 />}
                      Audit Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <p className="text-[9px] uppercase font-bold opacity-70 mb-1">Baseline Score</p>
                        <p className="text-xl font-headline font-bold">{results.historicalAverageQualityScore?.toFixed(1) || "N/A"}/10</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl">
                        <p className="text-[9px] uppercase font-bold opacity-70 mb-1">Current Score</p>
                        <p className="text-xl font-headline font-bold">{results.currentQualityScore?.toFixed(1) || "N/A"}/10</p>
                      </div>
                    </div>
                    
                    {results.qualityDropPercentage !== undefined && (
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold uppercase opacity-80">Quality Shift</span>
                        <Badge variant="secondary" className={`${results.degradationDetected ? 'bg-white text-destructive' : 'bg-white text-primary'} border-none font-bold`}>
                          {results.qualityDropPercentage > 0 ? '-' : '+'}{Math.abs(results.qualityDropPercentage).toFixed(1)}%
                        </Badge>
                      </div>
                    )}

                    <div className="p-4 bg-black/10 rounded-xl text-sm leading-relaxed italic border-l-4 border-white/20">
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
