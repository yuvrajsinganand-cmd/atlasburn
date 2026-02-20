"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, RefreshCw, BarChart3, TrendingDown, ArrowLeftRight } from "lucide-react"
import { useState } from "react"
import { Progress } from "@/components/ui/progress"

export default function Comparator() {
  const [comparing, setComparing] = useState(false)
  const [activeSim, setActiveSim] = useState(false)

  const handleSim = () => {
    setActiveSim(true)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Model Comparator</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm relative overflow-hidden group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center mb-1">
                  <Badge className="bg-primary">Current Model</Badge>
                  <span className="text-xs font-mono text-muted-foreground">GPT-4-Turbo</span>
                </div>
                <CardTitle className="font-headline">Standard Engine</CardTitle>
                <CardDescription>Primary production model for complex logic.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/20 rounded-xl space-y-3">
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                    <span>Performance</span>
                    <span>9.2/10</span>
                  </div>
                  <Progress value={92} className="h-1" />
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                    <span>Reliability</span>
                    <span>99.9%</span>
                  </div>
                  <Progress value={99} className="h-1" />
                </div>
                <div className="text-sm border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Cost per 1M tokens</span>
                    <span className="font-bold">$10.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Latency</span>
                    <span className="font-bold">1.2s</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm relative overflow-hidden group border-accent/20 bg-accent/5">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center mb-1">
                  <Badge variant="secondary" className="bg-accent text-white">Challenger</Badge>
                  <span className="text-xs font-mono text-accent font-bold">Claude 3.5 Sonnet</span>
                </div>
                <CardTitle className="font-headline text-accent">Optimization Candidate</CardTitle>
                <CardDescription>Suggested switch based on recent quality benchmarks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white/60 rounded-xl space-y-3">
                  <div className="flex justify-between text-xs font-bold uppercase text-accent">
                    <span>Performance</span>
                    <span>9.4/10</span>
                  </div>
                  <Progress value={94} className="h-1 bg-accent/10" />
                  <div className="flex justify-between text-xs font-bold uppercase text-accent">
                    <span>Reliability</span>
                    <span>98.5%</span>
                  </div>
                  <Progress value={98} className="h-1 bg-accent/10" />
                </div>
                <div className="text-sm border-t border-accent/10 pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Cost per 1M tokens</span>
                    <span className="font-bold text-accent">$3.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Latency</span>
                    <span className="font-bold text-accent">0.8s</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button size="lg" onClick={handleSim} className="rounded-full px-8 font-headline font-bold bg-accent hover:bg-accent/90 shadow-xl group">
              <RefreshCw className="mr-2 group-hover:rotate-180 transition-transform duration-500" /> Run Switch Simulation
            </Button>
          </div>

          {activeSim && (
            <Card className="border-none shadow-xl bg-primary text-primary-foreground animate-in slide-in-from-bottom-8 duration-700">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-3">
                  <BarChart3 /> Simulation Results
                </CardTitle>
                <CardDescription className="text-primary-foreground/70">Projected metrics if you switch to the Challenger model today.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-6 bg-white/10 rounded-2xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/60 mb-1">Projected Savings</p>
                  <p className="text-4xl font-headline font-bold">$420 <span className="text-lg font-normal opacity-80">/ month</span></p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-green-300">
                    <TrendingDown size={14} /> 70% reduction in API overhead
                  </div>
                </div>
                <div className="p-6 bg-white/10 rounded-2xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/60 mb-1">Performance Delta</p>
                  <p className="text-4xl font-headline font-bold text-green-300">+2.1%</p>
                  <p className="mt-4 text-xs text-primary-foreground/80 leading-relaxed">Better handling of your specific "coding" and "narrative" tasks.</p>
                </div>
                <div className="p-6 bg-white/10 rounded-2xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/60 mb-1">Confidence Score</p>
                  <p className="text-4xl font-headline font-bold">98%</p>
                  <div className="mt-4 flex gap-2">
                    <Badge variant="outline" className="border-white/20 text-white">Safe to Switch</Badge>
                  </div>
                </div>
                <div className="md:col-span-3">
                  <Button className="w-full bg-white text-primary hover:bg-white/90 font-headline font-bold text-lg h-14">
                    <ArrowLeftRight className="mr-2" /> Execute Model Switch
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}