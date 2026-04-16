import { generateContent, MODELS } from "../llm";
import { buildExtractionPrompt as buildLogicPrompt } from "../logic/extraction-prompt";
import { buildDialogueExtractionPrompt } from "../dialogue/extraction-prompt";
import { buildCharacterExtractionPrompt } from "../character/extraction-prompt";
import { buildNarrativeExtractionPrompt } from "../narrative/extraction-prompt";
import { runAllCheckers as runLogicCheckers } from "../logic";
import { checkDialogue } from "../dialogue";
import { checkCharacter } from "../character";
import { checkNarrative } from "../narrative";
import type { HarnessContext, HarnessResult } from "../types";
import { createEmptyLogicGraph } from "../types/logic-graph";
import { createEmptyDialogueGraph } from "../types/dialogue-graph";
import { createEmptyCharacterGraph } from "../types/character-graph";
import { createEmptyNarrativeGraph } from "../types/narrative-graph";
import type { CheckResult } from "../logic/types";
import { buildValidationPrompt, applyGraphPatches } from "../logic/graph-validator";

export type HybridDomain = "logic" | "dialogue" | "character" | "narrative";

/**
 * Executes a Tier 2 Hybrid Harness for any domain.
 *
 * Phase A:   Extraction — Uses Flash-Lite to parse the draft into a domain-specific graph.
 * Phase A.5: Validation — A second LLM reviews the extraction for omissions/misclassifications (logic domain only).
 * Phase B:   Verification — Runs deterministic checker modules on the validated graph.
 */
export async function executeHybridHarness(
  extractionPromptAddendum: string,
  _verificationCode: string,
  draft: string,
  context: HarnessContext,
  domain: HybridDomain = "logic"
): Promise<HarnessResult> {
  const basePrompt = buildPromptForDomain(domain, draft, context);
  const fullPrompt = extractionPromptAddendum
    ? basePrompt + "\n\n## Additional Extraction Instructions\n" + extractionPromptAddendum
    : basePrompt;

  const execute = async (): Promise<HarnessResult> => {
    // Phase A: Extract graph from draft
    const response = await generateContent(MODELS.EVALUATOR, fullPrompt, undefined, 0);
    let { results, graph } = parseAndVerifyWithGraph(domain, response, context);

    // Phase A.5: Validate extraction with a second LLM (logic domain only)
    // Has its own 20s timeout so it fails fast instead of eating the harness budget.
    if (domain === "logic") {
      try {
        const validationPrompt = buildValidationPrompt(draft, graph as any);
        const validationTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Phase A.5 validation timed out")), 20000)
        );
        const patchResponse = await Promise.race([
          generateContent(MODELS.EVALUATOR, validationPrompt, undefined, 0),
          validationTimeout,
        ]);
        const validatedGraph = applyGraphPatches(graph as any, patchResponse);
        // Re-run checkers on the validated graph
        graph = validatedGraph;
        results = runLogicCheckers(validatedGraph, context);
      } catch (validationError: any) {
        // Validation is best-effort — if it fails, use the original graph
        console.warn("Phase A.5 validation skipped:", validationError.message);
      }
    }

    const errors = results.filter((r) => r.severity === "error");
    return {
      valid: errors.length === 0,
      feedback: results.map(
        (r) => `[${r.checker}/${r.rule}] ${r.message}`
      ),
      graphs: { [domain]: graph },
    };
  };

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Hybrid Harness execution timed out")),
        90000 // 90s to accommodate Phase A + A.5 (20s cap) + B
      )
    );

    return await Promise.race([execute(), timeoutPromise]);
  } catch (error: any) {
    if (error instanceof SyntaxError || error.message?.includes("JSON")) {
      try {
        return await execute();
      } catch (secondError) {
        throw secondError;
      }
    }
    throw error;
  }
}

/**
 * Builds the extraction prompt for a given domain.
 */
function buildPromptForDomain(
  domain: HybridDomain,
  draft: string,
  context: HarnessContext
): string {
  switch (domain) {
    case "logic":
      return buildLogicPrompt(draft, context);
    case "dialogue":
      return buildDialogueExtractionPrompt(draft, context);
    case "character":
      return buildCharacterExtractionPrompt(draft, context);
    case "narrative":
      return buildNarrativeExtractionPrompt(draft, context);
  }
}

/**
 * Parses the LLM response and runs the appropriate checkers for the domain.
 * Returns both the check results and the extracted graph for snapshotting.
 */
function parseAndVerifyWithGraph(
  domain: HybridDomain,
  response: string,
  context: HarnessContext
): { results: CheckResult[]; graph: Record<string, unknown> } {
  switch (domain) {
    case "logic": {
      const graph = parseJsonResponse(response, createEmptyLogicGraph());
      return { results: runLogicCheckers(graph, context), graph };
    }
    case "dialogue": {
      const graph = parseJsonResponse(response, createEmptyDialogueGraph());
      return { results: checkDialogue(graph), graph };
    }
    case "character": {
      const graph = parseJsonResponse(response, createEmptyCharacterGraph());
      return { results: checkCharacter(graph), graph };
    }
    case "narrative": {
      const graph = parseJsonResponse(response, createEmptyNarrativeGraph());
      return { results: checkNarrative(graph), graph };
    }
  }
}

/**
 * Parses the LLM response and runs the appropriate checkers for the domain.
 * @deprecated Use parseAndVerifyWithGraph for graph snapshotting support.
 */
function parseAndVerify(
  domain: HybridDomain,
  response: string,
  context: HarnessContext
): CheckResult[] {
  return parseAndVerifyWithGraph(domain, response, context).results;
}

/**
 * Generic JSON response parser.
 * Parses LLM response into any graph type T using lenient extraction.
 * Falls back to the provided empty defaults on parse failure.
 */
export function parseJsonResponse<T extends Record<string, unknown>>(
  response: string,
  defaults: T
): T {
  try {
    const parsed = JSON.parse(response.trim());
    return mergeWithDefaults(parsed, defaults);
  } catch {
    const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch?.[1]) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        return mergeWithDefaults(parsed, defaults);
      } catch {
        // Fall through
      }
    }

    const start = response.indexOf("{");
    const end = response.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const parsed = JSON.parse(response.substring(start, end + 1));
        return mergeWithDefaults(parsed, defaults);
      } catch {
        // Fall through
      }
    }

    console.warn(
      "Hybrid Harness: Failed to parse response from LLM. Returning empty graph."
    );
    return defaults;
  }
}

/** Backward-compatible alias for logic-specific parsing */
export function parseLogicGraphResponse(response: string) {
  return parseJsonResponse(response, createEmptyLogicGraph());
}

/**
 * Merges a parsed (potentially partial) graph with defaults,
 * ensuring all arrays exist even if the LLM omitted them.
 */
function mergeWithDefaults<T extends Record<string, unknown>>(
  parsed: Record<string, unknown>,
  defaults: T
): T {
  const result: Record<string, unknown> = { ...defaults };

  for (const key of Object.keys(defaults)) {
    if (key in parsed) {
      if (Array.isArray(defaults[key]) && Array.isArray(parsed[key])) {
        result[key] = parsed[key];
      } else if (typeof defaults[key] === "object" && !Array.isArray(defaults[key]) && typeof parsed[key] === "object") {
        result[key] = parsed[key];
      } else if (typeof parsed[key] === typeof defaults[key]) {
        result[key] = parsed[key];
      }
    }
  }

  return result as T;
}
