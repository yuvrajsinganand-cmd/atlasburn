
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Key, ShieldCheck, Database, RefreshCw, Loader2, Copy, CheckCircle2, Terminal, Code } from "lucide-react"
import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

  const generateIngestKey = (subId: string) => {
    if (!user || !firestore) return;
    setGenerating(true);
    
    const key = `slk_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    const docRef = doc(firestore, 'users', user.uid, 'aiSubscriptions', subId);
    
    updateDocumentNonBlocking(docRef, {
      ingestKey: key,
      updatedAt: new Date().toISOString()
    });

    setTimeout(() => {
      setGenerating(false);
      toast({ title: "Ingest Key Generated", description: "This key is now authorized for request-level forensic logging." });
    }, 800);
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
              <TabsTrigger value="connectors" className="gap-2"><Database size={14} /> Legacy Connectors</TabsTrigger>
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
                        Integrate Sleek directly into your runtime for zero-latency token tracking and anomaly detection.
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
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 2: Initialize Wrapper</p>
                          <pre className="bg-zinc-950 text-zinc-50 p-4 rounded-lg font-mono text-xs overflow-x-auto">
{`import { withSleek } from "@sleek/sdk";
import OpenAI from "openai";

const client = withSleek(new OpenAI({ ... }), {
  apiKey: "YOUR_INGEST_KEY",
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
                              {conn.ingestKey ? (
                                <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                                  {conn.ingestKey.substring(0, 12)}... 
                                  <Copy size={12} className="cursor-pointer hover:text-primary" onClick={() => copyToClipboard(conn.ingestKey)} />
                                </p>
                              ) : (
                                <p className="text-xs text-amber-600 font-medium">No active Ingest Key</p>
                              )}
                            </div>
                            {conn.ingestKey ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Active</Badge>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => generateIngestKey(conn.id)} disabled={generating}>
                                {generating ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} className="mr-2" />}
                                Generate Key
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-accent/5 p-6 space-y-4">
                    <div className="p-3 bg-accent/10 rounded-2xl text-accent w-fit"><ShieldCheck size={24} /></div>
                    <h3 className="font-headline font-bold text-lg">Zero Latency. Guaranteed.</h3>
                    <div className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                      <p>Sleek's SDK uses a <b>fire-and-forget</b> ingestion pattern. Your LLM calls execute first; forensic metadata is sent in the background.</p>
                      <p>If Sleek's endpoint is slow or unreachable, your production traffic is <b>never blocked</b>.</p>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm p-6 bg-primary text-primary-foreground">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={18} />
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Security Protocol</p>
                    </div>
                    <p className="text-sm leading-relaxed opacity-90">Ingest keys are scoped per project and can be revoked instantly. We never ingest prompt content by default.</p>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="connectors">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Legacy Provider Sync</CardTitle>
                  <CardDescription>Pull billing truth directly from provider dashboards (Syncs every 24h).</CardDescription>
                </CardHeader>
                <CardContent className="py-12 text-center text-muted-foreground italic">
                  Connectors are currently in maintenance mode. Use the SDK for real-time burn attribution.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
