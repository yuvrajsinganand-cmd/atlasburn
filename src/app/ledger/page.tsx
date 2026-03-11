
"use client"

import { useState, useEffect, useMemo } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, AlertTriangle, Search, Filter, ShieldAlert, Zap, History, Loader2, ArrowUpRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useDemoMode } from "@/components/demo-provider"

export default function ForensicLedger() {
  const { user } = useUser()
  const { isDemoMode } = useDemoMode()
  const firestore = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true);
  }, [])

  const ledgerQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'organizations', `org_${user.uid}`, 'usageRecords'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
  }, [firestore, user]);

  const { data: records, isLoading } = useCollection(ledgerQuery);

  const displayRecords = useMemo(() => {
    if (!mounted) return [];
    
    let base = records || [];
    
    if (isDemoMode && (!records || records.length === 0)) {
      // Synthetic Forensic Events for Demo
      base = Array.from({ length: 20 }, (_, i) => ({
        id: `demo-${i}`,
        timestamp: new Date(Date.now() - i * 1000 * 60 * 15).toISOString(),
        model: i % 3 === 0 ? "o1-preview" : "gpt-4o",
        featureId: i < 5 ? "support-bot-alpha" : "search-agent",
        cost: i < 5 ? 1.45 : 0.08,
        inputTokens: i < 5 ? 12000 : 800,
        outputTokens: i < 5 ? 4000 : 200,
        eventId: `evt-${Math.random().toString(36).substring(7)}`,
        isRecursion: i < 5
      })) as any;
    }

    return base.filter(r => 
      r.featureId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm, isDemoMode, mounted]);

  if (!mounted) return null;

  const safeFormatDate = (timestamp: any) => {
    if (!timestamp) return '---';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <SidebarProvider suppressHydrationWarning>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">Forensic Ledger</h1>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 uppercase text-[10px] font-bold">
            <History size={12} /> Real-time Audit Feed
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                placeholder="Search by Feature or Model..." 
                className="pl-10 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Badge className="bg-destructive/10 text-destructive border-none font-bold text-[10px]">
                {displayRecords.filter(r => (r.cost || 0) > 1.0 || r.isRecursion).length} Anomalies Flagged
              </Badge>
            </div>
          </div>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-sm font-headline flex items-center gap-2 text-foreground">
                  <FileText className="text-primary" size={18} /> Deterministic Event Log
                </CardTitle>
                <CardDescription className="text-[10px]">Every token interaction attributed to a product capability.</CardDescription>
              </div>
              <Filter size={14} className="text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-widest text-muted-foreground bg-muted/5">
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Feature Context</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Usage (I/O)</TableHead>
                    <TableHead>Forensic ID</TableHead>
                    <TableHead className="text-right">Event Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Loader2 className="animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  )}
                  {displayRecords.map((record) => {
                    const cost = record.cost || 0;
                    const isHighCost = cost > 1.0;
                    const isRecursion = record.isRecursion;
                    
                    return (
                      <TableRow key={record.id} className={`group transition-colors ${isRecursion ? 'bg-destructive/5 hover:bg-destructive/10' : ''}`}>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {safeFormatDate(record.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isRecursion ? 'text-destructive' : 'text-foreground'}`}>
                              {record.featureId || '---'}
                            </span>
                            {isRecursion && (
                              <Badge className="bg-destructive text-white border-none text-[8px] h-4 px-1 animate-pulse">
                                <ShieldAlert size={8} className="mr-1" /> RECURSION
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                            {record.model || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-[10px] font-medium text-muted-foreground">
                            {(record.inputTokens || 0).toLocaleString()} / {(record.outputTokens || 0).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[9px] opacity-50 truncate max-w-[80px]">
                          {record.eventId || '---'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 font-headline font-bold ${isHighCost ? 'text-destructive' : 'text-primary'}`}>
                            ${cost.toFixed(4)}
                            {isHighCost && <ArrowUpRight size={12} />}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && displayRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic text-xs">
                        No forensic records matched your search parameters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
