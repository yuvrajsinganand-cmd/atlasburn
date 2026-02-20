'use server';
/**
 * @fileOverview This file implements a Genkit flow to suggest cost optimizations for AI tool spending.
 *
 * - suggestCostOptimizations - A function that analyzes AI tool subscriptions and usage patterns
 *                             and generates suggestions for cost reduction.
 * - SuggestCostOptimizationsInput - The input type for the suggestCostOptimizations function.
 * - SuggestCostOptimizationsOutput - The return type for the suggestCostOptimizations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AISubscriptionSchema = z.object({
  name: z.string().describe('The name of the AI tool or service.'),
  provider: z.string().describe('The provider of the AI tool.'),
  monthlyCost: z.number().describe('The monthly cost of the subscription in USD.'),
  renewalDate: z
    .string()
    .describe('The renewal date of the subscription in YYYY-MM-DD format.'),
  apiUsage: z
    .number()
    .optional()
    .describe('Estimated or actual monthly API calls/tokens used.'),
  lastMonthUsageChange: z
    .number()
    .optional()
    .describe('Percentage change in usage from the previous month.'),
});

const AIToolUsageSchema = z.object({
  toolName: z.string().describe('The name of the AI tool.'),
  costPerTask: z.number().optional().describe('Average cost per task for this tool.'),
  totalTasks: z.number().optional().describe('Total number of tasks performed using this tool.'),
  costPerOutput: z.number().optional().describe('Average cost per unit of output (e.g., per 1000 tokens).'),
  trendAnalysis: z
    .string()
    .optional()
    .describe('Brief analysis of usage trends (e.g., increasing, decreasing, stable).'),
});

const SuggestCostOptimizationsInputSchema = z.object({
  subscriptions: z.array(AISubscriptionSchema).describe('List of current AI tool subscriptions.'),
  usagePatterns: z
    .array(AIToolUsageSchema)
    .describe('Detailed usage patterns for each AI tool.'),
  overallMonthlyBudget: z
    .number()
    .optional()
    .describe('The user\u0027s overall desired monthly budget for AI tools in USD.'),
});
export type SuggestCostOptimizationsInput = z.infer<
  typeof SuggestCostOptimizationsInputSchema
>;

const CostOptimizationSuggestionSchema = z.object({
  title: z.string().describe('A concise title for the suggestion.'),
  description: z.string().describe('A detailed explanation of the suggestion.'),
  estimatedMonthlySaving: z
    .number()
    .optional()
    .describe('Estimated monthly saving in USD if this suggestion is implemented.'),
  actionableSteps: z
    .array(z.string())
    .optional()
    .describe('A list of actionable steps to implement the suggestion.'),
});

const SuggestCostOptimizationsOutputSchema = z.object({
  suggestions: z
    .array(CostOptimizationSuggestionSchema)
    .describe('A list of cost optimization suggestions.'),
  overallSummary: z
    .string()
    .optional()
    .describe('An overall summary of the analysis and potential savings.'),
});
export type SuggestCostOptimizationsOutput = z.infer<
  typeof SuggestCostOptimizationsOutputSchema
>;

export async function suggestCostOptimizations(
  input: SuggestCostOptimizationsInput
): Promise<SuggestCostOptimizationsOutput> {
  return suggestCostOptimizationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCostOptimizationsPrompt',
  input: { schema: SuggestCostOptimizationsInputSchema },
  output: { schema: SuggestCostOptimizationsOutputSchema },
  prompt: `You are an expert AI tool cost optimization consultant. Your goal is to analyze the user's AI tool subscriptions and usage patterns, then provide concrete, actionable suggestions to reduce their monthly spending.

Here is the user's current AI tool data:

Subscriptions:
{{#each subscriptions}}
- Tool: {{{this.name}}}
  Provider: {{{this.provider}}}
  Monthly Cost: $\u007b{{this.monthlyCost}}\u007d
  Renewal Date: {{{this.renewalDate}}}
  {{#if this.apiUsage}}API Usage (monthly): {{{this.apiUsage}}} units{{/if}}
  {{#if this.lastMonthUsageChange}}Usage Change (last month): {{{this.lastMonthUsageChange}}}%{{/if}}
{{/each}}

Usage Patterns:
{{#each usagePatterns}}
- Tool: {{{this.toolName}}}
  {{#if this.costPerTask}}Cost per Task: $\u007b{{this.costPerTask}}\u007d{{/if}}
  {{#if this.totalTasks}}Total Tasks: {{{this.totalTasks}}}{{/if}}
  {{#if this.costPerOutput}}Cost per Output: $\u007b{{this.costPerOutput}}\u007d{{/if}}
  {{#if this.trendAnalysis}}Trend: {{{this.trendAnalysis}}}{{/if}}
{{/each}}

{{#if overallMonthlyBudget}}
The user has an overall desired monthly budget of $\u007b{{overallMonthlyBudget}}\u007d.
{{/if}}

Based on this data, provide specific and actionable suggestions to help the user optimize their AI tool spending and potentially reach their budget goals. Focus on identifying underutilized tools, opportunities to switch to cheaper alternatives, or ways to adjust usage for cost efficiency. For each suggestion, provide a title, a detailed description, an estimated monthly saving (if applicable), and clear actionable steps.
`,
});

const suggestCostOptimizationsFlow = ai.defineFlow(
  {
    name: 'suggestCostOptimizationsFlow',
    inputSchema: SuggestCostOptimizationsInputSchema,
    outputSchema: SuggestCostOptimizationsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
