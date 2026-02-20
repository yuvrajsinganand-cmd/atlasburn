"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { recommendAiTools, type RecommendAiToolsOutput } from "@/ai/flows/recommend-ai-tools-flow"
import { Sparkles, CheckCircle2, Star, Loader2, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function Recommender() {
  const [task, setTask] = useState("")
  const [cost, setCost] = useState<"low" | "medium" | "high">("medium")
  const [perf, setPerf] = useState<"high" | "medium" | "balanced">("balanced")
  const [results, setResults] = useState<RecommendAiToolsOutput | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRecommend = async () => {
    if (!task) return
    setLoading(true)
    try {
      const res = await recommendAiTools({
        taskDescription: task,
        costPreference: cost,
        performancePreference: perf,
      })
      setResults(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Tool Recommender</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center gap-2">
                <Sparkles size={20} className="text-accent" />
                Intelligent Discovery
              </CardTitle>
              <CardDescription>Tell us what you're building, and we'll find the perfect AI toolchain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="task">What is your task or requirement?</Label>
                <Input 
                  id="task"
                  placeholder="e.g., I need to build a multilingual chatbot with high reasoning capabilities and long context window..." 
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="bg-muted/30"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost Preference</Label>
                  <Select value={cost} onValueChange={(v: any) => setCost(v)}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Budget Friendly (Low)</SelectItem>
                      <SelectItem value="medium">Balanced (Medium)</SelectItem>
                      <SelectItem value="high">Premium / Unlimited (High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Performance Preference</Label>
                  <Select value={perf} onValueChange={(v: any) => setPerf(v)}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Max Performance (High)</SelectItem>
                      <SelectItem value="medium">Efficiency Focused (Medium)</SelectItem>
                      <SelectItem value="balanced">Sweet Spot (Balanced)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleRecommend} 
                disabled={loading || !task} 
                className="w-full h-12 font-headline font-bold text-lg bg-primary hover:bg-primary/90 transition-all shadow-lg"
              >
                {loading ? <Loader2 className="mr-2 animate-spin" /> : <Zap size={18} className="mr-2" />}
                Find Best Match
              </Button>
            </CardContent>
          </Card>

          {results && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-headline text-lg font-bold px-2">Recommended Tools</h2>
              {results.recommendations.map((rec, i) => (
                <Card key={i} className="border-none shadow-sm overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-6 flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-headline text-primary mb-1">{rec.toolName}</CardTitle>
                          <p className="text-sm text-muted-foreground">{rec.toolDescription}</p>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-none"># {i + 1} Best Fit</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Star size={16} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Performance:</span>
                          <span className="text-xs font-bold">{rec.performanceRating}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-500" />
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Value:</span>
                          <span className="text-xs font-bold">{rec.costEffectivenessRating}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-secondary/50 rounded-xl">
                        <p className="text-xs font-semibold text-primary uppercase mb-1 flex items-center gap-1">
                          <Lightbulb size={12} /> AI Insight Reasoning
                        </p>
                        <p className="text-sm italic leading-relaxed text-sidebar-foreground/80">{rec.reasoning}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}