
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Key, 
  ShieldCheck, 
  RefreshCw, 
  Loader2, 
  Copy, 
  Terminal, 
  Zap, 
  Globe, 
  CreditCard, 
  ShieldAlert, 
  FileText, 
  CheckCircle2,
  Lock,
  User,
  Users,
  Building,
  Mail,
  Shield,
  ExternalLink,
  Plus
} from "lucide-react"
import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { rotateIngestKey } from "./actions"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

  const orgRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "organizations", `org_${user.uid}`);
  }, [firestore, user]);
  const { data: organization } = useDoc(orgRef);

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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 text-[10px] font-bold px-3 py-1">
              <ShieldCheck size={12} /> VERIFIED IDENTITY
            </Badge>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          <Tabs defaultValue="sdk" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 w-full flex justify-start overflow-x-auto scrollbar-hide h-auto gap-1">
              <TabsTrigger value="sdk" className="gap-2 shrink-0 py-2"><Terminal size={14} /> SDK Ingestion</TabsTrigger>
              <TabsTrigger value="account" className="gap-2 shrink-0 py-2"><User size={14} /> Account</TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 shrink-0 py-2"><CreditCard size={14} /> Billing & Access</TabsTrigger>
              <TabsTrigger value="domains" className="gap-2 shrink-0 py-2"><Globe size={14} /> Domains</TabsTrigger>
              <TabsTrigger value="legal" className="gap-2 shrink-0 py-2"><FileText size={14} /> Legal</TabsTrigger>
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
                <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ingest Health</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-green-600" />
                          <span className="text-xs font-bold text-green-700">Service Online</span>
                        </div>
                        <span className="text-[10px] font-mono text-green-600">v1.8.2</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                      <User size={18} className="text-primary" /> Identity Profile
                    </CardTitle>
                    <CardDescription>Manage your institutional credentials.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</Label>
                      <Input placeholder="Lead Founder" defaultValue={user?.displayName || ""} className="bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <Input disabled value={user?.email || ""} className="pl-10 bg-muted/10 opacity-70" />
                      </div>
                    </div>
                    <Button className="w-full font-headline font-bold">Update Profile</Button>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                      <Building size={18} className="text-primary" /> Organization Settings
                    </CardTitle>
                    <CardDescription>Configure organizational metadata.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Organization Name</Label>
                      <Input placeholder="Acme AI Corp" defaultValue={organization?.name || ""} className="bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Industry Vertical</Label>
                      <Input placeholder="SaaS / Infrastructure" className="bg-muted/20" />
                    </div>
                    <Button variant="outline" className="w-full font-headline font-bold">Save Organization Details</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-none shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <Users size={18} className="text-primary" /> Institutional Permissions
                      </CardTitle>
                      <CardDescription>Manage user access and roles for this organization.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">User</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">Role</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{user?.displayName || "Lead User"}</span>
                                <span className="text-[10px] text-muted-foreground">{user?.email}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold">OWNER</Badge></TableCell>
                            <TableCell><Badge className="bg-green-100 text-green-700 text-[10px] border-none font-bold">ACTIVE</Badge></TableCell>
                            <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-[10px] font-bold">MANAGE</Button></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <div className="p-4 border-t text-center">
                        <Button variant="outline" size="sm" className="gap-2 font-bold"><Plus size={14} /> Invite Institutional User</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80 flex items-center gap-2">
                        <CreditCard size={14} /> Current Tier
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-1">
                        <p className="text-2xl font-headline font-bold">Institutional</p>
                        <p className="text-[10px] opacity-70">Up to 10M events / month</p>
                      </div>
                      <Separator className="bg-white/10" />
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span>Usage Limit</span>
                          <span>{((organization?.totalEvents || 0) / 100000).toFixed(1)}%</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white w-[1%]" />
                        </div>
                      </div>
                      <Button variant="secondary" className="w-full font-bold">Manage Billing</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="domains" className="space-y-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Globe size={18} className="text-primary" /> Ingestion Whitelist
                  </CardTitle>
                  <CardDescription>Restrict forensic ingestion to specific domains for enhanced security.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="e.g. api.acme-ai.com" className="bg-muted/20" />
                      <Button className="font-bold shrink-0">Add Domain</Button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Active Domains</p>
                      <div className="border rounded-xl divide-y">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="text-green-600" size={14} />
                            <span className="text-sm font-mono">{origin.replace(/https?:\/\//, '')}</span>
                            <Badge variant="outline" className="text-[9px] font-bold">DEFAULT</Badge>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-none text-[9px]">SECURE</Badge>
                        </div>
                        <div className="p-4 flex items-center justify-between text-muted-foreground italic">
                          <span className="text-xs">No additional domains configured.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="legal" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2 text-primary">
                      <FileText size={18} /> Terms of Service
                    </CardTitle>
                    <CardDescription>Review the institutional service agreement (v2.4).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Our terms govern the usage of the AtlasBurn Forensic SDK and Control Plane. By connecting your infrastructure, you agree to our automated burn auditing and capital risk modeling methodologies.
                    </p>
                    <Button variant="link" asChild className="p-0 h-auto text-primary font-bold mt-4 text-xs">
                      <a href="https://www.atlasburn.com/terms" target="_blank" rel="noopener noreferrer">
                        Read Full Terms <ExternalLink size={10} className="ml-1" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2 text-primary">
                      <Lock size={18} /> Privacy & Data Policy
                    </CardTitle>
                    <CardDescription>Forensic data handling and retention protocols.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      AtlasBurn encrypts all forensic metadata. We do not store raw LLM prompts or outputs—only token counts, model identifiers, and stochastic performance metrics for margin analysis.
                    </p>
                    <Button variant="link" asChild className="p-0 h-auto text-primary font-bold mt-4 text-xs">
                      <a href="https://www.atlasburn.com/privacy" target="_blank" rel="noopener noreferrer">
                        Review Data Policy <ExternalLink size={10} className="ml-1" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
