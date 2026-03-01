
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Terminal, Loader2, Beaker, Zap, ShieldCheck } from "lucide-react"
import { useUser, useFirestore } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function UsageLab() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [testing, setTesting] = useState(false)

  const handleInject = async () => {
    if (!user || !firestore) return;
    setTesting(true);
    try {
      const orgRef = doc(firestore, 'organizations', `org_${user.uid}`);
      const usagePath = collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords');
      
      setDocumentNonBlocking(orgRef, {
        name: `${user.displayName || 'Forensic'}'s Org`,
        capitalReserves: 50000,
        monthlyRevenue: 12000,
        fixedMonthlyBurn: 2000,
        targetMargin: 0.7,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      const promises = [];
      for (let i = 14; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dailyCalls = Math.floor(Math.random() * 5) + 3;
        for (let j = 0; j < dailyCalls; j++) {
          const cost = Math.random() * 50 + 10;
          promises.push(addDocumentNonBlocking(usagePath, {
            timestamp: date.toISOString(),
            cost,
            model: 'gpt-4o',
            provider: 'openai',
            eventId: crypto.randomUUID(),
            apiCallType: 'forensic_simulation',
            inputTokens: Math.floor(Math.random() * 1000) + 500,
            outputTokens: Math.floor(Math.random() * 500) + 200
          }));
        }
      }
      
      await Promise.all(promises);
      toast({ title: "Forensic Feed Primed", description: "Institutional ingestion data initialized. Modeling active." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Injection Failed", description: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Forensic Laboratory</h1>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 text-[10px] font-bold px-3 py-1">
            <ShieldCheck size={12} /> PROTOTYPE SIMULATION MODE
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <Card className="border-none shadow-2xl p-8 bg-zinc-950 text-zinc-50 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/20 rounded-[1.5rem] text-primary"><Terminal size={40} /></div>
              <div>
                <h2 className="text-2xl font-headline font-bold">Inject Synthetic Ingestion</h2>
                <p className="text-zinc-400 text-sm">Prime the risk engine with stochastic production-grade usage metadata.</p>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Zap size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Instructions</span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Clicking the button below will bypass manual SDK deployment and inject 14 days of deterministic forensic data into your **Economic Root**. This activates the global System Pulse and Monte Carlo risk modeling.
              </p>
            </div>

            <Button onClick={handleInject} disabled={testing} className="w-full h-16 text-xl font-headline font-bold shadow-2xl transition-all">
              {testing ? <Loader2 className="animate-spin mr-2" /> : <Beaker className="mr-2" />}
              Inject Synthetic Ingestion
            </Button>

            <div className="pt-6 border-t border-zinc-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Backend-Only SDK Reference</p>
              <pre className="p-5 bg-black/50 rounded-2xl font-mono text-[11px] overflow-x-auto text-primary/70 leading-relaxed border border-zinc-800/50">
{`// Institutional Deployment Example
import { withAtlasBurn } from "@atlasburn/sdk";
const openai = withAtlasBurn(new OpenAI(), {
  apiKey: process.env.ATLASBURN_KEY,
  projectId: "${user?.uid || 'PROJECT_ID'}"
});`}
              </pre>
            </div>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
