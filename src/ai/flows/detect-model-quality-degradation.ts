'use server';
/**
 * @fileOverview A Genkit flow for detecting quality degradation in AI model outputs over time.
 *
 * - detectModelQualityDegradation - A function that handles the detection of model output degradation.
 * - DetectModelQualityDegradationInput - The input type for the detectModelQualityDegradation function.
 * - DetectModelQualityDegradationOutput - The return type for the detectModelQualityDegradation function.
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
      'Optional criteria to use for evaluating quality (e.g., "coherence, relevance, factual accuracy"). If not provided, general quality aspects will be considered.'
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
  input: {schema: DetectModelQualityDegectModelQualityDegradationInputSchema},
  output: {schema: DetectModelQualityDegradationOutputSchema},
  prompt: `You are an AI quality monitoring agent. Your task is to analyze the quality of AI model outputs over time and detect any significant degradation.

Here are examples of past AI model outputs that represent the baseline quality:
{{#each historicalOutputs}}
- Output {{math @index "+" 1}}:
  ```
  {{{this}}}
  ```
{{/each}}

Here is the latest AI model output to evaluate:
```
{{{currentOutput}}}
```

Consider the following criteria for evaluating quality: {{{qualityCriteria}}}.
(If no specific criteria are provided, focus on general aspects like coherence, relevance, completeness, and factual accuracy.)

1.  Assess the overall quality of the historical outputs and provide an estimated average quality score out of 10.
2.  Assess the quality of the current output and provide a quality score out of 10.
3.  Calculate the percentage drop in quality from the historical average to the current output.
4.  Determine if the current output's quality score has dropped by more than {{degradationThresholdPercent}}% compared to the historical average.

Provide a detailed reasoning for your assessment, including the calculated quality scores and the percentage drop. Set 'degradationDetected' to true if the drop exceeds the threshold, otherwise false.`,
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
