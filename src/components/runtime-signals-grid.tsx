
'use client';

import { Card } from "@/components/ui/card";
import { Zap, Repeat, Activity, Layers, Maximize } from "lucide-react";

interface RuntimeSignalsGridProps {
  signals?: {
    tokenVolume: number;
    requestRate: number;
    retryRate: number;
    loopProbability: number;
    contextExpansionRate: number;
    modelMix: Record<string, number>;
  };
}

export function RuntimeSignalsGrid({ signals }: RuntimeSignalsGridProps) {
  if (!signals) return null;

  const items = [
    { label: "Token Volatility", value: `${(signals.loopProbability * 100).toFixed(1)}%`, icon: Activity, desc: "Loop detection drift" },
    { label: "Request Burst", value: `${signals.requestRate.toFixed(1)}/s`, icon: Zap, desc: "Operational throughput" },
    { label: "Model Mix Exposure", value: "65% Reasoning", icon: Layers, desc: "Cost weighting bias" },
    { label: "Loop Risk Score", value: signals.loopProbability > 0.01 ? "High" : "Stable", icon: Maximize, desc: "Infinite agent loop probability" },
    { label: "Retry Cascade Risk", value: `${(signals.retryRate * 100).toFixed(1)}%`, icon: Repeat, desc: "Systemic recursion risk" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 animate-in fade-in duration-500">
      {items.map((item, i) => (
        <Card key={i} className="p-4 bg-primary/5 border-primary/10 border shadow-none group hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <item.icon size={14} className="text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">{item.label}</p>
          </div>
          <p className="text-xl font-headline font-bold text-primary">{item.value}</p>
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight">{item.desc}</p>
        </Card>
      ))}
    </div>
  );
}
