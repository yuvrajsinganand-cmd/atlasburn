
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

  useEffect(() => {
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

  const handlePlaceholderAction = (action: string) => {
    toast({
      title: "Action Restricted",
      description: `${action} requires elevated Finance or Owner permissions and a verified audit window.`,
    });
  };

  return (
    <SidebarProvider>
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
              <TabsTrigger value="domains" className="gap-2 shrink-0 py-2"><Globe size={14} /> Domains & Assets</TabsTrigger>
              <TabsTrigger value="misc" className="gap-2 shrink-0 py-2"><FileSearch size={14} /> Legal & Misc</TabsTrigger>
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
                        <div className="bg-zinc-950 text-zinc-50 p-4 rounded-xl font-mono text-xs flex justify-between items-center group">
                          <span className="opacity-70">projectId:</span>
                          <span className="text-primary-foreground font-bold">{user?.uid || 'ID_NOT_FOUND'}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Cross-Product Ingest URL</p>
                        <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed border-l-4 border-primary">
{`import { withSleek } from "./sleek-sdk";
const client = withSleek(llm, {
  apiKey: process.env.SLEEK_INGEST_KEY,
  projectId: "${user?.uid || 'PROJECT_ID'}",
  ingestUrl: "${origin}/api/ingest" 
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
                       <Card key={sub.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase text-primary">{sub.customName || sub.name}</p>
                            <Badge variant="outline" className="text-[9px] font-bold bg-muted/50 border-none">HMAC-SHA256 VERIFIED</Badge>
                          </div>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="font-headline font-bold text-[10px]"
                            disabled={rotating === sub.id}
                            onClick={() => handleRotate(sub.id)}
                          >
                            {rotating === sub.id ? <Loader2 className="animate-spin mr-2" size={12} /> : <RefreshCw size={12} className="mr-2" />}
                            ROTATE KEY
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-primary text-primary-foreground p-6 space-y-4">
                    <div className="p-3 bg-white/10 rounded-2xl text-white w-fit"><ShieldCheck size={24} /></div>
                    <h3 className="font-headline font-bold text-lg">Central Authority</h3>
                    <p className="text-sm opacity-90 italic">"One Control Plane, Multiple Apps. AtlasBurn acts as the authoritative financial ledger for your entire AI portfolio."</p>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="font-headline text-lg flex items-center gap-2">
                    <CreditCard className="text-primary" size={20} /> Billing & Expenditure Authority
                  </CardTitle>
                  <CardDescription>Manage forensic ledger access and spend permissions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 border border-dashed rounded-2xl flex flex-col items-center text-center space-y-4">
                    <Lock className="text-muted-foreground" size={40} />
                    <div className="space-y-1">
                      <p className="font-bold">Access Control</p>
                      <p className="text-sm text-muted-foreground max-w-sm">Only users with 'Finance' or 'Owner' roles can modify capital reserves and spending guardrails.</p>
                    </div>
                    <Button variant="outline" className="font-headline font-bold" onClick={() => handlePlaceholderAction("Permission Management")}>
                      Manage Permissions
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Current Plan</p>
                        <p className="text-sm font-bold">Institutional Scale</p>
                      </div>
                      <Badge className="bg-primary">ACTIVE</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="domains" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                      <Globe className="text-primary" size={20} /> Whitelisted Domains
                    </CardTitle>
                    <CardDescription>Authorize external origins for SDK forensic reporting.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between text-xs font-mono">
                        <span>*.atlasburn.com</span>
                        <Badge variant="outline" className="text-[9px]">SYSTEM</Badge>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg flex items-center justify-between text-xs font-mono text-muted-foreground italic">
                        <span>Awaiting custom domains...</span>
                      </div>
                    </div>
                    <Button className="w-full font-headline font-bold" onClick={() => handlePlaceholderAction("Domain Addition")}>
                      Add Domain Origin
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                      <Cloud className="text-primary" size={20} /> Forensic Assets
                    </CardTitle>
                    <CardDescription>Manage static forensic assets and training metadata.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                    <div className="p-4 bg-primary/5 rounded-full text-primary"><Database size={32} /></div>
                    <p className="text-xs text-muted-foreground max-w-[200px]">Asset storage is currently optimized for institutional ledgers.</p>
                    <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase" onClick={() => handlePlaceholderAction("CDN Asset Configuration")}>
                      Configure CDN Assets
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="misc" className="space-y-6">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="font-headline text-lg flex items-center gap-2">
                    <ShieldAlert className="text-primary" size={20} /> Legal & Compliance
                  </CardTitle>
                  <CardDescription>View our legal framework and institutional service agreements.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button asChild variant="outline" className="h-24 flex flex-col items-center justify-center gap-1 group border-muted/50 hover:border-primary">
                    <Link href="https://www.atlasburn.com/privacy" target="_blank">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-primary" />
                        <span className="font-headline font-bold text-lg">Privacy Policy</span>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Forensic Data Handling</p>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="h-24 flex flex-col items-center justify-center gap-1 group border-muted/50 hover:border-primary">
                    <Link href="https://www.atlasburn.com/terms" target="_blank">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-primary" />
                        <span className="font-headline font-bold text-lg">Terms of Service</span>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Service Level Agreement</p>
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700">
                <ShieldAlert size={16} className="shrink-0" />
                <p className="text-xs font-medium">Any changes to institutional legal settings require a 48-hour audit window before propagation.</p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
