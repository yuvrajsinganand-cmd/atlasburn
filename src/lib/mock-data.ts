export const MOCK_SUBSCRIPTIONS = [
  {
    id: '1',
    name: 'ChatGPT Plus',
    provider: 'OpenAI',
    monthlyCost: 20,
    renewalDate: '2024-06-15',
    apiUsage: 450000, // tokens
    lastMonthUsageChange: 12.5,
  },
  {
    id: '2',
    name: 'Claude Pro',
    provider: 'Anthropic',
    monthlyCost: 20,
    renewalDate: '2024-06-22',
    apiUsage: 250000,
    lastMonthUsageChange: -5.2,
  },
  {
    id: '3',
    name: 'Midjourney Basic',
    provider: 'Midjourney',
    monthlyCost: 10,
    renewalDate: '2024-06-10',
    apiUsage: 50, // images
    lastMonthUsageChange: 0,
  },
  {
    id: '4',
    name: 'Perplexity Pro',
    provider: 'Perplexity AI',
    monthlyCost: 20,
    renewalDate: '2024-07-01',
    apiUsage: 1200, // queries
    lastMonthUsageChange: 25.4,
  }
];

export const MOCK_USAGE_PATTERNS = [
  {
    toolName: 'ChatGPT Plus',
    costPerTask: 0.15,
    totalTasks: 450,
    costPerOutput: 0.002, // per 1k tokens
    trendAnalysis: 'Increasing frequency in developer support tasks.'
  },
  {
    toolName: 'Claude Pro',
    costPerTask: 0.22,
    totalTasks: 180,
    costPerOutput: 0.005,
    trendAnalysis: 'Stable usage for long-form content generation.'
  },
  {
    toolName: 'Midjourney Basic',
    costPerTask: 0.20,
    totalTasks: 50,
    costPerOutput: 0.20,
    trendAnalysis: 'Occasional burst usage for marketing assets.'
  }
];

export const MOCK_BUDGET = {
  overallMonthlyBudget: 100,
  spentSoFar: 70,
  alerts: [
    { threshold: 80, triggered: false },
    { threshold: 50, triggered: true }
  ]
};

export const MOCK_VENDOR_RISK = [
  { provider: 'OpenAI', percentage: 45 },
  { provider: 'Anthropic', percentage: 25 },
  { provider: 'Perplexity', percentage: 20 },
  { provider: 'Midjourney', percentage: 10 }
];