
/**
 * Math Engine: Institutional Normalization
 * Pure logic only. No constants.
 */

export function calculateRunway(dailyBurn: number, capital: number): number {
  if (dailyBurn <= 0) return 3650;
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
