/**
 * AtlasBurn Institutional Risk Configuration
 * Authoritative constants for the probabilistic engine.
 */

export const INSTITUTIONAL_DEFAULTS = {
  MONTHLY_BURN_FLOOR: 20000,
  CAPITAL_RESERVES: 250000,
  COEFFICIENT_OF_VARIATION: 0.25,
  MONTHLY_GROWTH: 0.05,
  CHURN_RATE: 0.03,
  OUTAGE_PROBABILITY: 0.02,
  RETRY_CASCADE_PROBABILITY: 0.05,
  SIMULATION_RUNS: 10000,
};

export const RISK_LEVELS = {
  STRESS_CASE: 95, // P95
  MEDIAN_CASE: 50, // P50
  OPTIMISTIC_CASE: 5, // P5
};
