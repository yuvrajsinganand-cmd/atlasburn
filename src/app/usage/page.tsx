
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Terminal, Loader2, Beaker, Zap, ShieldCheck } from "lucide-react"
import { useUser, useFirestore } from "@/firebase"
import { collection } from "firebase/firestore"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function UsageLab() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [testing, setTesting] = useState(false)

  const handleInject = async () => {
    if (!user || !firestore) return;
    setTesting(true);
    try {
      const usagePath = collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords');
      
      // Inject 14 days of stochastic forensic data
      const promises = [];
      for (let i = 14; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Random number of calls per day to create "noise" for the variance engine
        const dailyCalls = Math.floor(Math.random() * 5) + 3;
        for (let j = 0; j < dailyCalls; j++) {
          const cost = Math.random() * 50 + 10;
          promises.push(addDocumentNonBlocking(usagePath, {
            timestamp: date.toISOString(),
            cost,
            model: 'gpt-4o',
            provider: 'openai',
            eventId: crypto.randomUUID(),
            apiCallType: 'forensic_simulation'
          }));
        }
      }
      
      // Also add some "shocks" to test risk detection
      promises.push(addDocumentNonBlocking(usagePath, {
        timestamp: new Date().toISOString(),
        cost: 500, // A massive spike
        model: 'o1-preview',
        provider: 'openai',
        eventId: crypto.randomUUID(),
        apiCallType: 'stress_test_event'
      }));

      await Promise.all(promises);
      toast({ 
        title: "Forensic Feed Primed", 
        description: "Institutional burn data generated. Refresh the dashboard to see capital simulation." 
      });
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
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Forensic Lab</h1>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 text-[10px] font-bold px-3 py-1">
            <ShieldCheck size={12} /> PROTOTYPE SIMULATION MODE
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <Card className="border-none shadow-sm p-8 bg-zinc-950 text-zinc-50 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-2xl text-primary"><Terminal size={32} /></div>
              <div>
                <h2 className="text-xl font-headline font-bold">Integration Simulation</h2>
                <p className="text-zinc-400 text-sm">Since the @atlasburn/sdk is conceptual, use this lab to prime your engine.</p>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Zap size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">How to test</span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Click the button below to inject 14 days of synthetic forensic data into your organization. This will provide the "Forensic Volatility" and "Daily Burn" metrics required for the Probabilistic Risk Engine to function.
              </p>
            </div>

            <Button onClick={handleInject} disabled={testing} className="w-full h-14 text-lg font-headline font-bold shadow-xl">
              {testing ? <Loader2 className="animate-spin mr-2" /> : <Beaker className="mr-2" />}
              Inject Forensic Test Stream
            </Button>

            <div className="pt-4 border-t border-zinc-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Conceptual Implementation</p>
              <pre className="p-4 bg-black/50 rounded-xl font-mono text-[10px] overflow-x-auto text-primary/70 leading-relaxed">
{`// In production, you would run: npm install @atlasburn/sdk
// Then wrap your client:
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
