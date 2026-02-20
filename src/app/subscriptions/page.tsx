"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MOCK_SUBSCRIPTIONS } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Subscriptions() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold">Subscription Hub</h1>
          </div>
          <Button size="sm" className="gap-2">
            <Plus size={16} /> Add Subscription
          </Button>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-headline">Active Subscriptions</CardTitle>
              <CardDescription>Consolidated view of all your recurring AI costs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px]">Tool Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Monthly Cost</TableHead>
                    <TableHead>Next Renewal</TableHead>
                    <TableHead>API Usage</TableHead>
                    <TableHead>Change (MoM)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_SUBSCRIPTIONS.map((sub) => (
                    <TableRow key={sub.id} className="group transition-colors">
                      <TableCell className="font-bold text-primary">{sub.name}</TableCell>
                      <TableCell className="text-muted-foreground">{sub.provider}</TableCell>
                      <TableCell className="font-headline font-semibold text-foreground">${sub.monthlyCost}</TableCell>
                      <TableCell>{sub.renewalDate}</TableCell>
                      <TableCell>
                        {sub.apiUsage ? (
                          <div className="space-y-1">
                            <span className="text-xs font-mono">{sub.apiUsage.toLocaleString()} tokens</span>
                            <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="bg-accent h-full" style={{ width: '45%' }} />
                            </div>
                          </div>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={sub.lastMonthUsageChange > 0 ? 'destructive' : sub.lastMonthUsageChange < 0 ? 'secondary' : 'outline'}
                          className="font-medium"
                        >
                          {sub.lastMonthUsageChange > 0 ? '+' : ''}{sub.lastMonthUsageChange}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm bg-accent/5">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Savings Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-lg flex items-center justify-between border border-accent/20">
                  <div>
                    <p className="font-bold text-sm">Switch Midjourney to Yearly</p>
                    <p className="text-xs text-muted-foreground">Save up to 20% on your annual cost.</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Save $24/yr</Badge>
                </div>
                <div className="p-4 bg-white rounded-lg flex items-center justify-between border border-accent/20">
                  <div>
                    <p className="font-bold text-sm">Consolidate Chat Tools</p>
                    <p className="text-xs text-muted-foreground">Low usage detected on Claude Pro.</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Save $20/mo</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Renewal Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_SUBSCRIPTIONS.sort((a,b) => a.renewalDate.localeCompare(b.renewalDate)).map(sub => (
                    <div key={sub.id} className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/5 flex flex-col items-center justify-center text-primary border border-primary/10">
                        <span className="text-[10px] uppercase font-bold">{new Date(sub.renewalDate).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-lg font-bold font-headline leading-none">{new Date(sub.renewalDate).getDate()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{sub.name}</p>
                        <p className="text-xs text-muted-foreground">{sub.provider}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">${sub.monthlyCost}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Auto-renew</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}