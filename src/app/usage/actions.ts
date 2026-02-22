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

  // In a real scenario, we would fetch the ingestKey from Firestore here.
  // For the sandbox, we assume the environment is authorized.
  const sdk = withSleek(fakeLLM, {
    apiKey: "SANDBOX_TEST_KEY", // The API route handles sandbox validation
    projectId: userId,
    batchSize: 1 // Force immediate flush for the test UI
  });

  try {
    const response = await sdk.chat({
      model: modelName,
      messages: [{ role: 'user', content: 'Sandbox Test Event' }]
    });

    // Explicitly flush to ensure the UI sees the result immediately
    await sdk.flush();

    return { success: true, response };
  } catch (error: any) {
    console.error("Sandbox Test Action Error:", error);
    return { success: false, error: error.message };
  }
}
