
/**
 * AtlasBurn Institutional Risk Configuration
 * 
 * ZERO-BASELINE SETTINGS.
 * Every economic parameter must be provided by the user or SDK.
 */

export const INSTITUTIONAL_DEFAULTS = {
  MONTHLY_BURN_FLOOR: 0,
  CAPITAL_RESERVES: 0,
  COEFFICIENT_OF_VARIATION: 0.15, // Statistical floor for simulation noise
  MONTHLY_GROWTH: 0.0,
  CHURN_RATE: 0.0,
  OUTAGE_PROBABILITY: 0.0,
  RETRY_CASCADE_PROBABILITY: 0.0,
  SIMULATION_RUNS: 10000,
};

export const RISK_LEVELS = {
  STRESS_CASE: 95, // P95
  MEDIAN_CASE: 50, // P50
  OPTIMISTIC_CASE: 5, // P5
};
