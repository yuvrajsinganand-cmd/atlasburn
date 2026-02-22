
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Key, ShieldCheck, Database, RefreshCw, Loader2, Copy, Terminal, Code, Info, ShieldAlert, Trash2 } from "lucide-react"
import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { rotateIngestKey, revokeIngestKey } from "./actions"

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [rotating, setRotating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({ 
        title: "New Ingest Key Active", 
        description: "Raw key copied to clipboard. We only store the hash.",
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Rotation Failed", description: e.message });
    } finally {
      setRotating(null);
    }
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
                      <CardDescription>Zero-latency token tracking via server-side wrapper.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-secondary/20 rounded-xl space-y-3">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Step 1: Install</p>
                        <div className="bg-zinc-950 text-zinc-50 p-3 rounded-lg font-mono text-xs flex justify-between items-center group">
                          <span>npm i @sleek/sdk</span>
                          <Copy size={14} className="opacity-0 group-hover:opacity-50 cursor-pointer" />
                        </div>
                      </div>
                      <div className="p-4 bg-secondary/20 rounded-xl space-y-3">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Step 2: Server-Side Init</p>
                        <pre className="bg-zinc-950 text-zinc-50 p-4 rounded-lg font-mono text-[10px] overflow-x-auto">
{`import { withSleek } from "@sleek/sdk";
import OpenAI from "openai";

const client = withSleek(new OpenAI({ ... }), {
  apiKey: process.env.SLEEK_INGEST_KEY,
  projectId: "${user?.uid || 'USER_ID'}"
});`}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold font-headline px-2">Active Ingest Keys</h3>
                    {subscriptions?.map(sub => (
                       <Card key={sub.id} className="border-none shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase">{sub.customName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px]">HMAC-SHA256</Badge>
                              <span className="text-[10px] text-muted-foreground">Deterministic verification enabled</span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={rotating === sub.id}
                            onClick={() => handleRotate(sub.id)}
                          >
                            {rotating === sub.id ? <Loader2 className="animate-spin mr-2" size={12} /> : <RefreshCw size={12} className="mr-2" />}
                            Rotate Key
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-accent/5 p-6 space-y-4">
                    <div className="p-3 bg-accent/10 rounded-2xl text-accent w-fit"><ShieldCheck size={24} /></div>
                    <h3 className="font-headline font-bold text-lg">Zero-Knowledge</h3>
                    <div className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                      <p>We only store peppered <b>HMAC hashes</b>. Your raw keys never touch our logs or database.</p>
                      <p className="text-xs text-amber-600 flex gap-2 font-medium">
                        <ShieldAlert size={14} />
                        Keys are visible once. Store them in your ENV immediately.
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="connectors">
              <Card className="border-none shadow-sm p-12 text-center">
                <Info className="mx-auto mb-4 text-muted-foreground" size={48} />
                <h3 className="text-xl font-headline font-bold mb-2">Billing Truth Sync</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">Verify SDK data against provider ledgers (24h delay). Recommended for reconciliation only.</p>
                <Button variant="outline">Connect Provider API</Button>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
