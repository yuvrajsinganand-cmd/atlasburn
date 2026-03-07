
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Terminal, ShieldCheck, Key, Globe, Lock, Cpu, Server } from "lucide-react"
import { useUser } from "@/firebase"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SDKSetupPage() {
  const { user } = useUser()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-tight text-primary">SDK Integration Guide</h1>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 text-[10px] font-bold px-3 py-1">
            <ShieldCheck size={12} /> DETERMINISTIC ENFORCEMENT
          </Badge>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-primary/10 text-primary rounded-lg"><Lock size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Security Model</p>
                <p className="text-sm font-bold">Backend-Only</p>
              </div>
            </Card>
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Globe size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Origin Check</p>
                <p className="text-sm font-bold">DNS Validated</p>
              </div>
            </Card>
            <Card className="p-4 border-none shadow-sm flex items-center gap-4 bg-white">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Cpu size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data Protocol</p>
                <p className="text-sm font-bold">Forensic Ingest</p>
              </div>
            </Card>
          </div>

          <Card className="border-none shadow-2xl p-8 bg-zinc-950 text-zinc-50 space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/20 rounded-[1.5rem] text-primary"><Terminal size={40} /></div>
              <div>
                <h2 className="text-2xl font-headline font-bold">Initialize Production Ingestion</h2>
                <p className="text-zinc-400 text-sm">AtlasBurn requires real-time forensic metadata from your production cluster.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Server size={14} /> 1. Install Institutional SDK
                </h3>
                <pre className="p-5 bg-black/50 rounded-2xl font-mono text-[12px] text-zinc-300 border border-zinc-800/50">
                  <code>npm install @atlasburn/sdk</code>
                </pre>
                <p className="text-[10px] text-muted-foreground px-2">Note: For MVP testing, you can copy <code>src/lib/atlasburn-sdk.ts</code> into your project.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Key size={14} /> 2. Configure Forensic Bridge
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Wrap your existing LLM client. This operation is non-blocking and uses background flushes to preserve performance.
                </p>
                <pre className="p-5 bg-black/50 rounded-2xl font-mono text-[11px] overflow-x-auto text-primary/70 leading-relaxed border border-zinc-800/50">
{`import { withAtlasBurn } from "@atlasburn/sdk";
import OpenAI from "openai";

const openai = withAtlasBurn(new OpenAI(), {
  apiKey: process.env.ATLASBURN_KEY, // Get this from System Controls
  projectId: "${user?.uid || 'YOUR_PROJECT_ID'}",
  ingestUrl: "https://your-atlasburn-domain.com/api/ingest"
});`}
                </pre>
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-800 flex justify-between items-center">
              <p className="text-[10px] text-zinc-500 max-w-md">
                Deterministic modeling is enforced. All analytical engines pull directly from the verified production telemetry feed.
              </p>
              <Button asChild variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-900">
                <Link href="/settings">Get API Key</Link>
              </Button>
            </div>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
