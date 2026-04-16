import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { generateContent, MODELS } from "../llm";
import { executeHarnessInSandbox } from "../environment/sandbox";
import { executeLlmHarness } from "../environment/llm-harness";
import { executeHybridHarness } from "../environment/hybrid-harness";
import type { HybridDomain } from "../environment/hybrid-harness";
import type { HarnessContext } from "../types";

// ANSI color codes for terminal output
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  boldGreen: "\x1b[1;32m",
  boldRed: "\x1b[1;31m",
  boldCyan: "\x1b[1;36m",
  boldMagenta: "\x1b[1;35m",
  boldYellow: "\x1b[1;33m",
  boldBlue: "\x1b[1;34m",
};

export interface RunnerOptions {
  harnessDirectory: string;
  maxRetries: number;
  loreDb: Record<string, any>;
  targetAudience: string;
  logDirectory?: string;
}

export interface LoadedHarnesses {
  code: string[];
  prompts: string[];
  hybrid: Array<{ extractionPromptAddendum: string; verificationCode: string; domain: HybridDomain }>;
}

interface DiffEntry {
  original: string;
  revised: string;
}

interface AttemptLog {
  attempt: number;
  round: number;
  patchInRound: number | null;
  draft: string;
  valid: boolean;
  feedback: string[];
  diffs: DiffEntry[];
  timestamp: string;
  /** Extracted knowledge graphs keyed by domain (e.g., "logic", "dialogue") */
  graphs?: Record<string, unknown>;
}

export class RejectionSamplingRunner {
  private previousBeats: string[] = [];

  constructor(private options: RunnerOptions) {}

  getPreviousBeats(): string[] {
    return this.previousBeats;
  }

