
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp } from "lucide-react";

interface RiskAlertBannerProps {
  var95: number;
  retryProb: number;
}

export function RiskAlertBanner({ var95, retryProb }: RiskAlertBannerProps) {
  if (retryProb < 0.06) return null;

  return (
    <Alert className="mb-6 bg-destructive/10 border-destructive text-destructive animate-pulse">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-headline font-bold uppercase tracking-tight flex items-center gap-2">
        AI Cost Anomaly Detected
      </AlertTitle>
      <AlertDescription className="text-xs font-medium flex justify-between items-center">
        <span>Possible agent retry cascade identified in runtime signals. This is currently driving your <strong>${var95.toLocaleString()}</strong> Surprise Delta.</span>
        <span className="flex items-center gap-1 font-bold"><TrendingUp size={14} /> Projected spike: +${(var95 * 0.8).toLocaleString()}</span>
      </AlertDescription>
    </Alert>
  );
}
