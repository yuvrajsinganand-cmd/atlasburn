
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Key, ShieldCheck, Database, RefreshCw, Loader2, Copy, Terminal, Code, Info, ShieldAlert, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { rotateIngestKey } from "./actions"

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [rotating, setRotating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const subsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'));
  }, [firestore, user]);

  const { data: subscriptions } = useCollection(subsQuery);

  const handleRotate = async (subId: string) => {
    if (!user) return;
    setRotating(subId);
    try {
      const result = await rotateIngestKey(user.uid, subId);
      navigator.clipboard.writeText(result.rawKey);
      toast({ 
        title: "New Ingest Key Active", 
        description: "Raw key copied to clipboard. Store it securely in your .env as SLEEK_INGEST_KEY.",
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Rotation Failed", description: e.message });
    } finally {
      setRotating(null);
    }
  };

  const copyProjectId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast({ title: "Project ID Copied", description: "Use this value for 'projectId' in SDK initialization." });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight">Forensic Connectors</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <Tabs defaultValue="sdk" className="space-y-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="sdk" className="gap-2"><Terminal size={14} /> SDK Setup</TabsTrigger>
              <TabsTrigger value="connectors" className="gap-2"><Database size={14} /> Billing Sync</TabsTrigger>
            </TabsList>

            <TabsContent value="sdk" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b">
                      <CardTitle className="text-xl font-headline flex items-center gap-2 text-primary">
                        <Code size={20} /> Implementation Wizard
                      </CardTitle>
                      <CardDescription>Zero-latency token tracking via server-side forensic wrapper.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Your Project Identity</p>
                          <Button variant="ghost" size="sm" onClick={copyProjectId} className="h-6 gap-1 text-[10px] font-bold uppercase">
                            {copiedId ? <CheckCircle2 size={12} className="text-green-600" /> : <Copy size={12} />}
                            {copiedId ? "Copied" : "Copy Project ID"}
                          </Button>
                        </div>
                        <div className="bg-zinc-950 text-zinc-50 p-4 rounded-xl font-mono text-xs flex justify-between items-center group">
                          <span className="opacity-70">projectId:</span>
                          <span className="text-primary-foreground font-bold">{user?.uid || 'ID_NOT_FOUND'}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">1. Initialize Client</p>
                        <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed border-l-4 border-primary">
{`import { withSleek } from "@sleek/sdk";
import OpenAI from "openai";

// Wraps any LLM client for forensic attribution
const client = withSleek(new OpenAI({ ... }), {
  apiKey: process.env.SLEEK_INGEST_KEY,
  projectId: "${user?.uid || 'USER_ID'}"
});`}
                        </pre>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">2. Attribute usage</p>
                        <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed">
{`// Attributed to Feature & User Tier automatically
const response = await client.chat({
  model: "gpt-4o",
  featureId: "search_module",
  userTier: "enterprise",
  messages: [...]
});`}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold font-headline px-2 flex items-center gap-2">
                      <Key size={14} className="text-primary" /> Active Ingest Keys
                    </h3>
                    {subscriptions?.map(sub => (
                       <Card key={sub.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase text-primary">{sub.customName || sub.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] font-bold bg-muted/50 border-none">HMAC-SHA256</Badge>
                              <span className="text-[10px] text-muted-foreground">Verification active</span>
                            </div>
                          </div>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="font-headline font-bold text-[10px]"
                            disabled={rotating === sub.id}
                            onClick={() => handleRotate(sub.id)}
                          >
                            {rotating === sub.id ? <Loader2 className="animate-spin mr-2" size={12} /> : <RefreshCw size={12} className="mr-2" />}
                            ROTATE SECRET
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                    {!subscriptions?.length && (
                      <p className="text-xs text-muted-foreground italic px-2">No active subscriptions found. Add a tool to generate ingest keys.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-primary text-primary-foreground p-6 space-y-4">
                    <div className="p-3 bg-white/10 rounded-2xl text-white w-fit"><ShieldCheck size={24} /></div>
                    <h3 className="font-headline font-bold text-lg">Zero-Knowledge</h3>
                    <div className="text-sm space-y-4 opacity-90 leading-relaxed italic">
                      <p>Sleek only stores peppered <b>HMAC hashes</b>. Your raw keys never touch our logs or database.</p>
                      <p className="text-xs text-amber-300 flex gap-2 font-bold not-italic">
                        <ShieldAlert size={14} className="shrink-0" />
                        Keys are visible once. Store them in your ENV immediately.
                      </p>
                    </div>
                  </Card>
                  
                  <Card className="border-none shadow-sm p-6 bg-white space-y-4">
                    <div className="p-3 bg-secondary rounded-2xl text-primary w-fit"><Info size={24} /></div>
                    <h3 className="font-headline font-bold text-sm">Deployment Check</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ensure your production environment has the <code className="bg-muted px-1 py-0.5 rounded font-bold">SLEEK_INGEST_KEY</code> set. 
                      Failures in ingestion will be logged to your internal developer console without affecting user latency.
                    </p>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="connectors">
              <Card className="border-none shadow-sm p-12 text-center bg-white">
                <div className="bg-muted/30 p-8 rounded-full w-fit mx-auto mb-6">
                  <Database className="text-muted-foreground" size={48} />
                </div>
                <h3 className="text-2xl font-headline font-bold mb-2">Billing Truth Sync</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-sm">
                  Connect direct provider APIs (OpenAI/Anthropic) to verify SDK forensic data against provider ledgers. This is recommended for monthly reconciliation.
                </p>
                <Button variant="outline" size="lg" className="rounded-full font-headline font-bold">Connect Provider API</Button>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
