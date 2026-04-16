import { writeFile } from "fs/promises";
import { TreeManager } from "./tree";
import { generateContent, MODELS } from "../llm";
import { executeHarnessInSandbox } from "../environment/sandbox";
import { executeLlmHarness } from "../environment/llm-harness";
import { executeHybridHarness } from "../environment/hybrid-harness";
import type { HybridDomain } from "../environment/hybrid-harness";
import type { Trajectory, HarnessContext, FailedExample } from "../types";

export interface SynthesizerOptions {
  maxIterations: number;
  tsWeight: number;
  auto: boolean;
  treeStatePath: string;
  logPath: string;
  mode: "code" | "prompt" | "hybrid";
}

export class HarnessSynthesizer {
  private tree: TreeManager;
  private consecutiveHighScores = 0;

  constructor(
    private harnessName: string,
    private trajectories: Trajectory[],
    private options: SynthesizerOptions
  ) {
    this.tree = new TreeManager();
  }

  getTree() {
    return this.tree;
  }

  async run() {
    console.log(`Starting Synthesizer for ${this.harnessName} in ${this.options.mode} mode`);
    console.log(`Total Trajectories: ${this.trajectories.length}`);

    for (let i = 0; i < this.options.maxIterations; i++) {
      console.log(`\n--- Iteration ${i + 1}/${this.options.maxIterations} ---`);

      // 1. Select node using Thompson Sampling
      const parentId = this.tree.selectNodeToExpand(this.options.tsWeight);
      const parentNode = this.tree.getNode(parentId)!;

      // 2. Generate / Refine Content (Code or Prompt)
      console.log(`Selected parent node: ${parentId} (H=${parentNode.heuristicValue.toFixed(2)})`);
      const newHarness = this.options.mode === "code" 
        ? await this.generateRefinedCode(parentNode.code, parentNode.failedExamples)
        : this.options.mode === "hybrid"
        ? await this.generateRefinedHybrid(parentNode.code, parentNode.failedExamples)
        : await this.generateRefinedPrompt(parentNode.code, parentNode.failedExamples);
      
      // 3. Add to tree
      const childId = this.tree.addNode(parentId, newHarness);

      // 4. Evaluate against environment (trajectories)
      const evaluation = await this.evaluateNode(newHarness);
      
      // 5. Calculate Penalty
      let penalty = 0;
      if (this.options.mode === "prompt" && newHarness.length > 8000) {
        const excess = newHarness.length - 8000;
        penalty = Math.min(0.5, excess / 4000); // Max penalty 0.5
        console.log(`Applied length penalty: -${penalty.toFixed(2)} (Length: ${newHarness.length})`);
      }

      // 6. Update score
      this.tree.updateScore(childId, evaluation.correct, evaluation.total, evaluation.failedExamples, penalty);

      const childNode = this.tree.getNode(childId)!;
      console.log(`Node ${childId} scored ${evaluation.correct}/${evaluation.total} (H=${childNode.heuristicValue.toFixed(2)})`);

      // 7. State Persistence & Logging
      await this.saveState(i, childId, childNode.heuristicValue);

      // 8. Convergence Check
      if (childNode.heuristicValue >= 0.95) {
        this.consecutiveHighScores++;
      } else {
        this.consecutiveHighScores = 0;
      }

      if (this.consecutiveHighScores >= 3) {
        console.log("Convergence reached (H >= 0.95 for 3 consecutive iterations).");
        break;
      }

      if (!this.options.auto) {
        // Human in the loop pause could be implemented here using readline
        console.log("Interactive mode: (Paused in real implementation)");
      }
    }
  }

