'use server';
/**
 * @fileOverview An AI tool recommendation agent.
 *
 * - recommendAiTools - A function that recommends suitable AI tools for a given task.
 * - RecommendAiToolsInput - The input type for the recommendAiTools function.
 * - RecommendAiToolsOutput - The return type for the recommendAiTools function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendAiToolsInputSchema = z.object({
  taskDescription: z.string().describe('A detailed description of the task or need.'),
  costPreference: z
    .enum(['low', 'medium', 'high'])
    .describe('User preference for cost-effectiveness (low, medium, or high).'),
  performancePreference: z
    .enum(['high', 'medium', 'balanced'])
    .describe('User preference for performance (high, medium, or balanced).'),
});
export type RecommendAiToolsInput = z.infer<typeof RecommendAiToolsInputSchema>;

const RecommendAiToolsOutputSchema = z.object({
  recommendations: z
    .array(
      z.object({
        toolName: z.string().describe('The name of the recommended AI tool.'),
        toolDescription: z.string().describe('A brief description of the AI tool.'),
        costEffectivenessRating:
          z.string().describe('Estimated cost-effectiveness rating (e.g., "Very High", "High", "Medium", "Low").'),
        performanceRating:
          z.string().describe('Estimated performance rating (e.g., "Excellent", "Good", "Fair", "Poor").'),
        reasoning: z.string().describe('Detailed reasoning for the recommendation based on the input criteria.'),
      })
    )
    .describe('A list of recommended AI tools.'),
});
export type RecommendAiToolsOutput = z.infer<typeof RecommendAiToolsOutputSchema>;

export async function recommendAiTools(input: RecommendAiToolsInput): Promise<RecommendAiToolsOutput> {
  return recommendAiToolsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendAiToolsPrompt',
  input: {schema: RecommendAiToolsInputSchema},
  output: {schema: RecommendAiToolsOutputSchema},
  prompt: `You are an expert AI tool recommender.
Your task is to analyze a user's specific task or need and recommend suitable AI tools.
Consider factors like cost-effectiveness and performance based on the user's preferences.
Provide a list of recommendations, and for each, include its name, a brief description, an estimated cost-effectiveness rating, an estimated performance rating, and a clear reasoning for why it's recommended given the user's input.

User Task: {{{taskDescription}}}
Cost Preference: {{{costPreference}}}
Performance Preference: {{{performancePreference}}}

Provide your recommendations in the specified JSON format.`,
});

const recommendAiToolsFlow = ai.defineFlow(
  {
    name: 'recommendAiToolsFlow',
    inputSchema: RecommendAiToolsInputSchema,
    outputSchema: RecommendAiToolsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to get recommendations from the AI model.');
    }
    return output;
  }
);
