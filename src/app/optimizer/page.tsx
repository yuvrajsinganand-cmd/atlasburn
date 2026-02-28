
"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap, ArrowRight, ShieldCheck, CheckCircle2, TrendingDown, Clock, FileText, History, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, limit, doc } from "firebase/firestore"
import { suggestCostOptimizations, type SuggestCostOptimizationsOutput } from "@/ai/flows/suggest-cost-optimizations"
import { toast } from "@/hooks/use-toast"

export default function RecommendationsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SuggestCostOptimizationsOutput | null>(null)

  // Fetch Real Forensic Context
  const orgRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'organizations', `org_${user.uid}`);
  }, [firestore, user]);
  const { data: organization } = useDoc(orgRef);

  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'), limit(50));
  }, [firestore, user]);
  const { data: usageRecords } = useCollection(usageQuery);

  const runAudit = async () => {
    if (!usageRecords || !organization) return;
    setLoading(true)
    
    try {
      // Map Firestore data to Genkit Flow Input
      const subscriptions = [{
        name: "Primary API Cluster",
        provider: "Multi-Provider",
        monthlyCost: usageRecords.reduce((acc, r) => acc + (r.cost || 0), 0) * 30, // Rough estimate
        renewalDate: new Date().toISOString().split('T')[0],
      }];

      const usagePatterns = usageRecords.map(r => ({
        toolName: r.model || "Unknown",
        totalTasks: 1,
        costPerTask: r.cost || 0,
        trendAnalysis: "Analyzed via forensic ingestion"
      }));

      const res = await suggestCostOptimizations({
        subscriptions,
        usagePatterns,
        overallMonthlyBudget: organization.monthlyRevenue * 0.4 // Soft target 40% burn
      });

      setResults(res);
      toast({
        title: "Audit Complete",
        description: "Institutional optimization playbook generated based on ingestion variance.",
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Audit Failed",
        description: "Could not generate optimization playbook. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleExecuteFix = (title: string) => {
    toast({
      title: "Optimization Initiated",
      description: `Fixing '${title}' across your production cluster. Deployment in progress...`,
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight">Forensic Audit Engine</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          {!results ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 max-w-lg mx-auto text-center">
              <div className="bg-primary/10 p-6 rounded-3xl text-primary animate-pulse">
                <Zap size={64} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-headline font-bold">Uncover Hidden Burn</h2>
                <p className="text-muted-foreground leading-relaxed">AtlasBurn will scan your recent SDK ingestion for model overkill, retry storms, and context waste using Genkit AI.</p>
              </div>
              <Button onClick={runAudit} disabled={loading || !usageRecords?.length} size="lg" className="w-full h-16 text-xl font-headline font-bold shadow-xl">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Run Forensic Audit"}
              </Button>
              {!usageRecords?.length && (
                <p className="text-xs text-destructive font-bold">No ingestion data found. Run a test call first.</p>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <h2 className="text-3xl font-headline font-bold">Audit Intelligence</h2>
                  <p className="text-muted-foreground">High-leverage actions to protect your runway.</p>
                </div>
                <Button variant="outline" onClick={() => setResults(null)}>Re-Run Audit</Button>
              </div>

              <Card className="p-8 bg-primary text-primary-foreground border-none shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Institutional Summary</p>
                <p className="text-lg leading-relaxed font-medium italic">"{results.overallSummary}"</p>
              </Card>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-headline font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                    <ShieldCheck className="text-primary" /> Optimization Playbook
                  </h3>
                  {results.suggestions.map((s, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-6 md:w-3/4 space-y-4 border-r">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-secondary rounded-2xl text-primary">
                              {i % 2 === 0 ? <Zap size={24} /> : <Clock size={24} />}
                            </div>
                            <div>
                              <CardTitle className="text-xl font-headline">{s.title}</CardTitle>
                              <CardDescription className="mt-1">{s.description}</CardDescription>
                            </div>
                          </div>
                          {s.actionableSteps && (
                            <div className="space-y-3 pt-4">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Implementation Roadmap</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {s.actionableSteps.map((step, idx) => (
                                  <div key={idx} className="p-3 bg-muted/50 rounded-xl flex items-center gap-2 text-xs">
                                    <CheckCircle2 size={12} className="text-green-600" />
                                    {step}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-6 md:w-1/4 bg-muted/20 flex flex-col justify-center items-center text-center">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. Saving</p>
                            <p className="text-3xl font-headline font-bold text-green-600">${s.estimatedMonthlySaving || 0}<span className="text-xs font-normal">/mo</span></p>
                          </div>
                          <Button className="w-full mt-6 group bg-primary" onClick={() => handleExecuteFix(s.title)}>
                            Execute Fix <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
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