  private async generateRefinedCode(parentCode: string, failedExamples: FailedExample[] = []): Promise<string> {
    const failedExamplesText = failedExamples.length > 0 
      ? "\\nThe previous code failed on the following examples:\\n" + failedExamples.map(e => `- Trajectory: "${e.trajectory}"\\n  Expected Label: ${e.expected}\\n  Failure Reason: ${e.actual}\\n  Feedback: ${e.feedback}`).join("\\n\\n")
      : "";

    const prompt = `
You are an expert TypeScript engineer writing a logic harness for narrative evaluation.
Your task is to write or refine the code for '${this.harnessName}'.

The code must expose exactly one async function:
\`\`\`typescript
async function evaluate(draft: string, context: HarnessContext): Promise<{valid: boolean, feedback: string[], rewrittenDraft?: string}>
\`\`\`

Stretch Goal (Harness-as-Policy):
Your code can optionally return a 'rewrittenDraft' string that directly fixes the flaws in the text using deterministic rules (e.g. regex replacement), allowing it to pass validation without needing an LLM retry.

Current code (if any):
\`\`\`javascript
${parentCode}
\`\`\`
${failedExamplesText}

Write the FULL, complete JavaScript code for the new harness. 
Do not wrap it in markdown. Do not include explanatory text. Just the raw JS code.
`;

    const response = await generateContent(MODELS.REFINER, prompt);
    if (!response) {
      throw new Error("Refiner LLM returned empty or undefined response.");
    }
    return this.cleanCode(response);
  }

  private async generateRefinedPrompt(parentPrompt: string, failedExamples: FailedExample[] = []): Promise<string> {
    const failedExamplesText = failedExamples.length > 0 
      ? "\\nThe previous prompt failed on the following examples (disagreed with ground truth):\\n" + failedExamples.map(e => `- Trajectory: "${e.trajectory}"\\n  Expected Label: ${e.expected}\\n  Failure Reason: ${e.actual}\\n  Feedback: ${e.feedback}`).join("\\n\\n")
      : "";

    const prompt = `
You are an expert prompt engineer. Your goal is to write a high-accuracy evaluation prompt for a narrative harness named '${this.harnessName}'.
This prompt will be used by a fast LLM (Gemini 3.1 Flash Lite) to judge story drafts.

Current prompt (if any):
---
${parentPrompt || "None"}
---
${failedExamplesText}

Instructions for the new prompt:
1. It should clearly define the criteria for a "valid" draft.
2. It should be concise (keep it under 1500 tokens).
3. It should be optimized for Flash-Lite-Preview.
4. It should explicitly tell the LLM how to reason about context and lore.

Write ONLY the content of the evaluation prompt. Do not include instructions about JSON formatting (that is handled by the executor).
`;

    const response = await generateContent(MODELS.REFINER, prompt);
    if (!response) {
      throw new Error("Refiner LLM returned empty or undefined response.");
    }

    // Add length penalty check here if needed in the future, but for now just return
    return response.trim();
  }

