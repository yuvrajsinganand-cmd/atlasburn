
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
  FileText, 
  CheckCircle2,
  User,
  Users,
  Building,
  Mail,
  Shield,
  Plus,
  AlertTriangle,
  Save,
  Trash2,
  Clock,
  Info,
  ShieldAlert,
  UserPlus,
  History,
  ShieldX,
  Smartphone,
  Cpu,
  Lock,
  Layers
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useUser, useFirestore, useMemoFirebase, useDoc, useAuth, useCollection } from "@/firebase"
import { doc, collection, query, orderBy, limit } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { updateProfile } from "firebase/auth"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type SdkProjectSnapshot } from "@/types/sdk"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { verifyDomainDns } from "./actions"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SettingsPage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const [snapshot, setSnapshot] = useState<SdkProjectSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [origin, setOrigin] = useState("");
  const [mounted, setMounted] = useState(false);

  // Account State
  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);

  // Domain State
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  // Invite State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
    }
  }, [user]);

  const orgRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "organizations", `org_${user.uid}`);
  }, [firestore, user]);
  
  const { data: organization } = useDoc(orgRef);

  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "organizations", `org_${user.uid}`, "users"));
  }, [firestore, user]);
  const { data: members } = useCollection(membersQuery);

  const auditLogsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "organizations", `org_${user.uid}`, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(100)
    );
  }, [firestore, user]);
  const { data: auditLogs, isLoading: loadingLogs } = useCollection(auditLogsQuery);

  const auditSummary = useMemo(() => {
    if (!auditLogs) return { failedDns: 0, accessActions: 0, billingActions: 0, securityActions: 0 };
    return {
      failedDns: auditLogs.filter(l => l.action === 'DNS_VERIFICATION_FAILED').length,
      accessActions: auditLogs.filter(l => l.category === 'access').length,
      billingActions: auditLogs.filter(l => l.category === 'billing').length,
      securityActions: auditLogs.filter(l => l.category === 'security').length,
    };
  }, [auditLogs]);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || "");
    }
  }, [organization]);

  useEffect(() => {
    async function fetchSnapshot() {
      if (!user) return;
      try {
        const res = await fetch(`/api/projects/${user.uid}/snapshot?windowDays=30`);
        const data = await res.json();
        setSnapshot(data);
      } catch (e) {
        console.error("Failed to fetch forensic snapshot", e);
      } finally {
        setLoadingSnapshot(false);
      }
    }
    if (user) fetchSnapshot();
  }, [user]);

  const getFingerprint = () => {
    if (typeof navigator === 'undefined') return 'unknown';
    const str = navigator.userAgent;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; 
    }
    return Math.abs(hash).toString(16).toUpperCase();
  };

  const logAction = (action: string, details: string, category: 'admin' | 'security' | 'billing' | 'access' = 'admin', status: 'success' | 'failure' = 'success') => {
    if (!firestore || !user) return;
    const auditRef = collection(firestore, "organizations", `org_${user.uid}`, "auditLogs");
    
    addDocumentNonBlocking(auditRef, {
      timestamp: new Date().toISOString(),
      actorEmail: user.email,
      action,
      details,
      status,
      category,
      userAgent: navigator.userAgent,
      loginMethod: user.providerData[0]?.providerId || 'password',
      deviceFingerprint: getFingerprint()
    });
  };

  const copyProjectId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast({ title: "Project ID Copied", description: "Use this value for 'projectId' in SDK initialization." });
    logAction("PROJECT_ID_COPIED", "User copied the global project ID.", "security");
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setSavingAccount(true);
    try {
      await updateProfile(auth.currentUser, { displayName });
      toast({ title: "Profile Updated", description: "Institutional identity sync complete." });
      logAction("PROFILE_UPDATED", `Display name updated to ${displayName}`, "admin");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
      logAction("PROFILE_UPDATE_FAILED", e.message, "admin", "failure");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleUpdateOrg = () => {
    if (!orgRef || !user) return;
    setSavingOrg(true);
    setDocumentNonBlocking(orgRef, {
      name: orgName,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    setTimeout(() => {
      setSavingOrg(false);
      toast({ title: "Organization Synced", description: "Metadata updated in control plane." });
      logAction("ORG_METADATA_UPDATED", `Org name set to ${orgName}`, "admin");
    }, 500);
  };

  const handleAddDomain = () => {
    if (!orgRef || !newDomain.trim()) return;
    setAddingDomain(true);
    
    const domainName = newDomain.trim().toLowerCase();
    const currentDomains = organization?.allowedDomains || [];
    
    if (currentDomains.some((d: any) => d.domain === domainName)) {
      toast({ variant: "destructive", title: "Duplicate Domain", description: "This domain is already on your list." });
      setAddingDomain(false);
      return;
    }

    const verificationToken = Math.random().toString(36).substring(2, 15);

    const newEntry = {
      domain: domainName,
      verified: false,
      verificationToken,
      createdAt: new Date().toISOString()
    };

    updateDocumentNonBlocking(orgRef, {
      allowedDomains: [...currentDomains, newEntry],
      updatedAt: new Date().toISOString()
    });

    setTimeout(() => {
      setNewDomain("");
      setAddingDomain(false);
      toast({ title: "Domain Pending", description: `${domainName} added. Please verify DNS ownership.` });
      logAction("DOMAIN_ADDED", `New domain ${domainName} added to pending whitelist.`, "admin");
    }, 500);
  };

  const handleVerifyDns = async (domainToVerify: string, token: string) => {
    if (!user || !domainToVerify || !orgRef) return;
    setVerifyingDomain(domainToVerify);

    try {
      const result = await verifyDomainDns(domainToVerify, token);
      
      if (result.success) {
        // Authoritative server check passed, now update Firestore using client auth
        const currentDomains = organization?.allowedDomains || [];
        const updatedDomains = currentDomains.map((d: any) => {
          if (d.domain === domainToVerify) {
            return { ...d, verified: true, verifiedAt: new Date().toISOString() };
          }
          return d;
        });

        updateDocumentNonBlocking(orgRef, { 
          allowedDomains: updatedDomains,
          updatedAt: new Date().toISOString()
        });

        toast({ title: "DNS Verified", description: `${domainToVerify} is now officially whitelisted.` });
        logAction("DNS_VERIFIED", `Ownership verified for domain ${domainToVerify}.`, "security", "success");
      } else {
        toast({ variant: "destructive", title: "Verification Failed", description: result.error || "Could not detect DNS record." });
        logAction("DNS_VERIFICATION_FAILED", `Failed attempt to verify ${domainToVerify}. Details: ${result.error}`, "security", "failure");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Resolution Error", description: "An unexpected error occurred during DNS lookup." });
      logAction("DNS_RESOLUTION_ERROR", `Critical error during DNS lookup for ${domainToVerify}.`, "security", "failure");
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleRemoveDomain = (domain: string) => {
    if (!orgRef || !organization?.allowedDomains) return;
    const updated = organization.allowedDomains.filter((d: any) => d.domain !== domain);
    updateDocumentNonBlocking(orgRef, {
      allowedDomains: updated,
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Domain Removed", description: `${domain} removed from whitelist.` });
    logAction("DOMAIN_REMOVED", `Domain ${domain} removed from whitelist.`, "admin");
  };

  const handleInvite = () => {
    if (!firestore || !user || !inviteEmail.trim()) return;
    setSendingInvite(true);

    const memberCol = collection(firestore, "organizations", `org_${user.uid}`, "users");
    addDocumentNonBlocking(memberCol, {
      email: inviteEmail.trim(),
      role: inviteRole,
      status: "pending",
      invitedBy: user.email,
      createdAt: new Date().toISOString(),
      organizationId: `org_${user.uid}`,
      userTier: "pro"
    });

    setTimeout(() => {
      setSendingInvite(false);
      setIsInviteOpen(false);
      setInviteEmail("");
      toast({ title: "Member Invited", description: `Invitation sent to ${inviteEmail}.` });
      logAction("MEMBER_INVITED", `Invited ${inviteEmail} with role ${inviteRole}.`, "access");
    }, 600);
  };

  const handleManageBilling = () => {
    toast({ title: "Billing Control Plane", description: "Redirecting to billing manager..." });
    logAction("BILLING_MANAGER_OPENED", "User opened the billing configuration dashboard.", "billing");
  };

  if (!mounted) return null;

  const usagePercentage = snapshot?.usage ? Math.min(100, (snapshot.usage.requests / 100000) * 100) : 0;

  const capabilities = [
    { name: "Monte Carlo Survival Engine", mode: "Common", desc: "10,000-path stochastic modeling of capital runway." },
    { name: "Forensic Ledger", mode: "Common", desc: "Deterministic model attribution and recursion detection." },
    { name: "Runaway Agent Guardrails", mode: "Common", desc: "Real-time spike detection and loop identification." },
    { name: "AI Runtime Signals", mode: "Common", desc: "Low-level telemetry viz derived from production and simulation." },
    { name: "Institutional SDK", mode: "SDK Only", desc: "Backend-only bridge for production telemetry flushes." },
    { name: "DNS Whitelisting", mode: "SDK Only", desc: "Security boundaries requiring TXT record validation." },
    { name: "Audit & Optimize (AI)", mode: "Common", desc: "Genkit-powered forensic recovery playbook." },
    { name: "Quality Sentry (AI)", mode: "Common", desc: "Model drift and coherence monitoring." },
  ];

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
            <TabsList className="bg-muted/50 p-1 w-full flex justify-start overflow-x-auto h-auto gap-1">
              <TabsTrigger value="sdk" className="gap-2 shrink-0 py-2"><Terminal size={14} /> SDK Ingestion</TabsTrigger>
              <TabsTrigger value="capabilities" className="gap-2 shrink-0 py-2"><Layers size={14} /> Capabilities</TabsTrigger>
              <TabsTrigger value="account" className="gap-2 shrink-0 py-2"><User size={14} /> Account</TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 shrink-0 py-2"><CreditCard size={14} /> Billing & Access</TabsTrigger>
              <TabsTrigger value="domains" className="gap-2 shrink-0 py-2"><Globe size={14} /> Domains</TabsTrigger>
              <TabsTrigger value="audit" className="gap-2 shrink-0 py-2"><History size={14} /> Audit Log</TabsTrigger>
              <TabsTrigger value="legal" className="gap-2 shrink-0 py-2"><FileText size={14} /> Legal</TabsTrigger>
            </TabsList>

            <TabsContent value="capabilities" className="space-y-6">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Layers size={18} className="text-primary" /> System Capabilities Manifest
                  </CardTitle>
                  <CardDescription>Comprehensive list of forensic features active in Phase 1.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Capability</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Mode</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Horizon</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {capabilities.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{c.name}</span>
                              <span className="text-[10px] text-muted-foreground">{c.desc}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[9px] font-bold uppercase ${c.mode === 'Demo Only' ? 'border-amber-200 text-amber-700 bg-amber-50' : c.mode === 'SDK Only' ? 'border-primary/20 text-primary bg-primary/5' : 'border-green-200 text-green-700 bg-green-50'}`}>
                              {c.mode}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono text-muted-foreground">Phase 1 (Live)</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sdk" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b">
                      <CardTitle className="text-xl font-headline flex items-center gap-2 text-primary">
                        <Zap size={20} /> AtlasBurn Forensic SDK
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
  apiKey: "YOUR_ATLASBURN_KEY",
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
                      {loadingSnapshot ? (
                        <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                          <Loader2 className="animate-spin h-3 w-3" /> Analyzing...
                        </div>
                      ) : snapshot?.hasEvents ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-green-600" />
                            <span className="text-xs font-bold text-green-700">Forensic Feed Online</span>
                          </div>
                          <span className="text-[10px] font-mono text-green-600">v1.8.2</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-600" />
                            <span className="text-xs font-bold text-amber-700">Awaiting Integration</span>
                          </div>
                        </div>
                      )}
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
                      <input 
                        placeholder="Lead Founder" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-muted/20 flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <Input disabled value={user?.email || ""} className="pl-10 bg-muted/10 opacity-70" />
                      </div>
                    </div>
                    <Button 
                      className="w-full font-headline font-bold" 
                      onClick={handleUpdateProfile}
                      disabled={savingAccount}
                    >
                      {savingAccount ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                      Update Profile
                    </Button>
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
                      <Input 
                        placeholder="e.g. Acme AI Corp" 
                        value={orgName} 
                        onChange={(e) => setOrgName(e.target.value)}
                        className="bg-muted/20"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full font-headline font-bold" 
                      onClick={handleUpdateOrg}
                      disabled={savingOrg}
                    >
                      {savingOrg ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                      Save Organization Details
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-headline flex items-center gap-2">
                          <Users size={18} className="text-primary" /> Institutional Permissions
                        </CardTitle>
                        <CardDescription>Manage user access and roles for this organization.</CardDescription>
                      </div>
                      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-2 font-headline font-bold">
                            <UserPlus size={14} /> Invite Member
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="font-headline text-xl">Delegate Forensic Access</DialogTitle>
                            <DialogDescription>Assign a team member with specific authority.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6 py-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Email Address</Label>
                              <Input 
                                placeholder="name@acme.ai" 
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="bg-muted/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Access Role</Label>
                              <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger className="bg-muted/20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin (Full Control)</SelectItem>
                                  <SelectItem value="finance">Finance (Economic Forensics)</SelectItem>
                                  <SelectItem value="engineer">Engineer (SDK & Technical)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button className="w-full font-headline font-bold" onClick={handleInvite} disabled={sendingInvite || !inviteEmail.trim()}>
                              {sendingInvite ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2" />}
                              Send Institutional Invitation
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">User</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">Role</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Added</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{user?.displayName || "Lead Founder"}</span>
                                <span className="text-[10px] text-muted-foreground">{user?.email}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold">OWNER</Badge></TableCell>
                            <TableCell><Badge className="bg-green-100 text-green-700 text-[10px] border-none font-bold">ACTIVE</Badge></TableCell>
                            <TableCell className="text-right text-[10px] font-mono text-muted-foreground">ROOT</TableCell>
                          </TableRow>
                          
                          {members?.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{member.name || member.email.split('@')[0]}</span>
                                  <span className="text-[10px] text-muted-foreground">{member.email}</span>
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase">{member.role}</Badge></TableCell>
                              <TableCell><Badge className="bg-amber-100 text-amber-700 text-[10px] border-none font-bold uppercase">{member.status}</Badge></TableCell>
                              <TableCell className="text-right text-[10px] font-mono text-muted-foreground">
                                {new Date(member.createdAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
                          <span>{snapshot?.usage ? ((snapshot.usage.requests / 100000) * 100).toFixed(1) : '0.0'}%</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white transition-all duration-500" style={{ width: `${usagePercentage}%` }} />
                        </div>
                      </div>
                      <Button variant="secondary" className="w-full font-bold" onClick={handleManageBilling}>Manage Billing</Button>
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
                  <CardDescription>Restrict forensic ingestion to specific domains. DNS verification required.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="e.g. api.acme-ai.com" 
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        className="bg-muted/20" 
                      />
                      <Button 
                        className="font-bold shrink-0"
                        onClick={handleAddDomain}
                        disabled={addingDomain}
                      >
                        {addingDomain ? <Loader2 className="animate-spin h-4 w-4" /> : "Add Domain"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Managed Domains</p>
                      <div className="border rounded-xl divide-y">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="text-green-600" size={14} />
                            <span className="text-sm font-mono">{origin.replace(/https?:\/\//, '')}</span>
                            <Badge variant="outline" className="text-[9px] font-bold">DEFAULT</Badge>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-none text-[9px]">VERIFIED</Badge>
                        </div>

                        {organization?.allowedDomains?.map((entry: any) => (
                          <div key={entry.domain} className="p-0">
                            <div className="p-4 flex items-center justify-between group">
                              <div className="flex items-center gap-2">
                                <Shield className={entry.verified ? "text-primary" : "text-muted-foreground"} size={14} />
                                <div className="flex flex-col">
                                  <span className="text-sm font-mono">{entry.domain}</span>
                                  {!entry.verified && (
                                    <span className="text-[10px] text-amber-600 font-bold uppercase flex items-center gap-1">
                                      <Clock size={10} /> Pending Verification
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!entry.verified && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-[10px] font-bold"
                                    onClick={() => handleVerifyDns(entry.domain, entry.verificationToken)}
                                    disabled={verifyingDomain === entry.domain}
                                  >
                                    {verifyingDomain === entry.domain ? (
                                      <Loader2 className="animate-spin mr-1 h-3 w-3" />
                                    ) : (
                                      <RefreshCw className="mr-1 h-3 w-3" />
                                    )}
                                    VERIFY DNS
                                  </Button>
                                )}
                                {entry.verified && (
                                  <Badge className="bg-green-100 text-green-700 border-none text-[9px]">VERIFIED</Badge>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveDomain(entry.domain)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                            {!entry.verified && (
                              <div className="px-4 pb-4">
                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-5 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900/60 uppercase">Type <TooltipProvider><Tooltip><TooltipTrigger><Info size={10} /></TooltipTrigger><TooltipContent>The DNS record type must be TXT.</TooltipContent></Tooltip></TooltipProvider></div>
                                      <div className="bg-white/80 border border-amber-200 p-2.5 rounded-lg text-xs font-mono font-bold text-amber-900">TXT</div>
                                    </div>
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900/60 uppercase">Host <TooltipProvider><Tooltip><TooltipTrigger><Info size={10} /></TooltipTrigger><TooltipContent>Use '@' for root domain or the specific subdomain name.</TooltipContent></Tooltip></TooltipProvider></div>
                                      <div className="bg-white/80 border border-amber-200 p-2.5 rounded-lg text-xs font-mono font-bold text-amber-900">@</div>
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900/60 uppercase">Value <TooltipProvider><Tooltip><TooltipTrigger><Info size={10} /></TooltipTrigger><TooltipContent>Copy this unique token into your DNS provider's TXT value field.</TooltipContent></Tooltip></TooltipProvider></div>
                                      <div className="flex items-center justify-between bg-white border border-amber-200 p-2 rounded-lg text-xs font-mono">
                                        <code className="text-amber-900 truncate mr-2">atlasburn-verification={entry.verificationToken}</code>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 w-7 p-0" 
                                          onClick={() => navigator.clipboard.writeText(`atlasburn-verification=${entry.verificationToken}`)}
                                        >
                                          <Copy size={12} className="text-amber-700" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 bg-white border-none shadow-sm flex items-center gap-4">
                  <div className="p-2 bg-destructive/10 text-destructive rounded-lg"><ShieldX size={20} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Failed DNS</p>
                    <p className="text-lg font-bold">{auditSummary.failedDns}</p>
                  </div>
                </Card>
                <Card className="p-4 bg-white border-none shadow-sm flex items-center gap-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg"><UserPlus size={20} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Access Events</p>
                    <p className="text-lg font-bold">{auditSummary.accessActions}</p>
                  </div>
                </Card>
                <Card className="p-4 bg-white border-none shadow-sm flex items-center gap-4">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CreditCard size={20} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Billing Actions</p>
                    <p className="text-lg font-bold">{auditSummary.billingActions}</p>
                  </div>
                </Card>
                <Card className="p-4 bg-white border-none shadow-sm flex items-center gap-4">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><ShieldAlert size={20} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Security Events</p>
                    <p className="text-lg font-bold">{auditSummary.securityActions}</p>
                  </div>
                </Card>
              </div>

              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-muted/50 border-b">
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <History className="text-primary" size={20} /> Institutional Audit Ledger
                  </CardTitle>
                  <CardDescription>Real-time feed of device forensics and administrative actions.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Timestamp</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Actor</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Category</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Forensics</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Action</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingLogs ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <Loader2 className="animate-spin mx-auto text-muted-foreground" size={24} />
                          </TableCell>
                        </TableRow>
                      ) : auditLogs?.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/5 transition-colors">
                          <TableCell className="text-[10px] font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{log.actorEmail?.split('@')[0]}</span>
                              <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{log.actorEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[9px] font-bold uppercase bg-muted text-muted-foreground">
                              {log.category || 'admin'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                                <Cpu size={10} /> {log.deviceFingerprint || 'ID: UNKNOWN'}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                                <Smartphone size={10} /> {log.loginMethod?.toUpperCase() || 'PASS'}
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[8px] text-muted-foreground underline cursor-help truncate max-w-[100px]">
                                      {log.userAgent}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[300px] text-[10px] font-mono">
                                    {log.userAgent}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold">{log.action?.replace(/_/g, ' ')}</span>
                              <span className="text-[10px] text-muted-foreground italic">{log.details}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] border-none ${log.status === 'failure' ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700'}`}>
                              {log.status?.toUpperCase() || 'SUCCESS'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                      Our terms govern the usage of the AtlasBurn Forensic SDK and Control Plane.
                    </p>
                    <Button variant="link" asChild className="p-0 h-auto text-primary font-bold mt-4 text-xs">
                      <a href="https://www.atlasburn.com/terms" target="_blank" rel="noopener noreferrer">
                        Read Full Terms
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
                      AtlasBurn encrypts all forensic metadata. We do not store raw LLM prompts.
                    </p>
                    <Button variant="link" asChild className="p-0 h-auto text-primary font-bold mt-4 text-xs">
                      <a href="https://www.atlasburn.com/privacy" target="_blank" rel="noopener noreferrer">
                        Review Data Policy
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
  );
}