  async generateScene(prompt: string): Promise<string> {
    const harnesses = await this.loadHarnesses();
    const attemptLogs: AttemptLog[] = [];
    let attemptCounter = 0;
    const maxPatchesPerRound = 10;

    const context: HarnessContext = {
      loreDb: this.options.loreDb,
      previousBeats: this.previousBeats,
      targetAudience: this.options.targetAudience,
    };

    // Generate initial draft
    const initialPrompt = [
      "You are an expert story generator. Write a COMPLETE scene based on the following prompt.",
      "",
      "Requirements:",
      "- Length: 800-1500 words.",
      "- Structure: The scene must have a clear beginning, middle, and ending.",
      "- Ending: The scene must resolve or reach a turning point — do NOT end mid-action or trail off.",
      "- Target Audience: " + this.options.targetAudience,
      "",
      "Previous story beats:",
      this.previousBeats.length > 0 ? this.previousBeats.map((b, i) => (i + 1) + ". " + b).join("\n") : "None",
      "",
      "Prompt:",
      prompt,
    ].join("\n");

    console.log(c.dim + "Generating initial draft..." + c.reset);
    let currentDraft = await generateContent(MODELS.GENERATOR, initialPrompt);
    if (!currentDraft) {
      throw new Error("Generator LLM returned empty or undefined response.");
    }

    // Outer loop: validation rounds
    // Rounds 1 to N-1: Tier 2 + 3 only (structural/logic/dialogue — no style noise)
    // Round N (final): All tiers (add Tier 1 style polish)
    for (let round = 1; round <= this.options.maxRetries; round++) {
      const isFinalRound = round === this.options.maxRetries;
      const label = isFinalRound ? "Final Polish (All Tiers)" : "Substantive Check (Tier 2+3)";
      console.log(`\n${c.boldCyan}=== Round ${round}/${this.options.maxRetries} — ${label} ===${c.reset}`);

      const hasSubstantiveHarnesses = harnesses.hybrid.length > 0 || harnesses.prompts.length > 0;

      // If no substantive harnesses exist, skip to final round (all gates)
      const runAllTiers = isFinalRound || !hasSubstantiveHarnesses;
      const { valid, feedback, draft, graphs } = runAllTiers
        ? await this.runAllGates(harnesses, currentDraft, context)
        : await this.runSubstantiveGates(harnesses, currentDraft, context);
      currentDraft = draft;
      attemptCounter++;

      attemptLogs.push({
        attempt: attemptCounter,
        round,
        patchInRound: null,
        draft: currentDraft,
        valid,
        feedback,
        diffs: [],
        timestamp: new Date().toISOString(),
        graphs: Object.keys(graphs).length > 0 ? graphs : undefined,
      });

      if (valid) {
        console.log(c.boldGreen + "✓ Draft accepted!" + c.reset);
        this.previousBeats.push(currentDraft);
        await this.saveLog(prompt, attemptLogs);
        return currentDraft;
      }

      // Separate structural issues from line-level issues
      const structuralPatterns = [
        "no_subtext", "no_conflict", "no_obstacle", "cement_block",
        "exposition_dump", "unearned_emotion",
      ];
      const structuralIssues = feedback.filter(f =>
        structuralPatterns.some(p => f.includes(p))
      );
      const lineIssues = feedback.filter(f =>
        !structuralPatterns.some(p => f.includes(p)) &&
        !f.startsWith("⚠") && // Skip infrastructure warnings (API unavailable etc.)
        !f.includes("Harness failed:") && // Skip harness execution failures (503, timeout)
        !f.includes("Harness skipped") // Skip skipped harnesses
      );

      // Prioritize: structural first (Tier 2 errors), then line-level (Tier 1 style)
      // Sort line issues: Tier 2 checker results before Tier 1 keyword/style checks
      lineIssues.sort((a, b) => {
        const aIsTier2 = a.startsWith("[");
        const bIsTier2 = b.startsWith("[");
        if (aIsTier2 && !bIsTier2) return -1;
        if (!aIsTier2 && bIsTier2) return 1;
        return 0;
      });

      let patchCounter = 0;

      // Phase 1: Structural rewrite for scene-level issues (if any)
      if (structuralIssues.length > 0) {
        patchCounter++;
        console.log(`\n  ${c.boldMagenta}[Structural Rewrite]${c.reset} Addressing ${structuralIssues.length} scene-level issue(s):`);
        for (const si of structuralIssues) {
          console.log("    " + c.dim + "- " + si.slice(0, 90) + c.reset);
        }

        const rewritePrompt = [
          "You are an expert story editor specializing in scene-level craft: subtext, conflict, character depth, and dramatic structure.",
          "",
          "The following draft has STRUCTURAL issues that cannot be fixed with simple find-and-replace. You must rewrite the entire scene while preserving its core plot events, setting, and character names.",
          "",
          "## Current Draft",
          "---",
          currentDraft,
          "---",
          "",
          "## Structural Issues to Address",
          ...structuralIssues.map((s, i) => `${i + 1}. ${s}`),
          "",
          "## Rewrite Guidelines",
          "- PRESERVE: all characters, the setting, the murder mystery setup, and the core sequence of events.",
          "- FIX: the listed structural issues by reworking dialogue, character interactions, and scene dynamics.",
          "- For 'no_subtext': make characters say one thing but mean another. Use indirection, implication, and subtext.",
          "- For 'no_conflict': add interpersonal tension, competing goals, or obstacles that create dramatic friction.",
          "- For 'cement_block': show a gap between a character's social mask and their true nature under pressure.",
          "- For 'exposition_dump': dramatize information through action and conflict rather than telling.",
          "- For 'unearned/disproportionate_emotion': set up emotional beats with proper buildup and stakes.",
          "",
          "Return ONLY the complete rewritten scene text. No commentary, no markdown headers.",
        ].join("\n");

        try {
          const rewritten = await generateContent(MODELS.GENERATOR, rewritePrompt);
          if (rewritten && rewritten.trim().length > 100) {
            currentDraft = rewritten.trim();
            console.log("    " + c.green + "✓ Scene rewritten (" + currentDraft.split(/\s+/).length + " words)" + c.reset);

            attemptCounter++;
            attemptLogs.push({
              attempt: attemptCounter,
              round,
              patchInRound: patchCounter,
              draft: currentDraft,
              valid: false,
              feedback: structuralIssues,
              diffs: [{ original: "(structural rewrite)", revised: "(full scene)" }],
              timestamp: new Date().toISOString(),
            });
          } else {
            console.log("    " + c.yellow + "Structural rewrite returned insufficient content, skipping" + c.reset);
          }
        } catch (err: any) {
          console.log("    " + c.red + "Structural rewrite failed: " + err.message + c.reset);
        }
      }

      // Phase 2: Line-level patches for remaining issues
      let remainingFeedback = [...lineIssues];
      const linePatchBudget = Math.min(maxPatchesPerRound - patchCounter, remainingFeedback.length);
      for (let patch = 0; patch < linePatchBudget && remainingFeedback.length > 0; patch++) {
        patchCounter++;
        const issue = remainingFeedback[0];
        console.log(`\n  ${c.boldBlue}[Patch ${patchCounter}/${linePatchBudget + (structuralIssues.length > 0 ? 1 : 0)}]${c.reset} Fixing: ${c.dim}${issue.slice(0, 80)}...${c.reset}`);

        const patchPrompt = [
          "You are an expert story editor. Below is a draft that has a specific issue.",
          "Fix ONLY the described issue by returning the minimal text replacements needed.",
          "",
          "## Current Draft",
          "---",
          currentDraft,
          "---",
          "",
          "## Issue to Fix",
          issue,
          "",
          "## Instructions",
          "Return ONLY the text replacements in this exact format (you may include multiple blocks):",
          "",
          "ORIGINAL:",
          "<exact text from the draft to replace — copy it verbatim>",
          "REVISED:",
          "<the new text that fixes the issue>",
          "",
          "Rules:",
          "- Copy the ORIGINAL text EXACTLY as it appears (including punctuation and whitespace).",
          "- Make the MINIMAL change needed. Do not rewrite unrelated sections.",
          "- Include enough context in ORIGINAL to uniquely identify the location (at least the full sentence).",
          "- If the fix requires inserting new text, use an adjacent sentence as ORIGINAL and include it in REVISED with the new text.",
          "- If no text change can fix this issue (e.g., structural feedback), return: NO_CHANGE",
        ].join("\n");

        try {
          const response = await generateContent(MODELS.GENERATOR, patchPrompt);
          if (response) {
            const { patched, diffs } = applyDiffPatches(currentDraft, response);
            if (diffs.length > 0) {
              currentDraft = patched;
              console.log("    " + c.green + "Applied " + diffs.length + " replacement(s)" + c.reset);
              for (const d of diffs) {
                const preview = d.original.slice(0, 60).replace(/\n/g, " ");
                console.log("    " + c.dim + "- \"" + preview + "...\" → replaced" + c.reset);
              }
            } else {
              console.log("    " + c.yellow + "No applicable diffs found in response" + c.reset);
            }

            attemptCounter++;
            attemptLogs.push({
              attempt: attemptCounter,
              round,
              patchInRound: patchCounter,
              draft: currentDraft,
              valid: false,
              feedback: [issue],
              diffs,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          console.log("    " + c.red + "Patch failed: " + err.message + c.reset);
        }

        remainingFeedback = remainingFeedback.slice(1);
      }
    }

    await this.saveLog(prompt, attemptLogs);
    throw new Error(`Failed to generate a valid scene after ${this.options.maxRetries} rounds.`);
  }

  /**
   * Runs only Tier 2 (hybrid) and Tier 3 (prompt) gates.
   * Used in rounds 1 to N-1 to focus on structural/logic/dialogue fixes
   * without wasting effort on style checks that will be invalidated by rewrites.
   */
  private async runSubstantiveGates(
    harnesses: LoadedHarnesses,
    inputDraft: string,
    context: HarnessContext
  ): Promise<{ valid: boolean; feedback: string[]; draft: string; graphs: Record<string, unknown> }> {
    let allValid = true;
    const tier2Feedback: Map<string, string[]> = new Map();
    const tier3Feedback: string[] = [];
    const allGraphs: Record<string, unknown> = {};
    const currentDraft = inputDraft;

    // Gate 2: Hybrid harnesses
    if (harnesses.hybrid.length > 0) {
      const hybridResults = await Promise.allSettled(
        harnesses.hybrid.map(h =>
          executeHybridHarness(h.extractionPromptAddendum, h.verificationCode, currentDraft, context, h.domain)
            .then(r => ({ ...r, domain: h.domain }))
        )
      );

      for (let i = 0; i < hybridResults.length; i++) {
        const result = hybridResults[i];
        const domain = harnesses.hybrid[i].domain;
        if (result.status === "fulfilled") {
          if (result.value.graphs) {
            Object.assign(allGraphs, result.value.graphs);
          }
          if (!result.value.valid) {
            allValid = false;
            const existing = tier2Feedback.get(domain) || [];
            existing.push(...result.value.feedback);
            tier2Feedback.set(domain, existing);
          }
        } else {
          const errMsg = String(result.reason);
          const existing = tier2Feedback.get(domain) || [];
          if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("timeout") || errMsg.includes("timed out")) {
            existing.push("⚠ Hybrid Harness skipped (API unavailable). Will retry next round.");
          } else {
            allValid = false;
            existing.push("Hybrid Harness failed: " + errMsg);
          }
          tier2Feedback.set(domain, existing);
        }
      }
    }

    // Gate 3: Prompt harnesses
    if (harnesses.prompts.length > 0) {
      const llmResults = await Promise.allSettled(
        harnesses.prompts.map(p => executeLlmHarness(p, currentDraft, context))
      );

      for (const result of llmResults) {
        if (result.status === "fulfilled") {
          if (!result.value.valid) {
            allValid = false;
            tier3Feedback.push(...result.value.feedback);
          }
        } else {
          // API failures (503, timeout, network) are infrastructure issues,
          // not story quality failures. Log a warning but don't block acceptance.
          const errMsg = String(result.reason);
          if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("timeout") || errMsg.includes("timed out")) {
            tier3Feedback.push("⚠ LLM Harness skipped (API unavailable). Will retry next round.");
          } else {
            allValid = false;
            tier3Feedback.push("LLM Harness failed: " + errMsg);
          }
        }
      }
    }

    // Format output
    const allFeedback: string[] = [];
    if (!allValid) {
      const totalIssues = Array.from(tier2Feedback.values()).reduce((sum, v) => sum + v.length, 0) + tier3Feedback.length;
      console.log(c.boldRed + "Substantive check found " + totalIssues + " issue(s):" + c.reset);

      if (tier2Feedback.size > 0) {
        console.log("  " + c.boldMagenta + "Tier 2 (hybrid):" + c.reset);
        for (const [domain, issues] of tier2Feedback) {
          console.log("    " + c.dim + domain + ":" + c.reset);
          for (const f of issues) {
            const color = f.includes("/warning]") ? c.yellow : c.red;
            console.log("      " + color + "- " + f + c.reset);
            allFeedback.push(f);
          }
        }
      }

      if (tier3Feedback.length > 0) {
        console.log("  " + c.boldYellow + "Tier 3 (prompt):" + c.reset);
        for (const f of tier3Feedback) {
          console.log("    " + c.yellow + "- " + f + c.reset);
          allFeedback.push(f);
        }
      }
    }

    return { valid: allValid, feedback: allFeedback, draft: currentDraft, graphs: allGraphs };
  }

  /**
   * Runs all gates (1, 2, 3) on a draft and returns the combined result.
   */
  private async runAllGates(
    harnesses: LoadedHarnesses,
    inputDraft: string,
    context: HarnessContext
  ): Promise<{ valid: boolean; feedback: string[]; draft: string; graphs: Record<string, unknown> }> {
    let allValid = true;
    const tier1Feedback: string[] = [];
    const tier2Feedback: Map<string, string[]> = new Map(); // domain → issues
    const tier3Feedback: string[] = [];
    const allGraphs: Record<string, unknown> = {};
    let currentDraft = inputDraft;

    // Gate 1: Code-based harnesses
    const codeResults = await Promise.allSettled(
      harnesses.code.map(code => executeHarnessInSandbox(code, currentDraft, context))
    );

    for (const result of codeResults) {
      if (result.status === "fulfilled") {
        if (result.value.rewrittenDraft) {
          currentDraft = result.value.rewrittenDraft;
        }
        if (!result.value.valid) {
          allValid = false;
          tier1Feedback.push(...result.value.feedback);
        }
      } else {
        allValid = false;
        tier1Feedback.push("Harness execution error: " + result.reason);
      }
    }

    // Gate 2: Hybrid harnesses (always run for comprehensive feedback)
    if (harnesses.hybrid.length > 0) {
      const hybridResults = await Promise.allSettled(
        harnesses.hybrid.map(h =>
          executeHybridHarness(h.extractionPromptAddendum, h.verificationCode, currentDraft, context, h.domain)
            .then(r => ({ ...r, domain: h.domain }))
        )
      );

      for (let i = 0; i < hybridResults.length; i++) {
        const result = hybridResults[i];
        const domain = harnesses.hybrid[i].domain;
        if (result.status === "fulfilled") {
          // Collect extracted graphs for snapshotting
          if (result.value.graphs) {
            Object.assign(allGraphs, result.value.graphs);
          }
          if (!result.value.valid) {
            allValid = false;
            const existing = tier2Feedback.get(domain) || [];
            existing.push(...result.value.feedback);
            tier2Feedback.set(domain, existing);
          }
        } else {
          const errMsg = String(result.reason);
          const existing = tier2Feedback.get(domain) || [];
          if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("timeout") || errMsg.includes("timed out")) {
            existing.push("⚠ Hybrid Harness skipped (API unavailable). Will retry next round.");
          } else {
            allValid = false;
            existing.push("Hybrid Harness failed: " + errMsg);
          }
          tier2Feedback.set(domain, existing);
        }
      }
    }

    // Gate 3: Prompt harnesses (always run for comprehensive feedback)
    if (harnesses.prompts.length > 0) {
      const llmResults = await Promise.allSettled(
        harnesses.prompts.map(p => executeLlmHarness(p, currentDraft, context))
      );

      for (const result of llmResults) {
        if (result.status === "fulfilled") {
          if (!result.value.valid) {
            allValid = false;
            tier3Feedback.push(...result.value.feedback);
          }
        } else {
          // API failures (503, timeout, network) are infrastructure issues,
          // not story quality failures. Log a warning but don't block acceptance.
          const errMsg = String(result.reason);
          if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("timeout") || errMsg.includes("timed out")) {
            tier3Feedback.push("⚠ LLM Harness skipped (API unavailable). Will retry next round.");
          } else {
            allValid = false;
            tier3Feedback.push("LLM Harness failed: " + errMsg);
          }
        }
      }
    }

