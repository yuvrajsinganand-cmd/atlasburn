
'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface SystemPulseProps {
  p95BurnDelta?: number;
  driftIndex?: number;
  retryStormProb?: number;
  breachProb?: number;
  hasData: boolean;
}

export function SystemPulse({ 
  p95BurnDelta = 0, 
  driftIndex = 0, 
  retryStormProb = 0, 
  breachProb = 0, 
  hasData 
}: SystemPulseProps) {
  const status = useMemo(() => {
    if (!hasData) return { label: 'Inert', color: 'bg-muted text-muted-foreground', icon: Activity };
    
    // Institutional Risk Logic derived from simulated paths
    const riskScore = (p95BurnDelta * 0.4) + (driftIndex * 0.3) + (retryStormProb * 0.2) + (breachProb * 100);
    
    if (riskScore > 40 || breachProb > 0.2 || driftIndex > 30) {
      return { label: 'Risk Elevated', color: 'bg-destructive text-white animate-pulse', icon: AlertTriangle };
    }
    if (riskScore > 15 || driftIndex > 10) {
      return { label: 'Volatility Watch', color: 'bg-amber-500 text-white', icon: Zap };
    }
    return { label: 'Stable', color: 'bg-green-600 text-white', icon: ShieldCheck };
  }, [p95BurnDelta, driftIndex, retryStormProb, breachProb, hasData]);

  const StatusIcon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${status.color} border-none gap-2 px-3 py-1 uppercase text-[10px] font-bold tracking-widest transition-all duration-500 shadow-sm cursor-help`}>
            <StatusIcon size={12} />
            {status.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px] font-mono p-3 space-y-1">
          <p className="font-bold border-b pb-1 mb-1">MONTE CARLO DIAGNOSIS</p>
          <div className="flex justify-between gap-4">
            <span>STRESS PROB (P95):</span>
            <span className="font-bold">{(p95BurnDelta).toLocaleString()}$</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>BREACH PROB:</span>
            <span className="font-bold">{(breachProb * 100).toFixed(1)}%</span>
          </div>
          <p className="text-[8px] opacity-70 mt-2 italic">Based on 10,000 stochastic paths.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
