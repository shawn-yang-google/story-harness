import { MODELS, generateContent } from "../llm";
import type { HarnessContext, HarnessResult } from "../types";

/**
 * Executes an LLM-based harness (Tier 3).
 * Uses a cheap/fast model to evaluate the draft based on a prompt.
 */
export async function executeLlmHarness(
  prompt: string,
  draft: string,
  context: HarnessContext
): Promise<HarnessResult> {
  const fullPrompt = `
Harness Evaluation Prompt:
${prompt}

Draft to evaluate:
---
${draft}
---

Context:
Lore: ${JSON.stringify(context.loreDb)}
Previous Beats: ${context.previousBeats.join("\\n")}
Target Audience: ${context.targetAudience}

Respond ONLY with a JSON object in the following format:
{
  "valid": boolean,
  "feedback": string[]
}
`;

  const execute = async () => {
    const response = await generateContent(MODELS.EVALUATOR, fullPrompt, undefined, 0);
    return parseLlmResponse(response);
  };

  try {
    // Basic timeout handling (30s)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("LLM Harness execution timed out")), 30000)
    );

    return await Promise.race([execute(), timeoutPromise]);
  } catch (error) {
    // Retry once if it's a parse error
    if (error instanceof SyntaxError || error.message.includes("JSON")) {
       try {
         return await execute();
       } catch (secondError) {
         throw secondError;
       }
    }
    throw error;
  }
}

function parseLlmResponse(response: string): HarnessResult {
  try {
    // Try direct parse
    return JSON.parse(response.trim());
  } catch (e) {
    // Lenient extraction: find the first { and last }
    const start = response.indexOf("{");
    const end = response.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = response.substring(start, end + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (innerE) {
        throw new Error(`Failed to parse LLM response as JSON: ${response}`);
      }
    }
    throw new Error(`No JSON object found in LLM response: ${response}`);
  }
}