    // Format structured output
    const allFeedback: string[] = [];
    if (!allValid) {
      const totalIssues = tier1Feedback.length +
        Array.from(tier2Feedback.values()).reduce((sum, v) => sum + v.length, 0) +
        tier3Feedback.length;
      console.log(c.boldRed + "Full check found " + totalIssues + " issue(s):" + c.reset);

      if (tier1Feedback.length > 0) {
        console.log("  " + c.boldCyan + "Tier 1 (code):" + c.reset);
        for (const f of tier1Feedback) {
          console.log("    " + c.yellow + "- " + f + c.reset);
          allFeedback.push(f);
        }
      }

      if (tier2Feedback.size > 0) {
        console.log("  " + c.boldMagenta + "Tier 2 (hybrid):" + c.reset);
        for (const [domain, issues] of tier2Feedback) {
          console.log("    " + c.dim + domain + ":" + c.reset);
          for (const f of issues) {
            const color = f.includes("/warning]") ? c.yellow : c.red;
            console.log("      " + color + "- " + f + c.reset);
            allFeedback.push(f);
          }
        }
      }

      if (tier3Feedback.length > 0) {
        console.log("  " + c.boldYellow + "Tier 3 (prompt):" + c.reset);
        for (const f of tier3Feedback) {
          console.log("    " + c.yellow + "- " + f + c.reset);
          allFeedback.push(f);
        }
      }
    }

