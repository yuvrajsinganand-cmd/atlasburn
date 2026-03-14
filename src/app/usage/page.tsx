
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Terminal, 
  ShieldCheck, 
  Key, 
  Copy, 
  CheckCircle2, 
  Activity, 
  Loader2, 
  ChevronRight,
  Zap,
  Eye,
  EyeOff,
  ShieldAlert,
  FlaskConical
} from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, getDocs, where, doc, writeBatch } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect, useMemo } from "react"
import { getKeyMaterial } from "@/app/settings/actions"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function OnboardingPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [mounted, setMounted] = useState(false)
  
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  
  const [copiedInstall, setCopiedInstall] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    const cachedKey = localStorage.getItem('atlasburn_session_key');
    if (cachedKey) {
      setApiKey(cachedKey);
    }
  }, [])

  const usageQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
  }, [firestore, user]);

  const { data: lastUsage, isLoading: loadingStatus } = useCollection(usageQuery);

  const connectionStatus = useMemo(() => {
    if (loadingStatus) return { label: "Scanning...", color: "bg-muted text-muted-foreground", icon: Loader2 };
    if (lastUsage && lastUsage.length > 0) {
      return { 
        label: "Verified", 
        color: "bg-green-600 text-white", 
        icon: ShieldCheck, 
        lastTime: new Date(lastUsage[0].timestamp).toLocaleTimeString() 
      };
    }
    return { label: "Awaiting Heartbeat", color: "bg-amber-500 text-white", icon: Activity };
  }, [lastUsage, loadingStatus]);

  const handleGenerateKey = async () => {
    if (!user || !firestore) return;
    setGeneratingKey(true);
    try {
      const material = await getKeyMaterial();
      const subId = "default_production_ingest";
      const keysCol = collection(firestore, 'users', user.uid, 'aiSubscriptions', subId, 'ingestKeys');
      
      const activeKeysQuery = query(keysCol, where('status', '==', 'active'));
      const activeSnap = await getDocs(activeKeysQuery);
      
      const batch = writeBatch(firestore);
      activeSnap.docs.forEach(kDoc => {
        batch.update(kDoc.ref, { status: 'revoked', revokedAt: new Date().toISOString() });
      });
      
      const newKeyRef = doc(keysCol);
      batch.set(newRecordRef, {
        hash: material.hash,
        prefix: material.prefix,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUsedAt: null
      });
      
      await batch.commit();

      setApiKey(material.rawKey);
      localStorage.setItem('atlasburn_session_key', material.rawKey);
      setShowKey(true);
      toast({ title: "API Key Generated", description: "Save this key in your .env file immediately." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: "Could not initialize forensic key." });
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  if (!mounted) return null;

  const StatusIcon = connectionStatus.icon;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background/50">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Integration Protocol</h1>
          </div>
          <Badge variant="outline" className={`${connectionStatus.color} border-none gap-2 px-3 py-1 uppercase text-[10px] font-bold tracking-widest transition-all duration-500 shadow-sm`}>
            <StatusIcon size={12} className={loadingStatus ? "animate-spin" : ""} />
            Feed: {connectionStatus.label}
          </Badge>
        </header>

        <main className="p-6 space-y-8 max-w-4xl mx-auto w-full pb-24">
          <div className="space-y-2">
            <h2 className="text-3xl font-headline font-bold">2-Step Quick Integration</h2>
            <p className="text-muted-foreground">Follow these steps to connect AtlasBurn to your production AI cluster in under 2 minutes.</p>
          </div>

          <Tabs defaultValue="recommended" className="space-y-8">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="recommended" className="gap-2"><Zap size={14} /> Recommended (Wrapper)</TabsTrigger>
              <TabsTrigger value="auto" className="gap-2"><FlaskConical size={14} /> Experimental (Auto-Detect)</TabsTrigger>
            </TabsList>

            <TabsContent value="recommended" className="space-y-8">
              {/* STEP 1: KEY */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-primary/5 border-b">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold text-[10px]">1</Badge>
                    <CardTitle className="text-lg font-headline">Generate AtlasBurn API Key</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <Button 
                    onClick={handleGenerateKey} 
                    disabled={generatingKey} 
                    size="lg" 
                    className="font-headline font-bold shadow-lg"
                  >
                    {generatingKey ? <Loader2 className="animate-spin mr-2" /> : <Key className="mr-2" />}
                    Get API Key
                  </Button>

                  {apiKey && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="relative p-6 bg-zinc-950 rounded-[2rem] border border-primary/20 shadow-[0_0_30px_-10px_rgba(139,92,246,0.3)]">
                        <div className="flex items-center justify-between gap-6">
                          <code className="text-primary-foreground font-mono text-lg break-all">
                            {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}
                          </code>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)} className="text-zinc-400 hover:text-primary"><Eye size={20} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKey!, (v) => {})} className="text-zinc-400 hover:text-primary"><Copy size={20} /></Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                        <Zap size={16} className="text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-900 font-semibold">Save this key in your .env file immediately.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* STEP 2: WRAP */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold border-muted-foreground/30 text-[10px]">2</Badge>
                    <CardTitle className="text-lg font-headline">Wrap Your Client</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <pre className="p-5 bg-zinc-950 text-zinc-300 rounded-xl font-mono text-xs overflow-x-auto border-l-4 border-primary">
{`import { withAtlasBurn } from "@atlasburn/sdk";
import OpenAI from "openai";

const openai = withAtlasBurn(new OpenAI(), {
  apiKey: process.env.ATLASBURN_KEY
});`}
                  </pre>
                  <p className="text-[10px] text-muted-foreground italic">Note: projectId and ingestUrl are now resolved automatically.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="auto" className="space-y-8">
              <Card className="border-none shadow-sm overflow-hidden border-amber-200 bg-amber-50/20">
                <CardHeader className="border-b bg-amber-50/50">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-600 text-white border-none font-bold text-[10px]">BETA</Badge>
                    <CardTitle className="text-lg font-headline">One-Line Auto Detection</CardTitle>
                  </div>
                  <CardDescription>Automatically detects and monitors OpenAI, Anthropic, and Gemini SDKs with zero wrapping.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Add this to your entry file (main.ts, index.ts, or layout.tsx):</p>
                    <pre className="p-5 bg-zinc-950 text-amber-200/70 rounded-xl font-mono text-xs border-l-4 border-amber-600">
{`import { initAtlasBurnAuto } from "@atlasburn/sdk";

initAtlasBurnAuto({
  apiKey: process.env.ATLASBURN_KEY
});`}
                    </pre>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-amber-100 flex items-start gap-3">
                    <ShieldAlert size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-900 leading-relaxed italic">
                      Experimental mode uses global fetch interception. Use the recommended Wrapper mode if you need strictly deterministic feature attribution.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* VERIFY */}
          <Card className={`border-2 shadow-xl overflow-hidden transition-all duration-500 ${lastUsage?.length ? 'border-green-500/50 bg-green-50/10' : 'border-primary/20 bg-primary/5'}`}>
            <CardHeader className="border-b bg-white/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-headline">Verify Telemetry</CardTitle>
                {lastUsage?.length ? (
                  <Badge className="bg-green-600 text-white font-bold gap-1"><CheckCircle2 size={12} /> VERIFIED</Badge>
                ) : (
                  <Badge variant="outline" className="animate-pulse bg-white">LISTENING...</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8 text-center space-y-6">
              <div className={`mx-auto p-6 rounded-[2rem] w-fit ${lastUsage?.length ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                {lastUsage?.length ? <CheckCircle2 size={64} /> : <Activity size={64} className="animate-pulse" />}
              </div>
              <div className="space-y-2">
                <h3 className="font-headline font-bold text-xl">{lastUsage?.length ? "Connection Established" : "Awaiting First Heartbeat"}</h3>
                <p className="text-sm text-muted-foreground">Send a test request through your AI client to confirm the connection.</p>
              </div>
              {lastUsage?.length && (
                <Button asChild size="lg" className="font-headline font-bold shadow-xl">
                  <Link href="/">Enter Command Dashboard <ChevronRight className="ml-2" /></Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
