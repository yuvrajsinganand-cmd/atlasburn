
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PROVIDER_REGISTRY } from "@/lib/provider-registry"
import { Coins, Info, Search, Database, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

export default function ModelCatalog() {
  const [searchTerm, setSearchTerm] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const models = Object.entries(PROVIDER_REGISTRY).filter(([id]) => 
    id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <SidebarProvider suppressHydrationWarning>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight">Model Intelligence Catalog</h1>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                placeholder="Search models..." 
                className="pl-10 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
              <Database size={14} className="text-primary" />
              <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Pricing v1.2.0-LIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-muted/20 border-b">
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <Coins className="text-primary" /> Unit Economics Ledger
                </CardTitle>
                <CardDescription>Real-time token rates per 1,000,000 tokens. These values drive your gross margin calculations.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-widest text-muted-foreground">
                      <TableHead className="w-[300px]">Model Identifier</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Input (1M)</TableHead>
                      <TableHead>Output (1M)</TableHead>
                      <TableHead className="text-right">Economic Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map(([id, economics]) => (
                      <TableRow key={id} className="group transition-colors">
                        <TableCell className="font-mono font-bold text-primary">{id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                            {economics.provider}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <ArrowDownLeft size={12} className="text-muted-foreground" />
                            <span className="font-semibold">${economics.inputCostPer1M.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <ArrowUpRight size={12} className="text-muted-foreground" />
                            <span className="font-semibold">${economics.outputCostPer1M.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`text-[9px] font-bold ${economics.tier === 'reasoning' ? 'border-destructive/20 text-destructive bg-destructive/5' : 'border-green-600/20 text-green-600 bg-green-50'}`}>
                            {economics.tier.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {models.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                          No models found matching your search criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
