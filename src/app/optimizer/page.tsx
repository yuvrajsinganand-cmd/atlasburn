"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap, ArrowRight, ShieldCheck, CheckCircle2, TrendingDown, Clock, Layers, History, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const DETERMINISTIC_SUGGESTIONS = [
  {
    title: "Model Overkill: Switch to Claude 3.5 Haiku",
    description: "Your 'classification' and 'summary' tasks are currently using Sonnet. Haiku provides equivalent quality at 1/5th the cost.",
    savings: 1243.50,
    runwayExtension: 38, // days
    impact: "High",
    icon: Zap,
    steps: ["Identify classification endpoints", "Update provider model parameter", "Verify output coherence"]
  },
  {
    title: "Retry Storm Mitigation",
    description: "Your system currently retries every timeout immediately. Exponential backoff will stop the cash burn during provider outages.",
    savings: 321.18,
    runwayExtension: 9,
    impact: "Low",
    icon: Clock,
    steps: ["Set initial backoff to 2s", "Increase max retries to 5", "Log timeout causes"]
  },
  {
    title: "Output Token Bloat",
    description: "Average output tokens are 3.2x larger than required for your use case. System prompt length constraints needed.",
    savings: 452.12,
    runwayExtension: 14,
    impact: "Medium",
    icon: FileText,
    steps: ["Set max_tokens parameter", "Add 'be concise' to system prompt", "Monitor completion truncation"]
  },
  {
    title: "Context Waste Pruning",
    description: "Your conversation history exceeds necessary reasoning context. Pruning to last 5 interactions reduces token overhead.",
    savings: 281.40,
    runwayExtension: 8,
    impact: "Medium",
    icon: History,
    steps: ["Implement context window sliding", "Store older context in vector DB", "Verify reasoning quality"]
  }
];

export default function RecommendationsPage() {
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const runAudit = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setShowResults(true)
    }, 1500)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Forensic Audit Engine</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          {!showResults ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 max-w-lg mx-auto text-center">
              <div className="bg-primary/10 p-6 rounded-3xl text-primary animate-pulse">
                <Zap size={64} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-headline font-bold">Uncover Hidden Burn</h2>
                <p className="text-muted-foreground leading-relaxed">Sleek will scan your recent SDK ingestion for model overkill, retry storms, and context waste.</p>
              </div>
              <Button onClick={runAudit} disabled={loading} size="lg" className="w-full h-16 text-xl font-headline font-bold shadow-xl">
                {loading ? <TrendingDown className="animate-pulse mr-2" /> : "Run Forensic Audit"}
              </Button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <h2 className="text-3xl font-headline font-bold">Survival Audit Results</h2>
                  <p className="text-muted-foreground">High-leverage actions to protect your runway.</p>
                </div>
                <Button variant="outline" onClick={() => setShowResults(false)}>Re-Run Audit</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-green-50 border-green-200">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-1">Potential Runway Extension</p>
                  <p className="text-4xl font-headline font-bold text-green-700">+69 <span className="text-lg opacity-70">Days</span></p>
                </Card>
                <Card className="p-6 bg-primary text-primary-foreground border-none">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Unnecessary Monthly Burn</p>
                  <p className="text-4xl font-headline font-bold">$2,298.20</p>
                </Card>
                <Card className="p-6 bg-white border-none shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Forensic Confidence</p>
                  <p className="text-4xl font-headline font-bold text-primary">94.2%</p>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-headline font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                    <ShieldCheck className="text-primary" /> Priority Inventions
                  </h3>
                  {DETERMINISTIC_SUGGESTIONS.map((s, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-6 md:w-3/4 space-y-4 border-r">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-secondary rounded-2xl text-primary">
                              <s.icon size={24} />
                            </div>
                            <div>
                              <CardTitle className="text-xl font-headline">{s.title}</CardTitle>
                              <CardDescription>{s.description}</CardDescription>
                            </div>
                          </div>
                          <div className="space-y-3 pt-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Engineering Playbook</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {s.steps.map((step, idx) => (
                                <div key={idx} className="p-3 bg-muted/50 rounded-xl flex items-center gap-2 text-xs">
                                  <CheckCircle2 size={12} className="text-green-600" />
                                  {step}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="p-6 md:w-1/4 bg-muted/20 flex flex-col justify-between items-center text-center">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Runway Impact</p>
                            <p className="text-3xl font-headline font-bold text-green-600">+{s.runwayExtension} Days</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Saving: ${s.savings}/mo</p>
                          </div>
                          <Button className="w-full mt-4 group">
                            Implementation Guide <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
