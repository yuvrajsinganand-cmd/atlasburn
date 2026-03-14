
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Terminal, 
  ShieldCheck, 
  Key, 
  Globe, 
  Lock, 
  Cpu, 
  Server, 
  Copy, 
  CheckCircle2, 
  Package, 
  Activity, 
  Loader2, 
  ChevronRight,
  Code2,
  Settings2,
  Zap,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, getDocs, where, doc, updateDoc, addDoc, writeBatch } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { getKeyMaterial } from "@/app/settings/actions"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function OnboardingPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [mounted, setMounted] = useState(false)
  
  // State for Step 1
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  
  // State for Step 2
  const [copiedInstall, setCopiedInstall] = useState(false)
  
  useEffect(() => {
    setMounted(true)
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
      // 1. Get secure material from server
      const material = await getKeyMaterial();
      
      // 2. Perform Firestore operations on client (where authenticated)
      const subId = "default_production_ingest";
      const keysCol = collection(firestore, 'users', user.uid, 'aiSubscriptions', subId, 'ingestKeys');
      
      // Revoke existing active keys
      const activeKeysQuery = query(keysCol, where('status', '==', 'active'));
      const activeSnap = await getDocs(activeKeysQuery);
      
      const batch = writeBatch(firestore);
      activeSnap.docs.forEach(kDoc => {
        batch.update(kDoc.ref, { status: 'revoked', revokedAt: new Date().toISOString() });
      });
      
      // Create new key doc
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
      setShowKey(true);
      toast({ title: "API Key Generated", description: "Save this key in your .env file immediately." });
    } catch (e: any) {
      console.error("Key Generation Error:", e);
      toast({ variant: "destructive", title: "Generation Failed", description: "Could not initialize forensic key. Check network permissions." });
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  if (!mounted) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.atlasburn.com';
  const projectId = user?.uid || 'YOUR_PROJECT_ID';
  const ingestUrl = `${origin}/api/ingest`;

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
          <div className="flex items-center gap-3">
             <Badge variant="outline" className={`${connectionStatus.color} border-none gap-2 px-3 py-1 uppercase text-[10px] font-bold tracking-widest transition-all duration-500 shadow-sm`}>
                <StatusIcon size={12} className={loadingStatus ? "animate-spin" : ""} />
                Feed: {connectionStatus.label}
              </Badge>
          </div>
        </header>

        <main className="p-6 space-y-8 max-w-4xl mx-auto w-full pb-24">
          <div className="space-y-2">
            <h2 className="text-3xl font-headline font-bold">Onboarding: Production Ingestion</h2>
            <p className="text-muted-foreground">Follow these steps to connect your application to the AtlasBurn Forensic Command plane.</p>
          </div>

          {/* STEP 1: GENERATE API KEY */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold">1</Badge>
                  <CardTitle className="text-lg font-headline">Generate AtlasBurn API Key</CardTitle>
                </div>
                <CardDescription>Create an API key to authenticate telemetry ingestion from your application.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={handleGenerateKey} 
                  disabled={generatingKey} 
                  variant={apiKey ? "outline" : "default"}
                  size="lg" 
                  className={cn("font-headline font-bold w-fit", !apiKey && "shadow-lg")}
                >
                  {generatingKey ? <Loader2 className="animate-spin mr-2" /> : <Key className="mr-2" />}
                  {apiKey ? "Generate New Key" : "Get API Key"}
                </Button>

                {apiKey && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative group p-6 bg-zinc-950 rounded-[2rem] border border-primary/20 shadow-[0_0_30px_-10px_rgba(139,92,246,0.3)] transition-all overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                      <div className="relative z-10 space-y-3">
                        <p className="text-[10px] font-bold uppercase text-primary tracking-[0.2em]">Institutional Private Key</p>
                        <div className="flex items-center justify-between gap-6">
                          <code className="text-primary-foreground font-mono text-lg break-all selection:bg-primary/30">
                            {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}
                          </code>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setShowKey(!showKey)} 
                              className="text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10"
                            >
                              {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => copyToClipboard(apiKey, (v) => {})} 
                              className="text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10"
                            >
                              <Copy size={20} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                      <Zap size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-200/80 leading-relaxed font-medium">
                        Save this key in your <strong>.env</strong> file immediately. For security integrity, it will not be displayed again once you refresh this terminal.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: INSTALL SDK */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-background h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold border-muted-foreground/30">2</Badge>
                <CardTitle className="text-lg font-headline">Install Institutional SDK</CardTitle>
              </div>
              <CardDescription>Install the AtlasBurn Forensic SDK used to capture and stream AI usage telemetry.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="relative group">
                <pre className="p-5 bg-zinc-950 text-zinc-300 rounded-xl font-mono text-sm border border-zinc-800 overflow-x-auto">
                  <code>npm install @atlasburn/sdk</code>
                </pre>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard("npm install @atlasburn/sdk", setCopiedInstall)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {copiedInstall ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* STEP 3: CONFIGURE ENV */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-background h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold border-muted-foreground/30">3</Badge>
                <CardTitle className="text-lg font-headline">Environment Configuration</CardTitle>
              </div>
              <CardDescription>Create a .env file and add the following values to your project root.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <pre className="p-5 bg-zinc-950 text-primary/70 rounded-xl font-mono text-xs leading-relaxed border border-zinc-800">
{`ATLASBURN_KEY=${apiKey || 'your_atlasburn_key'}
ATLASBURN_PROJECT_ID=${projectId}
ATLASBURN_INGEST_URL=${ingestUrl}
OPENAI_API_KEY=your_openai_key`}
              </pre>
              <p className="text-[10px] text-muted-foreground italic">Note: Your projectId is automatically generated when your project is created.</p>
            </CardContent>
          </Card>

          {/* STEP 4: CONFIGURE BRIDGE */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-background h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold border-muted-foreground/30">4</Badge>
                <CardTitle className="text-lg font-headline">Configure Forensic Bridge</CardTitle>
              </div>
              <CardDescription>Wrap your existing LLM client to automatically stream usage telemetry.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <pre className="p-5 bg-zinc-950 text-zinc-400 rounded-xl font-mono text-[11px] leading-relaxed border border-zinc-800 overflow-x-auto">
{`import { withAtlasBurn } from "@atlasburn/sdk";
import OpenAI from "openai";

const openai = withAtlasBurn(new OpenAI(), {
  apiKey: process.env.ATLASBURN_KEY,
  projectId: "${projectId}",
  ingestUrl: "${ingestUrl}"
});`}
              </pre>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-primary">
                <ShieldCheck size={12} />
                <span>Non-blocking background ingestion active</span>
              </div>
            </CardContent>
          </Card>

          {/* STEP 5: VERIFY */}
          <Card className={`border-2 shadow-xl overflow-hidden transition-all duration-500 ${lastUsage?.length ? 'border-green-500/50 bg-green-50/10' : 'border-primary/20 bg-primary/5'}`}>
            <CardHeader className="border-b bg-white/50 backdrop-blur">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge className={`${lastUsage?.length ? 'bg-green-600' : 'bg-primary'} h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold`}>5</Badge>
                  <CardTitle className="text-lg font-headline">Verify Telemetry</CardTitle>
                </div>
                {lastUsage?.length ? (
                  <Badge className="bg-green-600 text-white font-bold gap-1"><CheckCircle2 size={12} /> VERIFIED</Badge>
                ) : (
                  <Badge variant="outline" className="animate-pulse bg-white">WAITING FOR DATA...</Badge>
                )}
              </div>
              <CardDescription>Send a test request through your LLM client to confirm the connection.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className={`p-6 rounded-[2rem] transition-all duration-700 ${lastUsage?.length ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                  {lastUsage?.length ? <CheckCircle2 size={64} /> : <RefreshCw size={64} className="animate-spin-slow" />}
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="font-headline font-bold text-xl">
                    {lastUsage?.length ? "Connection Established" : "Listening for Telemetry"}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {lastUsage?.length 
                      ? "Your production cluster is now streaming forensic data. AtlasBurn is building your capital risk model." 
                      : "Once your first request runs successfully, AtlasBurn will begin displaying token usage, cost analytics, and risk signals."}
                  </p>
                </div>
                {lastUsage?.length && (
                  <Button asChild size="lg" className="font-headline font-bold shadow-xl">
                    <Link href="/">Enter Command Dashboard <ChevronRight className="ml-2" /></Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
