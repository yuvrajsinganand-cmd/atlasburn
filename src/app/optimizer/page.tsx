"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { suggestCostOptimizations, type SuggestCostOptimizationsOutput } from "@/ai/flows/suggest-cost-optimizations"
import { detectModelQualityDegradation, type DetectModelQualityDegradationOutput } from "@/ai/flows/detect-model-quality-degradation"
import { MOCK_SUBSCRIPTIONS, MOCK_USAGE_PATTERNS } from "@/lib/mock-data"
import { TrendingDown, ShieldCheck, AlertTriangle, ChevronRight, Activity, ArrowRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Optimizer() {
  const [optLoading, setOptLoading] = useState(false)
  const [optResult, setOptResult] = useState<SuggestCostOptimizationsOutput | null>(null)
  
  const [qualLoading, setQualLoading] = useState(false)
  const [qualResult, setQualResult] = useState<DetectModelQualityDegradationOutput | null>(null)

  const runOptimization = async () => {
    setOptLoading(true)
    try {
      const res = await suggestCostOptimizations({
        subscriptions: MOCK_SUBSCRIPTIONS,
        usagePatterns: MOCK_USAGE_PATTERNS,
        overallMonthlyBudget: 100
      })
      setOptResult(res)
    } finally {
      setOptLoading(false)
    }
  }

  const runQualityCheck = async () => {
    setQualLoading(true)
    try {
      const res = await detectModelQualityDegradation({
        historicalOutputs: [
          "The solution involves refactoring the auth middleware to handle concurrent requests using a semaphore pattern in Go.",
          "To optimize the database queries, implement a multi-level caching strategy using Redis and an in-memory TTL map.",
          "The frontend performance can be improved by leveraging React Server Components for data-heavy dashboard views."
        ],
        currentOutput: "I think you should just add more memory to the server. It's probably a server issue, not code. Maybe check the logs?",
        qualityCriteria: "Technical depth, actionable advice, context awareness",
        degradationThresholdPercent: 15
      })
      setQualResult(res)
    } finally {
      setQualLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Smart Optimizer</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          <Tabs defaultValue="costs">
            <TabsList className="grid w-[400px] grid-cols-2 bg-secondary mb-6">
              <TabsTrigger value="costs" className="gap-2"><TrendingDown size={16} /> Cost Optimization</TabsTrigger>
              <TabsTrigger value="quality" className="gap-2"><Activity size={16} /> Quality Monitor</TabsTrigger>
            </TabsList>

            <TabsContent value="costs" className="space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-headline">Budget Intelligence</CardTitle>
                    <CardDescription>AI-driven analysis of your tool spending versus actual utility.</CardDescription>
                  </div>
                  <Button onClick={runOptimization} disabled={optLoading} className="shadow-lg">
                    {optLoading ? <Loader2 className="animate-spin mr-2" /> : <TrendingDown className="mr-2" size={18} />}
                    Scan for Savings
                  </Button>
                </CardHeader>
              </Card>

              {optResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="md:col-span-2 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Executive Summary</p>
                    <p className="text-lg font-medium leading-relaxed">{optResult.overallSummary}</p>
                  </div>
                  {optResult.suggestions.map((s, idx) => (
                    <Card key={idx} className="border-none shadow-sm flex flex-col hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Suggestion {idx + 1}</Badge>
                          {s.estimatedMonthlySaving && (
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Est. Savings</p>
                              <p className="text-lg font-headline font-bold text-green-600">-${s.estimatedMonthlySaving}/mo</p>
                            </div>
                          )}
                        </div>
                        <CardTitle className="text-lg font-headline">{s.title}</CardTitle>
                        <CardDescription>{s.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto pt-4 space-y-4">
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Actionable Steps</p>
                          {s.actionableSteps?.map((step, si) => (
                            <div key={si} className="flex items-start gap-3 text-sm group">
                              <div className="mt-1 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                                {si + 1}
                              </div>
                              <p className="flex-1">{step}</p>
                            </div>
                          ))}
                        </div>
                        <Button variant="secondary" className="w-full mt-2 group">
                          Apply Suggestion <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="quality" className="space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-headline">Drift & Degradation Detection</CardTitle>
                    <CardDescription>Track model output quality over time to detect performance loss.</CardDescription>
                  </div>
                  <Button onClick={runQualityCheck} disabled={qualLoading} variant="outline" className="border-primary/20 hover:bg-primary/5">
                    {qualLoading ? <Loader2 className="animate-spin mr-2" /> : <Activity className="mr-2" size={18} />}
                    Check Latest Run
                  </Button>
                </CardHeader>
              </Card>

              {qualResult && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white border-none shadow-sm">
                      <CardHeader className="py-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase font-bold">Historical Baseline</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-baseline gap-1">
                        <span className="text-3xl font-headline font-bold">{qualResult.historicalAverageQualityScore}</span>
                        <span className="text-muted-foreground">/ 10</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border-none shadow-sm">
                      <CardHeader className="py-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase font-bold">Current Result</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-baseline gap-1">
                        <span className={`text-3xl font-headline font-bold ${qualResult.degradationDetected ? 'text-destructive' : 'text-primary'}`}>
                          {qualResult.currentQualityScore}
                        </span>
                        <span className="text-muted-foreground">/ 10</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border-none shadow-sm">
                      <CardHeader className="py-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase font-bold">Quality Drop</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-baseline gap-1">
                        <span className={`text-3xl font-headline font-bold ${qualResult.degradationDetected ? 'text-destructive' : 'text-green-500'}`}>
                          {qualResult.qualityDropPercentage}%
                        </span>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className={`border-2 ${qualResult.degradationDetected ? 'border-destructive/30 bg-destructive/5' : 'border-green-200 bg-green-50'}`}>
                    <CardContent className="pt-6 flex gap-4 items-start">
                      {qualResult.degradationDetected ? 
                        <AlertTriangle className="text-destructive shrink-0 mt-1" size={24} /> : 
                        <ShieldCheck className="text-green-600 shrink-0 mt-1" size={24} />
                      }
                      <div>
                        <h3 className="font-headline font-bold text-lg mb-2">
                          {qualResult.degradationDetected ? 'Degradation Alert: Model Drift Detected' : 'Performance Verified: Quality is Stable'}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{qualResult.reasoning}</p>
                        {qualResult.degradationDetected && (
                          <div className="mt-4 flex gap-3">
                            <Button variant="destructive" size="sm">Switch Model Engine</Button>
                            <Button variant="outline" size="sm">Tweak System Prompt</Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}