    return { valid: allValid, feedback: allFeedback, draft: currentDraft, graphs: allGraphs };
  }

  private async saveLog(prompt: string, attempts: AttemptLog[]): Promise<void> {
    const baseDir = this.options.logDirectory ?? "logs";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sessionDir = join(baseDir, `generate-${timestamp}`);
    await mkdir(sessionDir, { recursive: true });

    // Save prompt at session root
    await writeFile(join(sessionDir, "prompt.md"), `# Prompt\n\n${prompt}`, "utf-8");

    // Group attempts by round
    for (const attempt of attempts) {
      const roundDir = join(sessionDir, `round-${attempt.round}`);
      await mkdir(roundDir, { recursive: true });

      if (attempt.patchInRound === null) {
        // Full check: save draft.md and feedback.md
        await writeFile(
          join(roundDir, "draft.md"),
          `# Draft (Round ${attempt.round})\n\n${attempt.draft}`,
          "utf-8"
        );

        // Snapshot extracted knowledge graphs
        if (attempt.graphs) {
          for (const [domain, graph] of Object.entries(attempt.graphs)) {
            await writeFile(
              join(roundDir, `${domain}-graph.json`),
              JSON.stringify(graph, null, 2),
              "utf-8"
            );
          }
        }

        if (attempt.feedback.length > 0) {
          const feedbackMd = [
            `# Feedback (Round ${attempt.round})`,
            "",
            `**Result:** ${attempt.valid ? "ACCEPTED" : "REJECTED"}`,
            `**Timestamp:** ${attempt.timestamp}`,
            "",
            ...attempt.feedback.map(f => `- ${f}`),
          ].join("\n");
          await writeFile(join(roundDir, "feedback.md"), feedbackMd, "utf-8");
        }
      } else {
        // Patch: save patch-N-feedback.md, patch-N-diff.md, patch-N-draft.md
        const patchPrefix = `patch-${attempt.patchInRound}`;

        // Feedback for this patch (what issue it was fixing)
        const feedbackMd = [
          `# Patch ${attempt.patchInRound} Feedback (Round ${attempt.round})`,
          "",
          `**Timestamp:** ${attempt.timestamp}`,
          "",
          ...attempt.feedback.map(f => `- ${f}`),
        ].join("\n");
        await writeFile(join(roundDir, `${patchPrefix}-feedback.md`), feedbackMd, "utf-8");

        // Diff for this patch
        if (attempt.diffs.length > 0) {
          const diffMd = [
            `# Patch ${attempt.patchInRound} Diff (Round ${attempt.round})`,
            "",
            ...attempt.diffs.map(d => [
              "```diff",
              "- " + d.original,
              "+ " + d.revised,
              "```",
              "",
            ].join("\n")),
          ].join("\n");
          await writeFile(join(roundDir, `${patchPrefix}-diff.md`), diffMd, "utf-8");
        }

        // Draft after applying this patch
        await writeFile(
          join(roundDir, `${patchPrefix}-draft.md`),
          `# Draft after Patch ${attempt.patchInRound} (Round ${attempt.round})\n\n${attempt.draft}`,
          "utf-8"
        );
      }
    }

    // Save final-draft.md if the last attempt was accepted
    const lastAttempt = attempts[attempts.length - 1];
    if (lastAttempt && lastAttempt.valid) {
      await writeFile(
        join(sessionDir, "final-draft.md"),
        `# Final Draft\n\n${lastAttempt.draft}`,
        "utf-8"
      );
    }

    // Always save best-draft.md — the latest draft regardless of pass/fail.
    // Uses the last attempt's draft (which reflects all patches applied).
    if (lastAttempt) {
      const status = lastAttempt.valid ? "ACCEPTED" : "BEST EFFORT (not accepted)";
      await writeFile(
        join(sessionDir, "best-draft.md"),
        `# Best Draft\n\n**Status:** ${status}\n**Round:** ${lastAttempt.round}\n\n---\n\n${lastAttempt.draft}`,
        "utf-8"
      );
    }

    // Save full summary as JSON for programmatic access
    const logData = { prompt, attempts, generatedAt: new Date().toISOString() };
    await writeFile(join(sessionDir, "summary.json"), JSON.stringify(logData, null, 2), "utf-8");

    console.log(c.dim + "Log saved to " + sessionDir + "/" + c.reset);
  }

  private async loadHarnesses(): Promise<LoadedHarnesses> {
    const transpiler = new Bun.Transpiler({ loader: "ts" });
    const codeHarnesses: string[] = [];
    const promptHarnesses: string[] = [];
    const hybridHarnesses: Array<{ extractionPromptAddendum: string; verificationCode: string }> = [];

    try {
      const files = await readdir(this.options.harnessDirectory);
      for (const file of files) {
        if (file.endsWith(".hybrid.json")) {
          const raw = await readFile(join(this.options.harnessDirectory, file), "utf-8");
          try {
            const parsed = JSON.parse(raw);
            const domain = (parsed.domain || inferDomainFromFilename(file)) as HybridDomain;
            hybridHarnesses.push({
              extractionPromptAddendum: parsed.extractionPromptAddendum || "",
              verificationCode: parsed.verificationCode || "",
              domain,
            });
          } catch {
            console.warn(`Warning: Failed to parse hybrid harness ${file}. Skipping.`);
          }
        } else if ((file.endsWith(".ts") || file.endsWith(".js")) && !file.includes(".test.")) {
          const raw = await readFile(join(this.options.harnessDirectory, file), "utf-8");
          const code = file.endsWith(".ts") ? transpiler.transformSync(raw) : raw;
          codeHarnesses.push(code);
        } else if (file.endsWith(".prompt.txt")) {
          const prompt = await readFile(join(this.options.harnessDirectory, file), "utf-8");
          promptHarnesses.push(prompt);
        }
      }
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        console.warn(`Warning: Harness directory ${this.options.harnessDirectory} does not exist. Running without harnesses.`);
      } else {
        throw e;
      }
    }
    return { code: codeHarnesses, prompts: promptHarnesses, hybrid: hybridHarnesses };
  }
}

