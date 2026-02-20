"use client"

import { useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, TrendingUp, Wallet, ShieldAlert, Cpu, Loader2 } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"
import { useAuth } from "@/firebase"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const subscriptionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'aiSubscriptions'));
  }, [firestore, user]);

  const budgetQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'userBudgets'));
  }, [firestore, user]);

  const { data: subscriptions, isLoading: subsLoading } = useCollection(subscriptionsQuery);
  const { data: budgets, isLoading: budgetLoading } = useCollection(budgetQuery);

  const activeSubscriptions = subscriptions || [];
  const currentBudget = budgets?.[0] || { monthlyBudgetCap: 100, currentSpend: 0 };
  
  const totalCost = activeSubscriptions.reduce((acc, sub) => acc + (sub.monthlyFixedCost || 0), 0);
  const budgetPercentage = currentBudget.monthlyBudgetCap > 0 
    ? Math.round((currentBudget.currentSpend / currentBudget.monthlyBudgetCap) * 100) 
    : 0;

  const vendorData = activeSubscriptions.reduce((acc: any[], sub) => {
    const provider = sub.subscriptionType || 'Other';
    const existing = acc.find(i => i.provider === provider);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ provider, value: 1 });
    }
    return acc;
  }, []);

  const totalVendors = vendorData.length;

  if (isUserLoading || subsLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background/50">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Dashboard</h1>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live Insights
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Monthly Fixed Cost</CardTitle>
                <Wallet size={16} className="text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold text-primary">${totalCost}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp size={12} className="text-green-500" /> Based on {activeSubscriptions.length} tools
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Budget Cap Used</CardTitle>
                <AlertCircle size={16} className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold">{budgetPercentage}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${currentBudget.monthlyBudgetCap - currentBudget.currentSpend} remaining
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Active Tools</CardTitle>
                <Cpu size={16} className="text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold">{activeSubscriptions.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all categories
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Vendors</CardTitle>
                <ShieldAlert size={16} className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold">{totalVendors}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unique providers
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Vendor Dependency</CardTitle>
                <CardDescription>Risk of vendor lock-in based on tool count</CardDescription>
              </CardHeader>
              <CardContent>
                {vendorData.length > 0 ? (
                  <>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={vendorData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="provider"
                          >
                            {vendorData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-4">
                      {vendorData.map((v, i) => (
                        <div key={v.provider} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="font-medium">{v.provider}</span>
                          </div>
                          <span className="text-muted-foreground">{v.value} tool(s)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground italic">
                    No vendor data available.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-headline">Cost Breakdown</CardTitle>
                  <CardDescription>Comparing monthly fixed costs across your AI suite</CardDescription>
                </div>
                <Badge className="bg-accent hover:bg-accent/90">Optimizer Ready</Badge>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  {activeSubscriptions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeSubscriptions}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis dataKey="customName" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(103, 58, 183, 0.05)' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="monthlyFixedCost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic">
                      Add a subscription to see your cost breakdown.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
