/**
 * GraphValidator — Phase A.5: LLM-as-judge validation of extracted graphs.
 *
 * After Phase A (LLM extraction) and before Phase B (deterministic checking),
 * a second LLM reviews the original draft alongside the extracted graph to
 * catch extraction omissions, misclassifications, and missing world-knowledge.
 *
 * The validator outputs a JSON patch (additions + reclassifications) that is
 * applied to the graph before it reaches the checker modules.
 */

import type { LogicGraph, Conclusion } from "../types/logic-graph";
import { parseJsonResponse } from "../environment/hybrid-harness";

const FENCE = "```";

/**
 * Patch schema returned by the validator LLM.
 * Uses additive operations only — never removes from the graph.
 */
interface GraphPatch {
  addPropositions?: Array<{
    id: string;
    text: string;
    subject: string;
    predicate: string;
    truth: boolean;
    location: string;
  }>;
  addEvents?: Array<{
    id: string;
    description: string;
    agent: string;
    order: number;
    location: string;
  }>;
  addStateChanges?: Array<{
    entity: string;
    attribute: string;
    from: string | boolean | number;
    to: string | boolean | number;
    atEvent: string;
  }>;
  addWorldRules?: Array<{
    rule: string;
    type: "necessary" | "impossible" | "conditional";
    source: string;
  }>;
  addKnowledge?: Array<{
    agent: string;
    knows: string;
    since: string;
    how: "witnessed" | "told" | "deduced" | "unexplained";
  }>;
  addAbilities?: Array<{
    agent: string;
    can: string;
    established: string;
  }>;
  reclassifyConclusions?: Array<{
    claim: string;
    newInferenceType: Conclusion["inferenceType"];
  }>;
}

const EMPTY_PATCH: GraphPatch = {};

/**
 * Builds the validation prompt for Phase A.5.
 *
 * The validator sees both the original draft and the extracted graph,
 * and is asked to identify gaps, omissions, and misclassifications.
 */
export function buildValidationPrompt(draft: string, graph: LogicGraph): string {
  const patchSchema = JSON.stringify(
    {
      addPropositions: [
        { id: "p_new1", text: "...", subject: "...", predicate: "...", truth: true, location: "..." },
      ],
      addEvents: [
        { id: "e_new1", description: "...", agent: "...", order: 0, location: "..." },
      ],
      addStateChanges: [
        { entity: "...", attribute: "...", from: "...", to: "...", atEvent: "..." },
      ],
      addWorldRules: [
        { rule: "...", type: "necessary", source: "common_sense_physics" },
      ],
      addKnowledge: [
        { agent: "...", knows: "...", since: "...", how: "unexplained" },
      ],
      addAbilities: [
        { agent: "...", can: "...", established: "..." },
      ],
      reclassifyConclusions: [
        { claim: "...", newInferenceType: "affirming_consequent" },
      ],
    },
    null,
    2
  );

  return [
    "You are a logic extraction auditor. You will receive a narrative draft and a LogicGraph that was extracted from it by another system.",
    "",
    "Your job is to find GAPS and ERRORS in the extraction — things the extractor missed or got wrong.",
    "",
    "## What to Check",
    "",
    "### 1. Missing Propositions",
    "- Are there factual claims in the draft that are NOT captured as propositions?",
    "- Pay special attention to IMPLICIT claims: if a character does X, the proposition 'character can do X' should exist.",
    "- If weather, physical state, or environmental conditions change, those should be propositions.",
    "",
    "### 2. Missing State Changes",
    "- Are there physical transitions NOT captured? (weather changing, doors opening/closing, lights turning on/off)",
    "- Especially look for INSTANT transitions that violate common sense (rain stopping instantly, injuries healing without treatment).",
    "- These are critical because downstream checkers use state changes to detect physical implausibility.",
    "",
    "### 3. Missing World Rules",
    "- Are there common-sense physics rules that the draft violates but no worldRule captures?",
    '- Examples: "Weather transitions take time", "Crime scenes require gloves for evidence preservation", "A wet glass does not prove recent drinking".',
    '- Add these as type="necessary" with source="common_sense_physics".',
    "",
    "### 4. Misclassified Inference Types",
    "- Are any conclusions marked as valid reasoning (modus_ponens, other) when they are actually:",
    '  - "affirming_consequent" (P→Q, Q ∴ P)',
    '  - "denying_antecedent" (P→Q, ¬P ∴ ¬Q)',
    '  - "unsupported" (no real premises)',
    "- A trivially obvious premise (e.g., 'the glass with water is wet') does NOT make a deduction valid.",
    "",
    "### 5. Missing Knowledge Entries",
    "- Does a character act on information they shouldn't have? If so, add a knowledge entry with how='unexplained'.",
    "",
    "### 6. Missing Events",
    "- Are there actions or occurrences in the draft not captured as events?",
    "",
    "## Draft",
    "---",
    draft,
    "---",
    "",
    "## Extracted LogicGraph",
    FENCE + "json",
    JSON.stringify(graph, null, 2),
    FENCE,
    "",
    "## Output Format",
    "",
    "Respond with ONLY a JSON object containing the corrections. Use ONLY these fields (include only the ones with actual corrections):",
    "",
    FENCE + "json",
    patchSchema,
    FENCE,
    "",
    "- Use `addPropositions` to add missing propositions (use IDs like p_v1, p_v2 to avoid conflicts).",
    "- Use `addEvents` to add missing events (use IDs like e_v1, e_v2).",
    "- Use `addStateChanges` to add missing physical transitions.",
    "- Use `addWorldRules` to add common-sense rules the checkers need.",
    "- Use `addKnowledge` to flag unexplained knowledge.",
    "- Use `addAbilities` to add missing ability entries.",
    "- Use `reclassifyConclusions` to fix misclassified inference types (match by claim text).",
    "",
    "If the extraction is complete and correct, respond with: `{}`",
    "",
    "Be conservative — only add what is clearly missing. Do NOT duplicate existing entries.",
  ].join("\n");
}

