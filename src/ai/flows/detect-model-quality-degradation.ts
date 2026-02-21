
'use server';
/**
 * @fileOverview A Genkit flow for detecting quality degradation in AI model outputs over time.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectModelQualityDegradationInputSchema = z.object({
  historicalOutputs: z.array(z.string()).describe('An array of previous AI model text outputs.'),
  currentOutput: z.string().describe('The latest AI model text output to be evaluated.'),
  qualityCriteria: z
    .string()
    .optional()
    .describe(
      'Optional criteria to use for evaluating quality (e.g., "coherence, relevance, factual accuracy").'
    ),
  degradationThresholdPercent: z
    .number()
    .min(0)
    .max(100)
    .default(5)
    .describe('The percentage drop in quality score that triggers a degradation alert.'),
});
export type DetectModelQualityDegradationInput = z.infer<typeof DetectModelQualityDegradationInputSchema>;

const DetectModelQualityDegradationOutputSchema = z.object({
  degradationDetected: z
    .boolean()
    .describe('True if significant quality degradation is detected based on the threshold, otherwise false.'),
  reasoning: z
    .string()
    .describe(
      'A detailed explanation of the quality assessment, including comparison between historical and current outputs.'
    ),
  historicalAverageQualityScore: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe('The estimated average quality score (out of 10) of the historical outputs.'),
  currentQualityScore: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe('The estimated quality score (out of 10) of the current output.'),
  qualityDropPercentage: z
    .number()
    .optional()
    .describe('The calculated percentage drop in quality from the historical average to the current output.'),
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
  \x60\x60\x60
  {{{this}}}
  \x60\x60\x60
{{/each}}

Latest Output:
\x60\x60\x60
{{currentOutput}}
\x60\x60\x60

Criteria: {{qualityCriteria}}.

1. Assess historical quality average (0-10).
2. Assess current quality (0-10).
3. Calculate % drop.
4. Compare drop against {{degradationThresholdPercent}}% threshold.

Reasoning should be thorough. Set degradationDetected if threshold is met.`,
});

const detectModelQualityDegradationFlow = ai.defineFlow(
  {
    name: 'detectModelQualityDegradationFlow',
    inputSchema: DetectModelQualityDegradationInputSchema,
    outputSchema: DetectModelQualityDegradationOutputSchema,
  },
  async input => {
    const {output} = await detectModelQualityDegradationPrompt(input);
    return output!;
  }
);

export async function detectModelQualityDegradation(
  input: DetectModelQualityDegradationInput
): Promise<DetectModelQualityDegradationOutput> {
  return detectModelQualityDegradationFlow(input);
}
