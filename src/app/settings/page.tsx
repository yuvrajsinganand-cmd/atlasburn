
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Key, ShieldCheck, Database, RefreshCw, Loader2 } from "lucide-react"
import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [connecting, setConnecting] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");

  const connectionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'));
  }, [firestore, user]);

  const { data: connections } = useCollection(connectionsQuery);

  const handleConnect = () => {
    if (!user || !firestore || !apiKey) return;
    setConnecting(true);

    const subCol = collection(firestore, 'users', user.uid, 'aiSubscriptions');
    addDocumentNonBlocking(subCol, {
      userProfileId: user.uid,
      providerName: provider,
      customName: `${provider.toUpperCase()} Production`,
      apiKeyMetadata: `sk-...${apiKey.slice(-4)}`,
      status: 'active',
      monthlyFixedCost: 0,
      createdAt: new Date().toISOString(),
    });

    setTimeout(() => {
      setConnecting(false);
      setApiKey("");
      toast({ title: "Provider Connected", description: `Sleek is now ingesting forensic data from ${provider}.` });
    }, 1000);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2"><SidebarTrigger className="-ml-1" /><h1 className="font-headline text-xl font-bold">API Connectors</h1></div>
        </header>

        <main className="p-6 space-y-6 max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Key className="text-primary" size={18} /> OpenAI Connection</CardTitle>
                <CardDescription>Connect with a read-only or usage-scoped API key.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Usage API Key</Label>
                  <Input type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                </div>
                <Button className="w-full font-bold" onClick={handleConnect} disabled={connecting}>
                  {connecting ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                  Establish Ingestion Link
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-accent/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="text-accent" size={18} /> Security Guard</CardTitle>
                <CardDescription>How Sleek handles your keys.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-3 text-muted-foreground">
                <p>• Keys are stored using envelope encryption (AES-256).</p>
                <p>• Only forensic metadata is pulled; we never proxy your production traffic.</p>
                <p>• You can revoke access at any time via your provider dashboard.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg">Active Links</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connections?.map(conn => (
                  <div key={conn.id} className="p-4 bg-secondary/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><Database size={16} className="text-primary" /></div>
                      <div><p className="font-bold text-sm uppercase tracking-wide">{conn.customName}</p><p className="text-xs text-muted-foreground">{conn.apiKeyMetadata}</p></div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Ingesting</Badge>
                  </div>
                ))}
                {!connections?.length && <p className="text-center py-8 text-muted-foreground italic">No active ingestion links detected.</p>}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
