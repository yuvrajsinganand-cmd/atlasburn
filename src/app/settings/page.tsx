"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Key, ShieldCheck, Database, RefreshCw, Loader2, Copy, CheckCircle2, Terminal, Code, Info, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateAndHashIngestKey } from "./actions"

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const connectionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'));
  }, [firestore, user]);

  const { data: connections } = useCollection(connectionsQuery);

  const handleGenerateKey = async (subId: string) => {
    if (!user) return;
    setGenerating(true);
    
    try {
      const result = await generateAndHashIngestKey(user.uid, subId);
      
      // Copy raw key immediately as it won't be shown again
      navigator.clipboard.writeText(result.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      toast({ 
        title: "Ingest Key Generated & Copied", 
        description: "Key copied to clipboard. Sleek only stores the hash; this key cannot be retrieved again.",
      });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Generation Failed", description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "Key copied to clipboard." });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Forensic Ingestion</h1>
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
                  <Card className="border-none shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="text-xl font-headline flex items-center gap-2">
                        <Code className="text-primary" /> Implementation Wizard
                      </CardTitle>
                      <CardDescription>
                        Integrate Sleek directly into your runtime for zero-latency token tracking.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-secondary/20 rounded-xl space-y-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 1: Install Package</p>
                          <div className="bg-zinc-950 text-zinc-50 p-3 rounded-lg font-mono text-sm flex justify-between items-center group">
                            <span>npm i @sleek/sdk</span>
                            <Copy size={14} className="opacity-0 group-hover:opacity-50 cursor-pointer" onClick={() => copyToClipboard("npm i @sleek/sdk")} />
                          </div>
                        </div>

                        <div className="p-4 bg-secondary/20 rounded-xl space-y-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 2: Initialize Wrapper (Server Side)</p>
                          <pre className="bg-zinc-950 text-zinc-50 p-4 rounded-lg font-mono text-xs overflow-x-auto">
{`import { withSleek } from "@sleek/sdk";
import OpenAI from "openai";

// Secret Key used in production environment
const client = withSleek(new OpenAI({ ... }), {
  apiKey: process.env.SLEEK_INGEST_KEY,
  projectId: "${user?.uid || 'PROJECT_ID'}"
});`}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-white">
                    <CardHeader><CardTitle className="text-lg">Project Ingest Keys</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {connections?.map(conn => (
                          <div key={conn.id} className="p-4 border rounded-xl flex items-center justify-between hover:bg-muted/10 transition-colors">
                            <div className="space-y-1">
                              <p className="font-bold text-sm uppercase">{conn.customName}</p>
                              {conn.ingestKeyPrefix ? (
                                <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                                  {conn.ingestKeyPrefix} 
                                  <Badge variant="outline" className="text-[9px] h-4 px-1">HASHED</Badge>
                                </p>
                              ) : (
                                <p className="text-xs text-amber-600 font-medium">No active Ingest Key</p>
                              )}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleGenerateKey(conn.id)} disabled={generating}>
                              {generating ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} className="mr-2" />}
                              {conn.ingestKeyPrefix ? "Rotate Key" : "Generate Key"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-accent/5 p-6 space-y-4">
                    <div className="p-3 bg-accent/10 rounded-2xl text-accent w-fit"><ShieldCheck size={24} /></div>
                    <h3 className="font-headline font-bold text-lg">Zero-Knowledge Storage</h3>
                    <div className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                      <p>Sleek implements <b>Key Hashing</b>. We only store an HMAC-SHA256 signature of your Ingest Key.</p>
                      <p>If Sleek's database is ever compromised, your raw Ingest Keys remain mathematically protected.</p>
                      <p className="text-xs text-amber-600 flex gap-2 font-medium">
                        <ShieldAlert size={14} />
                        Once generated, the raw key cannot be retrieved. Store it in your secrets manager immediately.
                      </p>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm p-6 bg-primary text-primary-foreground">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={18} />
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Security Protocol</p>
                    </div>
                    <p className="text-sm leading-relaxed opacity-90">Ingest keys are scoped per project and can be rotated instantly. Ingestion is strictly server-side.</p>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="connectors">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Billing Truth Sync</CardTitle>
                  <CardDescription>Verify your SDK ledger against official provider dashboards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/20 flex flex-col items-center text-center space-y-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm"><Info className="text-muted-foreground" /></div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Historical Reconciliation (24h Delay)</p>
                      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">Official billing APIs are used for final reconciliation only. For real-time runway monitoring, use the Sleek SDK.</p>
                    </div>
                    <Button variant="outline" className="h-10">Configure Official APIs</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
