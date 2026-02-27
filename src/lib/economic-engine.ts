
/**
 * AtlasBurn Economic Core
 * 
 * Functions for causal financial modeling.
 * Unit Margin -> Burn -> Runway -> Risk.
 */

export interface EconomicContext {
  monthlyRevenue: number;
  capitalReserves: number;
  currentMonthlyBurn: number;
  daysElapsed: number;
  totalDaysInMonth: number;
}

export interface EconomicImpact {
  grossMargin: number;
  runwayMonths: number;
  dailyBurn: number;
  burnToRevenueRatio: number;
}

/**
 * Calculates unit economics and survival metrics.
 */
export function calculateEconomicImpact(ctx: EconomicContext): EconomicImpact {
  const { monthlyRevenue, capitalReserves, currentMonthlyBurn, daysElapsed, totalDaysInMonth } = ctx;
  
  const dailyBurn = daysElapsed > 0 ? currentMonthlyBurn / daysElapsed : 0;
  const projectedMonthlyBurn = dailyBurn * totalDaysInMonth;
  
  const grossMargin = monthlyRevenue > 0 ? (monthlyRevenue - projectedMonthlyBurn) / monthlyRevenue : -1;
  const burnToRevenueRatio = projectedMonthlyBurn > 0 ? monthlyRevenue / projectedMonthlyBurn : 0;
  
  // Net burn is burn minus revenue. If revenue > burn, runway is infinite (represented as 120 months)
  const netMonthlyBurn = projectedMonthlyBurn - monthlyRevenue;
  const runwayMonths = netMonthlyBurn > 0 ? capitalReserves / netMonthlyBurn : 120;

  return {
    grossMargin,
    runwayMonths: Math.max(0, runwayMonths),
    dailyBurn,
    burnToRevenueRatio
  };
}

/**
 * Quantifies the runway extension and margin recovery of an optimization action.
 */
export function quantifyOptimization(
  ctx: EconomicContext, 
  estimatedMonthlySavings: number
): { revisedRunway: number; marginRecovery: number } {
  const current = calculateEconomicImpact(ctx);
  
  const revisedMonthlyBurn = (current.dailyBurn * ctx.totalDaysInMonth) - estimatedMonthlySavings;
  const netMonthlyBurn = revisedMonthlyBurn - ctx.monthlyRevenue;
  const revisedRunway = netMonthlyBurn > 0 ? ctx.capitalReserves / netMonthlyBurn : 120;
  
  const revisedMargin = ctx.monthlyRevenue > 0 ? (ctx.monthlyRevenue - revisedMonthlyBurn) / ctx.monthlyRevenue : -1;
  
  return {
    revisedRunway: Math.max(0, revisedRunway),
    marginRecovery: revisedMargin - current.grossMargin
  };
}
