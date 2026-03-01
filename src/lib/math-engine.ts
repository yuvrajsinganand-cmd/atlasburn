
/**
 * Math Engine: Institutional Normalization
 * Pure logic only. No constants.
 */

export function calculateRunway(dailyBurn: number, capital: number): number {
  if (dailyBurn <= 0) return 3650; // ~10 years (effectively infinite)
  return capital / dailyBurn;
}

export function getMarginStatus(breachProb: number, margin: number) {
  if (breachProb > 0.2 || margin < 20) {
    return {
      label: "INSOLVENCY RISK",
      color: "text-destructive",
      bg: "bg-destructive/10",
    };
  }
  if (breachProb > 0.05 || margin < 40) {
    return {
      label: "MARGIN EROSION",
      color: "text-amber-600",
      bg: "bg-amber-100",
    };
  }
  return {
    label: "CAPITAL SECURE",
    color: "text-green-600",
    bg: "bg-green-100",
  };
}

/**
 * Projects burn and calculates probability of breach using a stochastic approximation.
 * 
 * @param currentBurn - Cumulative burn in the current window.
 * @param daysElapsed - Days observed in the current window.
 * @param totalDays - Total window length (e.g. 30 days).
 * @param growthRate - Projected monthly growth (0.05 = 5%).
 * @param capital - Current available capital reserves.
 * @param volatility - Coefficient of variation (StdDev / Mean).
 */
export function calculateMonthEndForecast(
  currentBurn: number,
  daysElapsed: number,
  totalDays: number,
  growthRate: number,
  capital: number,
  volatility: number
) {
  const daysRemaining = totalDays - daysElapsed;
  if (daysRemaining <= 0) return { projectedTotalBurn: currentBurn, probabilityOfRunwayBreach: 0 };

  const dailyMean = currentBurn / Math.max(daysElapsed, 1);
  const projectedRemainingBurn = dailyMean * daysRemaining * (1 + growthRate);
  const totalProjected = currentBurn + projectedRemainingBurn;

  // Simplified breach probability using volatility and remaining capital
  const sigma = dailyMean * volatility * Math.sqrt(daysRemaining);
  const headroom = capital - projectedRemainingBurn;
  
  const zScore = headroom / Math.max(sigma, 0.01);
  
  let probabilityOfRunwayBreach = 0;
  if (zScore > 3) probabilityOfRunwayBreach = 0;
  else if (zScore < -3) probabilityOfRunwayBreach = 1;
  else {
    probabilityOfRunwayBreach = 0.5 - (zScore / 6);
  }

  return {
    projectedTotalBurn: totalProjected,
    probabilityOfRunwayBreach: Math.max(0, Math.min(1, probabilityOfRunwayBreach))
  };
}
