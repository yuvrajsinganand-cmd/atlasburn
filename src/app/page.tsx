"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { MOCK_BUDGET, MOCK_VENDOR_RISK, MOCK_SUBSCRIPTIONS } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, TrendingUp, Wallet, ShieldAlert, Cpu } from "lucide-react"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function Dashboard() {
  const totalCost = MOCK_SUBSCRIPTIONS.reduce((acc, sub) => acc + sub.monthlyCost, 0);
  const totalAPIUsage = MOCK_SUBSCRIPTIONS.reduce((acc, sub) => acc + (sub.apiUsage || 0), 0);
  
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
          {/* Top Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Monthly Burn</CardTitle>
                <Wallet size={16} className="text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold text-primary">${totalCost}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp size={12} className="text-green-500" /> +2.5% vs last month
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Budget Status</CardTitle>
                <AlertCircle size={16} className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold">70%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  $30 remaining for June
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">API Volume</CardTitle>
                <Cpu size={16} className="text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold">700k+</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tokens processed
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Provider Count</CardTitle>
                <ShieldAlert size={16} className="text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-headline font-bold">4</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unique AI vendors
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vendor Lock-in Analysis */}
            <Card className="lg:col-span-1 border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Vendor Dependency</CardTitle>
                <CardDescription>Risk of vendor lock-in based on usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={MOCK_VENDOR_RISK}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="percentage"
                      >
                        {MOCK_VENDOR_RISK.map((entry, index) => (
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
                  {MOCK_VENDOR_RISK.map((v, i) => (
                    <div key={v.provider} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{v.provider}</span>
                      </div>
                      <span className="text-muted-foreground">{v.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cost Optimization Teaser */}
            <Card className="lg:col-span-2 border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-headline">Cost per Task Efficiency</CardTitle>
                  <CardDescription>Comparing efficiency across your AI suite</CardDescription>
                </div>
                <Badge className="bg-accent hover:bg-accent/90">Optimizer Ready</Badge>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MOCK_SUBSCRIPTIONS}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(103, 58, 183, 0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="monthlyCost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}