/**
 * Applies a JSON patch from the validator LLM to an existing LogicGraph.
 *
 * Operations are additive only — new entries are appended, never removed.
 * Reclassifications update existing entries in-place.
 *
 * Handles unparseable responses gracefully by returning the original graph.
 */
export function applyGraphPatches(graph: LogicGraph, patchResponse: string): LogicGraph {
  if (patchResponse.trim() === "NO_CHANGES" || patchResponse.trim() === "{}") {
    return graph;
  }

  const patch = parsePatchResponse(patchResponse);
  if (!patch) return graph;

  // Deep clone to avoid mutating the original
  const patched: LogicGraph = JSON.parse(JSON.stringify(graph));

  // Add new propositions
  if (patch.addPropositions?.length) {
    patched.propositions.push(...patch.addPropositions);
  }

  // Add new events
  if (patch.addEvents?.length) {
    patched.events.push(...patch.addEvents);
  }

  // Add new state changes
  if (patch.addStateChanges?.length) {
    patched.stateChanges.push(...patch.addStateChanges);
  }

  // Add new world rules
  if (patch.addWorldRules?.length) {
    patched.worldRules.push(...patch.addWorldRules);
  }

  // Add new knowledge entries
  if (patch.addKnowledge?.length) {
    patched.knowledge.push(...patch.addKnowledge);
  }

  // Add new abilities
  if (patch.addAbilities?.length) {
    patched.abilities.push(...patch.addAbilities);
  }

  // Reclassify conclusions (match by claim text, case-insensitive)
  if (patch.reclassifyConclusions?.length) {
    for (const reclass of patch.reclassifyConclusions) {
      const target = patched.conclusions.find(
        (c) => c.claim.toLowerCase() === reclass.claim.toLowerCase()
      );
      if (target) {
        target.inferenceType = reclass.newInferenceType;
      }
    }
  }

  return patched;
}

/**
 * Parses the validator LLM's patch response with lenient extraction.
 * Returns null if the response is completely unparseable.
 */
function parsePatchResponse(response: string): GraphPatch | null {
  try {
    return JSON.parse(response.trim()) as GraphPatch;
  } catch {
    // Try markdown code block extraction
    const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch?.[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as GraphPatch;
      } catch {
        // Fall through
      }
    }

    // Try finding JSON object in text
    const start = response.indexOf("{");
    const end = response.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(response.substring(start, end + 1)) as GraphPatch;
      } catch {
        // Fall through
      }
    }

    return null;
  }
}
