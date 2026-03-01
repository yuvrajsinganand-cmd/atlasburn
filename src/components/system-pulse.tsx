
'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

interface SystemPulseProps {
  p95BurnDelta?: number;
  driftIndex?: number;
  retryStormProb?: number;
  breachProb?: number;
  hasData: boolean;
}

export function SystemPulse({ p95BurnDelta = 0, driftIndex = 0, retryStormProb = 0, breachProb = 0, hasData }: SystemPulseProps) {
  const status = useMemo(() => {
    if (!hasData) return { label: 'Inert', color: 'bg-muted text-muted-foreground', icon: Activity };
    
    // Risk Calculation
    const riskScore = (p95BurnDelta * 0.4) + (driftIndex * 0.3) + (retryStormProb * 0.2) + (breachProb * 0.1);
    
    if (riskScore > 40 || breachProb > 0.2 || driftIndex > 30) {
      return { label: 'Risk Elevated', color: 'bg-destructive text-destructive-foreground animate-pulse', icon: AlertTriangle };
    }
    if (riskScore > 15 || driftIndex > 10) {
      return { label: 'Volatility Watch', color: 'bg-accent text-accent-foreground', icon: Zap };
    }
    return { label: 'Stable', color: 'bg-green-600 text-white', icon: ShieldCheck };
  }, [p95BurnDelta, driftIndex, retryStormProb, breachProb, hasData]);

  const StatusIcon = status.icon;

  return (
    <Badge variant="outline" className={`${status.color} border-none gap-2 px-3 py-1 uppercase text-[10px] font-bold tracking-widest transition-all duration-500`}>
      <StatusIcon size={12} />
      {status.label}
    </Badge>
  );
}