/**
 * Infers the hybrid domain from the harness filename.
 * E.g., "DialogueCraftHarness.hybrid.json" → "dialogue"
 *       "LogicHarness.hybrid.json" → "logic"
 * Falls back to "logic" if no match.
 */
function inferDomainFromFilename(filename: string): HybridDomain {
  const lower = filename.toLowerCase();
  if (lower.includes("dialogue")) return "dialogue";
  if (lower.includes("character")) return "character";
  if (lower.includes("narrative") || lower.includes("story")) return "narrative";
  return "logic";
}

/**
 * Parses ORIGINAL/REVISED blocks from an LLM response and applies them to a draft.
 *
 * Expected format:
 *   ORIGINAL:
 *   <exact text>
 *   REVISED:
 *   <new text>
 *
 * Multiple blocks are supported. If "NO_CHANGE" is returned, no patches are applied.
 */
function applyDiffPatches(
  draft: string,
  response: string
): { patched: string; diffs: DiffEntry[] } {
  const diffs: DiffEntry[] = [];

  if (response.trim() === "NO_CHANGE") {
    return { patched: draft, diffs };
  }

  // Split response into ORIGINAL/REVISED pairs
  const blocks = response.split(/(?=ORIGINAL:)/g);

  for (const block of blocks) {
    const originalMatch = block.match(/ORIGINAL:\s*\n([\s\S]*?)(?=\nREVISED:)/);
    const revisedMatch = block.match(/REVISED:\s*\n([\s\S]*?)(?=\n(?:ORIGINAL:)|$)/);

    if (originalMatch && revisedMatch) {
      const original = originalMatch[1].trim();
      const revised = revisedMatch[1].trim();

      if (original && draft.includes(original)) {
        diffs.push({ original, revised });
      } else if (original) {
        // Try fuzzy match: trim whitespace differences, normalize quotes
        const normalized = original.replace(/\s+/g, " ").trim();
        const draftNormalized = draft.replace(/\s+/g, " ");
        const idx = draftNormalized.indexOf(normalized);
        if (idx !== -1) {
          // Find the actual substring in the original draft
          let realStart = 0;
          let realEnd = 0;
          const draftChars = draft.split("");
          let normalizedPos = 0;

          for (let i = 0; i < draftChars.length && normalizedPos <= idx + normalized.length; i++) {
            if (/\s/.test(draftChars[i])) {
              if (normalizedPos > 0 && draftNormalized[normalizedPos] === " ") {
                normalizedPos++;
              }
              continue;
            }
            if (normalizedPos === idx) {
              realStart = i;
            }
            normalizedPos++;
            if (normalizedPos === idx + normalized.length) {
              realEnd = i + 1;
              break;
            }
          }

          if (realEnd > realStart) {
            const actualOriginal = draft.substring(realStart, realEnd);
            diffs.push({ original: actualOriginal, revised });
          }
        } else {
          // Fallback: similarity-based sentence matching
          // The LLM often paraphrases instead of copying verbatim.
          // Find the draft sentence with the highest word overlap.
          const bestMatch = findBestSentenceMatch(draft, original);
          if (bestMatch) {
            diffs.push({ original: bestMatch, revised });
          }
        }
      }
    }
  }

  // Apply diffs in reverse order to preserve positions
  let patched = draft;
  for (const diff of diffs.reverse()) {
    patched = patched.replace(diff.original, diff.revised);
  }

  return { patched, diffs: diffs.reverse() };
}

