'use server';
/**
 * @fileOverview A Genkit flow for detecting quality degradation in AI model outputs over time.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectModelQualityDegradationInputSchema = z.object({
  historicalOutputs: z.array(z.string()).describe('An array of previous AI model text outputs.'),
  currentOutput: z.string().describe('The latest AI model text output to be evaluated.'),
  qualityCriteria: z.string().optional().describe('Optional criteria to use for evaluating quality.'),
  degradationThresholdPercent: z.number().min(0).max(100).default(5).describe('The percentage drop that triggers a degradation alert.'),
});
export type DetectModelQualityDegradationInput = z.infer<typeof DetectModelQualityDegradationInputSchema>;

const DetectModelQualityDegradationOutputSchema = z.object({
  degradationDetected: z.boolean().describe('True if significant quality degradation is detected.'),
  reasoning: z.string().describe('A detailed explanation of the quality assessment.'),
  historicalAverageQualityScore: z.number().min(0).max(10).optional().describe('The estimated average quality score of the historical outputs.'),
  currentQualityScore: z.number().min(0).max(10).optional().describe('The estimated quality score of the current output.'),
  qualityDropPercentage: z.number().optional().describe('The calculated percentage drop in quality.'),
});
export type DetectModelQualityDegradationOutput = z.infer<typeof DetectModelQualityDegradationOutputSchema>;

const detectModelQualityDegradationPrompt = ai.definePrompt({
  name: 'detectModelQualityDegradationPrompt',
  input: {schema: DetectModelQualityDegradationInputSchema},
  output: {schema: DetectModelQualityDegradationOutputSchema},
  prompt: `You are an AI quality monitoring agent. Your task is to analyze the quality of AI model outputs over time and detect any significant degradation.

Historical Outputs:
{{#each historicalOutputs}}
- Output {{@index}}:
  \`\`\`
  {{{this}}}
  \`\`\`
{{/each}}

Latest Output:
\`\`\`
{{currentOutput}}
\`\`\`

Criteria: {{qualityCriteria}}.

1. Assess historical quality average (0-10).
2. Assess current quality (0-10).
3. Calculate % drop.
4. Compare drop against {{degradationThresholdPercent}}% threshold.

Set degradationDetected if threshold is met. Provide thorough reasoning.`,
});

export async function detectModelQualityDegradation(input: DetectModelQualityDegradationInput): Promise<DetectModelQualityDegradationOutput> {
  const { output } = await detectModelQualityDegradationPrompt(input);
  if (!output) throw new Error('Failed to generate quality assessment.');
  return output;
}