  private async generateRefinedHybrid(parentHybrid: string, failedExamples: FailedExample[] = []): Promise<string> {
    const failedExamplesText = failedExamples.length > 0
      ? "\nThe previous hybrid harness failed on the following examples:\n" + failedExamples.map(e => `- Trajectory: "${e.trajectory}"\n  Expected Label: ${e.expected}\n  Failure Reason: ${e.actual}\n  Feedback: ${e.feedback}`).join("\n\n")
      : "";

    const prompt = `
You are an expert in formal narrative logic verification.
Your task is to improve a hybrid harness for '${this.harnessName}'.

A hybrid harness has two parts:
1. EXTRACTION ADDENDUM: Additional instructions for the LLM that extracts a LogicGraph from narrative text.
   The base extraction prompt already handles standard propositions, events, knowledge, abilities,
   obligations, prohibitions, world rules, inventory, locations, and statuses.
   Your addendum should add domain-specific extraction hints for this particular harness.

2. VERIFICATION CODE: JavaScript code that receives a LogicGraph object and HarnessContext,
   and returns additional CheckResult[] objects beyond the 6 built-in checkers
   (propositional, temporal, epistemic, deontic, entity, causal).

Current harness:
\`\`\`json
${parentHybrid || '{"extractionPromptAddendum": "", "verificationCode": ""}'}
\`\`\`
${failedExamplesText}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "extractionPromptAddendum": "Additional extraction instructions...",
  "verificationCode": "function verify(graph, context) { var results = []; /* custom checks */ return results; }"
}
`;

    const response = await generateContent(MODELS.REFINER, prompt);
    if (!response) {
      throw new Error("Refiner LLM returned empty or undefined response.");
    }

    // Extract JSON from response
    let clean = response.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json/, "").replace(/```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```/, "").replace(/```$/, "");
    }
    clean = clean.trim();

    // Validate it's parseable JSON
    try {
      JSON.parse(clean);
    } catch {
      // If the LLM returned invalid JSON, wrap in default structure
      clean = JSON.stringify({ extractionPromptAddendum: "", verificationCode: "" });
    }

    return clean;
  }

  private cleanCode(code: string): string {
    let clean = code.trim();
    if (clean.startsWith("```javascript")) {
      clean = clean.replace(/^```javascript/, "").replace(/```$/, "");
    } else if (clean.startsWith("```js")) {
      clean = clean.replace(/^```js/, "").replace(/```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```/, "").replace(/```$/, "");
    }
    return clean.trim();
  }

  private async evaluateNode(harness: string): Promise<{ correct: number; total: number; failedExamples: FailedExample[] }> {
    let correct = 0;
    const failedExamples: FailedExample[] = [];

    const context: HarnessContext = {
      loreDb: {},
      previousBeats: [],
      targetAudience: "general",
    };

    for (const trajectory of this.trajectories) {
      let isHarnessVerdictValid = false;
      let feedback: string[] = [];
      let execError: string | null = null;

      try {
        let result;
        if (this.options.mode === "code") {
          result = await executeHarnessInSandbox(harness, trajectory.text, context);
        } else if (this.options.mode === "hybrid") {
          const parsed = JSON.parse(harness);
          const domain = parsed.domain || this.inferDomain();
          result = await executeHybridHarness(
            parsed.extractionPromptAddendum || "",
            parsed.verificationCode || "",
            trajectory.text,
            context,
            domain
          );
        } else {
          result = await executeLlmHarness(harness, trajectory.text, context);
        }
        
        // Compare harness verdict with ground-truth trajectory label
        const expectedValid = trajectory.label === "good";
        
        if (result.valid === expectedValid) {
          correct++;
          isHarnessVerdictValid = true;
        } else {
          feedback = result.feedback;
        }
      } catch (err: any) {
        // Execution failed
        execError = err.message;
      }

      if (!isHarnessVerdictValid && failedExamples.length < 5) {
        failedExamples.push({
          trajectory: trajectory.text,
          expected: trajectory.label,
          actual: execError ? "Execution Error" : (trajectory.label === "good" ? "Rejected incorrectly" : "Accepted incorrectly"),
          feedback: execError || feedback.join(", "),
        });
      }
    }

    return { correct, total: this.trajectories.length, failedExamples };
  }

  private async saveState(iteration: number, nodeId: string, hValue: number) {
    if (this.options.treeStatePath !== "/dev/null") {
      await writeFile(this.options.treeStatePath, this.tree.serialize(), "utf-8");
    }

    if (this.options.logPath !== "/dev/null") {
      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        iteration,
        nodeId,
        heuristicValue: hValue,
      }) + "\n";
      
      const fs = await import("fs/promises");
      await fs.appendFile(this.options.logPath, logEntry);
    }
  }

  private inferDomain(): HybridDomain {
    const lower = this.harnessName.toLowerCase();
    if (lower.includes("dialogue")) return "dialogue";
    if (lower.includes("character")) return "character";
    if (lower.includes("narrative") || lower.includes("story")) return "narrative";
    return "logic";
  }
}
