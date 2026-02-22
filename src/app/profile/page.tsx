"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { User, Wallet, Save, Loader2, Mail, ShieldCheck, Key } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [budgetCap, setBudgetCap] = useState("100");
  const [threshold, setThreshold] = useState("80");
  const [saving, setSaving] = useState(false);

  const budgetQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "users", user.uid, "userBudgets"));
  }, [firestore, user]);

  const { data: budgets } = useCollection(budgetQuery);
  const currentBudget = budgets?.[0];

  useEffect(() => {
    if (currentBudget) {
      setBudgetCap(currentBudget.monthlyBudgetCap.toString());
      setThreshold(currentBudget.alertThresholdPercentage.toString());
    }
  }, [currentBudget]);

  const handleSaveBudget = () => {
    if (!user || !firestore) return;
    setSaving(true);
    
    const budgetId = currentBudget?.id || "default";
    const docRef = doc(firestore, "users", user.uid, "userBudgets", budgetId);
    
    setDocumentNonBlocking(docRef, {
      userProfileId: user.uid,
      monthlyBudgetCap: parseFloat(budgetCap) || 0,
      alertThresholdPercentage: parseFloat(threshold) || 80,
      lastUpdatedAt: new Date().toISOString(),
    }, { merge: true });

    setTimeout(() => {
      setSaving(false);
      toast({ title: "Settings Saved", description: "Your budget preferences have been updated." });
    }, 500);
  };

  if (isUserLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Account Settings</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border-none shadow-sm h-fit">
              <CardHeader className="text-center">
                <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-4 border-white shadow-xl">
                  <User size={48} className="text-primary" />
                </div>
                <CardTitle className="font-headline">{user?.displayName || "Founder"}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-1">
                  <Mail size={12} /> {user?.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Status</span>
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                    <ShieldCheck size={12} className="mr-1" /> Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="text-primary" size={20} /> Budget Guardrails
                  </CardTitle>
                  <CardDescription>Hard and soft limits for monthly burn.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="budget-cap">Monthly Budget Cap ($)</Label>
                    <Input id="budget-cap" type="number" value={budgetCap} onChange={(e) => setBudgetCap(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="threshold">Alert Threshold (%)</Label>
                    <Input id="threshold" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                  </div>
                  <Button onClick={handleSaveBudget} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                    Save Guardrails
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Security Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Sign-in Provider</Label>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Key size={14} /> {user?.providerData[0]?.providerId || "password"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
