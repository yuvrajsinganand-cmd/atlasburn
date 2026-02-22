
/**
 * Sleek Math Engine
 * Implementation of Feature 5 (Runway), Feature 7 (Unit Economics), and Feature 12 (Scenarios).
 */

export interface DailyDataPoint {
  date: string;
  cost: number;
  requests: number;
}

/**
 * Calculates projected runway for API spend.
 * @param dailySpend Average spend over the last 7-14 days.
 * @param currentCash Allocation for AI spend.
 * @param growthRate Daily growth multiplier (e.g., 1.02 for 2% daily growth).
 */
export function calculateRunway(dailySpend: number, currentCash: number, growthRate: number = 1.0): number {
  if (dailySpend <= 0) return Infinity;
  
  // Basic Linear Runway: Cash / Burn
  if (growthRate === 1.0) {
    return Math.floor(currentCash / dailySpend);
  }

  // Geometric Series Runway: Sum(dailySpend * growthRate^n) = currentCash
  // Solve for n: dailySpend * (1 - growthRate^n) / (1 - growthRate) = currentCash
  // growthRate^n = 1 - (currentCash * (1 - growthRate) / dailySpend)
  // n = log(1 - (currentCash * (1 - growthRate) / dailySpend)) / log(growthRate)
  
  const val = 1 - (currentCash * (1 - growthRate) / dailySpend);
  if (val <= 0) return 0; // Growth exceeds cash immediately
  
  const days = Math.log(val) / Math.log(growthRate);
  return Math.floor(days);
}

/**
 * Calculates Unit Economics for a specific feature.
 * @param totalCost Total feature spend.
 * @param actionCount Total successful actions/runs.
 * @param revenuePerAction Price charged to customer for that action.
 */
export function calculateUnitEconomics(totalCost: number, actionCount: number, revenuePerAction: number = 0) {
  const costPerAction = actionCount > 0 ? totalCost / actionCount : 0;
  const margin = revenuePerAction > 0 ? (revenuePerAction - costPerAction) / revenuePerAction : 0;
  
  return {
    costPerAction,
    margin: margin * 100, // as percentage
    isHealthy: revenuePerAction > 0 ? margin > 0.4 : true // Default 40% margin threshold
  };
}

/**
 * Feature 6: P90 Risk Detection
 * Identifies share of cost consumed by the top 10% of users/requests.
 */
export function calculateP90Risk(userCosts: number[]): number {
  if (userCosts.length === 0) return 0;
  const sorted = [...userCosts].sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  const top10PercentCount = Math.ceil(sorted.length * 0.1);
  const top10Total = sorted.slice(0, top10PercentCount).reduce((a, b) => a + b, 0);
  
  return (top10Total / total) * 100;
}
