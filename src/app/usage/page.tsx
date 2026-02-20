"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Info, TrendingUp, Zap, MousePointer2 } from "lucide-react"

const USAGE_HISTORY = [
  { date: '06-01', tokens: 40000, cost: 0.40 },
  { date: '06-02', tokens: 65000, cost: 0.65 },
  { date: '06-03', tokens: 120000, cost: 1.20 },
  { date: '06-04', tokens: 90000, cost: 0.90 },
  { date: '06-05', tokens: 350000, cost: 3.50 }, // SPIKE
  { date: '06-06', tokens: 150000, cost: 1.50 },
  { date: '06-07', tokens: 110000, cost: 1.10 },
];

export default function Usage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Usage Intelligence</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-headline">API Traffic Heatmap</CardTitle>
                  <CardDescription>Daily token consumption and cost trends.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">7 Days</Badge>
                  <Badge variant="outline">30 Days</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={USAGE_HISTORY}>
                      <defs>
                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm bg-destructive/5 border-destructive/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase text-destructive flex items-center gap-2">
                    <TrendingUp size={16} /> Spike Detected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-headline font-bold text-destructive">June 5th</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Token usage jumped <strong>280%</strong> above average. We correlated this spike to the "Automated Content Migration" task in Jira.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-accent/5 border-accent/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase text-accent flex items-center gap-2">
                    <MousePointer2 size={16} /> Feature Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Web Search</span>
                    <Badge variant="secondary">64%</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Vision Analysis</span>
                    <Badge variant="secondary">12%</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Code Int.</span>
                    <Badge variant="secondary">24%</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Avg Latency', value: '850ms', trend: '-12%', icon: Zap },
              { label: 'Token Efficiency', value: '94%', trend: '+2%', icon: Info },
              { label: 'Cache Hit Rate', value: '42%', trend: '+15%', icon: Info },
              { label: 'Err Rate', value: '0.04%', trend: '-0.01%', icon: Info },
            ].map((stat, i) => (
              <Card key={i} className="border-none shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">{stat.label}</CardTitle>
                  <stat.icon size={14} className="text-primary/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-headline font-bold">{stat.value}</div>
                  <p className={`text-[10px] font-bold mt-1 ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-blue-500'}`}>
                    {stat.trend} from last period
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}