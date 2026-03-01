
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Terminal, Copy, Loader2, ArrowRight, Activity, Beaker } from "lucide-react"
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
        
        const dailyCalls = Math.floor(Math.random() * 5) + 3;
        for (let j = 0; j < dailyCalls; j++) {
          const cost = Math.random() * 50 + 10;
          promises.push(addDocumentNonBlocking(usagePath, {
            timestamp: date.toISOString(),
            cost,
            model: 'gpt-4o',
            provider: 'openai',
            eventId: crypto.randomUUID(),
            apiCallType: 'forensic_test'
          }));
        }
      }
      await Promise.all(promises);
      toast({ title: "Forensic Feed Primed", description: "Real data generated. Refresh the dashboard to see capital simulation." });
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
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <Card className="border-none shadow-sm p-8 bg-zinc-950 text-zinc-50 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-2xl text-primary"><Terminal size={32} /></div>
              <div>
                <h2 className="text-xl font-headline font-bold">SDK Sandbox</h2>
                <p className="text-zinc-400 text-sm">Test your forensic ingestion pipeline.</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Integration Snippet</p>
              <pre className="p-4 bg-black/50 rounded-xl font-mono text-xs overflow-x-auto text-primary leading-relaxed">
{`// Initialize AtlasBurn Forensic SDK
const { withSleek } = require('@atlasburn/sdk');

const openai = withSleek(new OpenAI(), {
  apiKey: process.env.ATLAS_BURN_KEY,
  projectId: "${user?.uid || 'PROJECT_ID'}"
});`}
              </pre>
            </div>

            <Button onClick={handleInject} disabled={testing} className="w-full h-14 text-lg font-headline font-bold shadow-xl">
              {testing ? <Loader2 className="animate-spin mr-2" /> : <Beaker className="mr-2" />}
              Inject Forensic Test Stream
            </Button>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
