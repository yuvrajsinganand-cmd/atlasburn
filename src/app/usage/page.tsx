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
  FlaskConical,
  Server,
  Layers,
  Cpu
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
        label: "Verified Online", 
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
      batch.set(newKeyRef, {
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
      console.error("Key Generation Error:", e);
      toast({ variant: "destructive", title: "Generation Failed", description: "Could not initialize forensic key." });
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
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
          <Badge variant="outline" className={cn(connectionStatus.color, "border-none gap-2 px-3 py-1 uppercase text-[10px] font-bold tracking-widest transition-all duration-500 shadow-sm")}>
            <StatusIcon size={12} className={loadingStatus ? "animate-spin" : ""} />
            Feed: {connectionStatus.label}
          </Badge>
        </header>

        <main className="p-6 space-y-12 max-w-4xl mx-auto w-full pb-24">
          <div className="space-y-3">
            <h2 className="text-4xl font-headline font-bold">Institutional Onboarding</h2>
            <p className="text-muted-foreground text-lg">Connect your production cluster to the AtlasBurn forensic cloud in 2 steps.</p>
          </div>

          <div className="space-y-12">
            {/* STEP 1: KEY */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-primary/5 border-b py-6">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary h-8 w-8 rounded-full flex items-center justify-center p-0 font-bold text-sm">1</Badge>
                  <div>
                    <CardTitle className="text-xl font-headline">Generate Institutional Key</CardTitle>
                    <CardDescription>Create a unique API key to authenticate your telemetry flushes.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {!apiKey ? (
                  <Button 
                    onClick={handleGenerateKey} 
                    disabled={generatingKey} 
                    size="lg" 
                    className="h-14 px-8 font-headline font-bold shadow-xl"
                  >
                    {generatingKey ? <Loader2 className="animate-spin mr-2" /> : <Key className="mr-2" />}
                    Get API Key
                  </Button>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative p-8 bg-zinc-950 rounded-[2.5rem] border border-primary/20 shadow-[0_0_40px_-10px_rgba(139,92,246,0.4)]">
                      <div className="flex items-center justify-between gap-8">
                        <code className="text-primary-foreground font-mono text-xl break-all">
                          {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}
                        </code>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)} className="text-zinc-400 hover:text-primary h-12 w-12"><Eye size={24} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKey!)} className="text-zinc-400 hover:text-primary h-12 w-12"><Copy size={24} /></Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-5 bg-amber-50 rounded-2xl border border-amber-200">
                      <ShieldAlert size={20} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-900 font-semibold leading-relaxed">
                        Save this key in your .env file immediately. For security integrity, only hashed versions are stored in our control plane.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* STEP 2: IMPLEMENTATION */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-muted/30 border-b py-6">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-background h-8 w-8 rounded-full flex items-center justify-center p-0 font-bold border-muted-foreground/30 text-sm">2</Badge>
                  <div>
                    <CardTitle className="text-xl font-headline">Implementation Authority</CardTitle>
                    <CardDescription>Select your integration style. Choose between Reliable Wrapper or Zero-Config Auto-Detect.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Installation</p>
                  <div className="bg-zinc-900 p-5 rounded-xl flex items-center justify-between group">
                    <code className="text-primary-foreground font-mono text-sm">npm install @atlasburn/sdk@latest</code>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard("npm install @atlasburn/sdk")} className="text-zinc-500 group-hover:text-primary"><Copy size={16} /></Button>
                  </div>
                </div>

                <Tabs defaultValue="wrapper" className="space-y-6">
                  <TabsList className="bg-muted/50 p-1 w-full grid grid-cols-2 h-14 rounded-2xl border">
                    <TabsTrigger 
                      value="wrapper" 
                      className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)] font-bold text-xs gap-2 group transition-all"
                    >
                      <Layers size={14} className="group-data-[state=active]:animate-pulse" /> Reliable Wrapper (Stable)
                    </TabsTrigger>
                    <TabsTrigger 
                      value="auto" 
                      className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)] font-bold text-xs gap-2 group transition-all"
                    >
                      <FlaskConical size={14} className="group-data-[state=active]:animate-pulse" /> Auto-Detect Mode (Exp.)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="wrapper" className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-primary tracking-widest">
                      <ShieldCheck size={12} /> Institutional Standard
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Wrap your existing OpenAI, Anthropic, or LangChain clients. This method provides the highest fidelity for feature-level attribution.
                    </p>
                    <pre className="p-6 bg-zinc-950 text-zinc-300 rounded-2xl font-mono text-xs overflow-x-auto border-l-4 border-primary leading-relaxed shadow-xl">
{`import { withAtlasBurn } from "@atlasburn/sdk";
import OpenAI from "openai";

const openai = withAtlasBurn(new OpenAI(), {
  apiKey: process.env.ATLASBURN_KEY
});

// Use as normal
const chat = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }]
});`}
                    </pre>
                  </TabsContent>

                  <TabsContent value="auto" className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-accent tracking-widest">
                      <Zap size={12} className="animate-pulse" /> Zero-Config Pulse
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Initialize once at your entry point. Automatically intercepts and monitors OpenAI, Anthropic, and Gemini SDK calls via global fetch interception.
                    </p>
                    <pre className="p-6 bg-zinc-950 text-zinc-300 rounded-2xl font-mono text-xs overflow-x-auto border-l-4 border-accent leading-relaxed shadow-xl">
{`import { initAtlasBurnAuto } from "@atlasburn/sdk";

// Call this once at the very top of your application
initAtlasBurnAuto({
  apiKey: process.env.ATLASBURN_KEY,
  metadata: {
    userTier: "enterprise" // Optional default metadata
  }
});`}
                    </pre>
                  </TabsContent>
                </Tabs>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-green-600 tracking-widest">
                    <ShieldCheck size={12} /> Verification Utility
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Instantly confirm your SDK is linked to the forensic cloud by running the verification command.
                  </p>
                  <pre className="p-6 bg-zinc-900 text-zinc-400 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border border-zinc-800">
{`import { verifyAtlasBurn } from "@atlasburn/sdk";

// Call this to confirm connection
await verifyAtlasBurn({
  apiKey: process.env.ATLASBURN_KEY,
  debug: true 
});`}
                  </pre>
                </div>

                <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Activity size={16} className="text-primary" />
                  <p className="text-xs text-muted-foreground italic leading-tight">
                    <span className="font-bold">Operational Safety:</span> Ingestion is strictly non-blocking and flushes in the background to ensure zero impact on your application's latency.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* STATUS MONITOR */}
            <Card className={cn(
              "border-2 shadow-2xl overflow-hidden transition-all duration-700",
              lastUsage?.length ? 'border-green-500/50 bg-green-50/10' : 'border-primary/20 bg-primary/5'
            )}>
              <CardHeader className="border-b bg-white/50 py-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Activity className={cn("text-primary", !lastUsage?.length && "animate-pulse")} />
                    <CardTitle className="text-xl font-headline">Verification Center</CardTitle>
                  </div>
                  {lastUsage?.length ? (
                    <Badge className="bg-green-600 text-white font-bold gap-1 px-4 py-1"><CheckCircle2 size={14} /> SYSTEM LINKED</Badge>
                  ) : (
                    <Badge variant="outline" className="animate-pulse bg-white font-bold px-4 py-1">LISTENING FOR PULSE...</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-12 text-center space-y-8">
                <div className={cn(
                  "mx-auto p-10 rounded-[3rem] w-fit transition-all duration-700 transform",
                  lastUsage?.length ? 'bg-green-100 text-green-600 scale-110 rotate-0' : 'bg-primary/10 text-primary hover:scale-105'
                )}>
                  {lastUsage?.length ? <CheckCircle2 size={80} /> : <Server size={80} className="animate-pulse" />}
                </div>
                <div className="space-y-3 max-w-md mx-auto">
                  <h3 className="font-headline font-bold text-2xl">{lastUsage?.length ? "Connection Established" : "Awaiting First Heartbeat"}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {lastUsage?.length 
                      ? "Telemetry is streaming flawlessly to the forensic control plane. Your dashboard is now live." 
                      : "Send a test request through your integrated client or use verifyAtlasBurn(). AtlasBurn will automatically detect the telemetry flush."}
                  </p>
                </div>
                {lastUsage?.length && (
                  <Button asChild size="lg" className="h-14 px-10 font-headline font-bold shadow-2xl rounded-full">
                    <Link href="/">Enter Command Dashboard <ChevronRight className="ml-2" /></Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
