import { generateContent, MODELS } from "../llm";

interface CriticResult {
  label: "good" | "bad";
  score: number;
  reasoning: string;
  flaws: string[];
}

/**
 * The Tier 4 Critic: Uses a strict LLM-as-Judge to evaluate narrative trajectories.
 * This is used to score the Tier 1 code harness.
 */
export async function evaluateNarrative(
  harnessType: string,
  text: string,
  targetAudience: string = "general"
): Promise<CriticResult> {
  const prompt = `
You are an expert narrative editor evaluating a story excerpt.
You are acting as the "${harnessType}".
Target Audience: ${targetAudience}

Evaluate the following excerpt strictly on the criteria of the ${harnessType}.
If it passes, label it "good". If it fails, label it "bad".
Output valid JSON only with the following schema:
{
  "label": "good" | "bad",
  "score": number, // 0.0 to 1.0 confidence/quality score
  "reasoning": string, // brief explanation
  "flaws": string[] // list of specific issues found, empty if good
}

Excerpt to evaluate:
---
${text}
---
`;

  try {
    const response = await generateContent(MODELS.CRITIC, prompt, "You are a JSON-only API. Respond with raw JSON, no markdown blocks.");
    
    // Parse the JSON. We might need to clean markdown blocks if the model ignored instructions.
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("\`\`\`json")) {
      cleanResponse = cleanResponse.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "").trim();
    } else if (cleanResponse.startsWith("\`\`\`")) {
      cleanResponse = cleanResponse.replace(/^\`\`\`/, "").replace(/\`\`\`$/, "").trim();
    }

    const result = JSON.parse(cleanResponse) as CriticResult;
    
    if (!["good", "bad"].includes(result.label) || typeof result.score !== "number") {
      throw new Error("Invalid schema returned by Critic LLM");
    }

    return result;
  } catch (err: any) {
    throw new Error(`Tier 2 Critic evaluation failed: ${err.message}`);
  }
}
