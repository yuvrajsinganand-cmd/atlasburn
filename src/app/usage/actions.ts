
'use server';

/**
 * @fileOverview Server Action for the Phase 1 Test Lab.
 * This bridge allows the client-side UI to trigger a secure server-side SDK call.
 */

import { withSleek, fakeLLM } from "@/lib/sleek-sdk";

export async function runSleekSandboxTest(userId: string, subId: string, modelName: string) {
  if (!userId || !subId) {
    throw new Error("Unauthorized: Missing identity context.");
  }

  // Use a modified fakeLLM that introduces random usage variance for testing
  const stochasticLLM = {
    async chat(payload: { model: string }): Promise<any> {
      // Simulate real-world variance: 500 to 5000 tokens
      const prompt_tokens = Math.floor(Math.random() * 4000) + 500;
      const completion_tokens = Math.floor(Math.random() * 2000) + 200;
      
      await new Promise(r => setTimeout(r, 100));
      return {
        usage: { prompt_tokens, completion_tokens },
        output: `AtlasBurn Stochastic Sandbox Response for ${payload.model}`
      };
    }
  };

  const sdk = withSleek(stochasticLLM, {
    apiKey: "SANDBOX_TEST_KEY", 
    projectId: userId,
    batchSize: 1 // Force immediate flush for testing feedback
  });

  try {
    const response = await sdk.chat({
      model: modelName,
      messages: [{ role: 'user', content: 'Forensic System Stress Test' }],
      featureId: 'sandbox_test_lab',
      userTier: 'pro'
    });

    // Ensure the data hits Firestore immediately for the UI to react
    await sdk.flush();

    return { success: true, response };
  } catch (error: any) {
    console.error("Sandbox Test Action Error:", error);
    return { success: false, error: error.message };
  }
}
