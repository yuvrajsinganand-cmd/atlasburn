
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Key, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Loader2, 
  Copy, 
  Terminal, 
  Zap, 
  Globe, 
  CreditCard, 
  ShieldAlert, 
  FileText, 
  ExternalLink, 
  CheckCircle2,
  Lock,
  Cloud,
  FileSearch
} from "lucide-react"
import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { rotateIngestKey } from "./actions"
import Link from "next/link"

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [rotating, setRotating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [origin, setOrigin] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

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
        description: "Raw key copied to clipboard. Store it securely in your .env as ATLASBURN_KEY.",
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

  if (!mounted) return null;

  return (
    <SidebarProvider suppressHydrationWarning>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Institutional Controls</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          <Tabs defaultValue="sdk" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 w-full flex justify-start overflow-x-auto scrollbar-hide h-auto">
              <TabsTrigger value="sdk" className="gap-2 shrink-0 py-2"><Terminal size={14} /> SDK Ingestion</TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 shrink-0 py-2"><CreditCard size={14} /> Billing & Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="sdk" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b">
                      <CardTitle className="text-xl font-headline flex items-center gap-2 text-primary">
                        <Zap size={20} /> Forensic SDK
                      </CardTitle>
                      <CardDescription>Connect other products to this control plane for unified burn visibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Global Project ID</p>
                          <Button variant="ghost" size="sm" onClick={copyProjectId} className="h-6 gap-1 text-[10px] font-bold uppercase">
                            {copiedId ? <CheckCircle2 size={12} className="text-green-600" /> : <Copy size={12} />}
                            {copiedId ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <div className="bg-zinc-950 text-zinc-50 p-4 rounded-xl font-mono text-xs flex justify-between items-center">
                          <span className="opacity-70">projectId:</span>
                          <span className="text-primary-foreground font-bold">{user?.uid || 'ID_NOT_FOUND'}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Cross-Product Ingest URL</p>
                        <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed border-l-4 border-primary">
{`import { withAtlasBurn } from "@atlasburn/sdk";
const client = withAtlasBurn(llm, {
  apiKey: process.env.ATLASBURN_KEY,
  projectId: "${user?.uid || 'PROJECT_ID'}",
  ingestUrl: "${origin}/api/ingest" 
});`}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