/**
 * Finds the best matching sentence(s) in the draft for a paraphrased ORIGINAL.
 * Uses Jaccard word overlap similarity. Returns null if no match exceeds threshold.
 */
function findBestSentenceMatch(draft: string, target: string): string | null {
  const targetWords = new Set(
    target.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2)
  );
  if (targetWords.size === 0) return null;

  // Split draft into sentences (preserving the original text for replacement)
  const sentences = draft.match(/[^.!?]*[.!?]+[\s]*/g) || [draft];

  let bestScore = 0;
  let bestSentence = "";

  // Also try consecutive sentence pairs for multi-sentence matches
  for (let i = 0; i < sentences.length; i++) {
    // Single sentence
    const single = sentences[i].trim();
    const singleScore = jaccardSimilarity(targetWords, single);
    if (singleScore > bestScore) {
      bestScore = singleScore;
      bestSentence = single;
    }

    // Pair of consecutive sentences
    if (i + 1 < sentences.length) {
      const pair = (sentences[i] + sentences[i + 1]).trim();
      const pairScore = jaccardSimilarity(targetWords, pair);
      if (pairScore > bestScore) {
        bestScore = pairScore;
        bestSentence = pair;
      }
    }
  }

  // Threshold: at least 40% word overlap
  return bestScore >= 0.4 ? bestSentence : null;
}

function jaccardSimilarity(targetWords: Set<string>, candidate: string): number {
  const candidateWords = new Set(
    candidate.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2)
  );
  if (candidateWords.size === 0) return 0;

  let intersection = 0;
  for (const w of targetWords) {
    if (candidateWords.has(w)) intersection++;
  }

  const union = new Set([...targetWords, ...candidateWords]).size;
  return union > 0 ? intersection / union : 0;
}
