/**
 * Auto-Research Engine
 *
 * Reads a `NeedsResearchOutput` (the file produced by the Reference Harness
 * when it can't fully verify a claim), and uses an LLM with Google Search
 * grounding to fill in each item's `resolution` block automatically. The
 * resolved output is the same shape — drop it through `mergeResolvedIntoLore`
 * to land verified facts in the loreDb, then re-run generation.
 *
 * Pure (modulo the LLM call). The CLI handles file I/O.
 */

import {
  generateGroundedContent,
  MODELS,
  type GroundingSource,
} from "../llm";
import type {
  NeedsResearchOutput,
  ResearchItem,
  ResearchResolution,
} from "./needs-research";

export interface AutoResearchOptions {
  /**
   * Which LLM to use. Defaults to GENERATOR (gemini-3.1-pro-preview) — the
   * same flagship model used for story generation. CRITIC (gemini-2.5-pro)
   * is not served by this Gemini API endpoint, so don't pass it.
   */
  model?: typeof MODELS[keyof typeof MODELS];
  /**
   * Optional progress callback fired before each LLM call. Useful for the CLI
   * to print "Researching item N/M: ..." status lines.
   */
  onProgress?: (item: ResearchItem, index: number, total: number) => void;
}

/**
 * Auto-fill the `resolution` block on every unresolved item in the input.
 *
 * - Items that already have a non-null `resolution` are left untouched.
 * - Each unresolved item triggers one LLM call with web grounding enabled.
 * - The model is asked to return a JSON object matching `ResearchResolution`.
 * - Grounding URLs (if any) are appended to the resolution's `source` field
 *   for provenance.
 * - On parse failure, the item gets a stub resolution with `addToLoreDb=false`
 *   so the merge step won't pollute the loreDb with garbage.
 *
 * Returns a new `NeedsResearchOutput` (deep clone); the input is not mutated.
 */
export async function autoResearch(
  input: NeedsResearchOutput,
  options: AutoResearchOptions = {},
): Promise<NeedsResearchOutput> {
  const { model = MODELS.GENERATOR, onProgress } = options;

  // Deep clone so callers can rely on input immutability.
  const output: NeedsResearchOutput = JSON.parse(JSON.stringify(input));

  for (let i = 0; i < output.items.length; i++) {
    const item = output.items[i];
    if (item.resolution) continue;

    onProgress?.(item, i, output.items.length);

    try {
      const grounded = await generateGroundedContent(
        model,
        buildResearchPrompt(item),
        SYSTEM_INSTRUCTION,
        0.1,
      );
      item.resolution = parseResolution(grounded.text, grounded.sources);
    } catch (err: any) {
      item.resolution = {
        accurate: false,
        verifiedFact: "Auto-research failed: " + (err?.message ?? String(err)),
        source: "(LLM error — please research manually)",
        addToLoreDb: false,
      };
    }
  }

  return output;
}

const SYSTEM_INSTRUCTION = [
  "You are a research consultant assisting a fiction writer.",
  "For each factual claim from a story draft, use Google Search to verify it",
  "and return a STRICT JSON object describing your finding. No prose outside",
  "the JSON block. The JSON must match this schema:",
  "",
  "  {",
  '    "accurate": boolean,           // is the claim, as written, factually correct?',
  '    "verifiedFact": string,        // the verified fact (or correction if inaccurate). Be specific and citable.',
  '    "source": string,              // the primary source(s) that ground your answer (book, paper, archive, URL).',
  '    "addToLoreDb": boolean         // true if this fact is reusable across stories, false if it is one-off or trivia',
  "  }",
  "",
  "Always invoke Google Search before answering — do not rely on training data alone.",
  "If you cannot find a reliable source, set accurate=false and explain in verifiedFact.",
].join("\n");

function buildResearchPrompt(item: ResearchItem): string {
  const lines = [
    "## Claim to verify",
    "Category: " + item.category,
    "Location in draft: " + item.location,
    "Original excerpt: " + JSON.stringify(item.excerpt),
    "Normalized claim: " + item.claim,
    "",
    "## What the original model said",
    item.modelAssessment || "(no assessment provided)",
    "",
  ];
  if (item.suggestedSources.length > 0) {
    lines.push("## Suggested directions");
    item.suggestedSources.forEach((s) => lines.push("- " + s));
    lines.push("");
  }
  lines.push(
    "## Your task",
    "Research the claim with Google Search and return the JSON object. " +
    "Be precise about scope — e.g., distinguish 1966 (May Notification) from " +
    "1966-1976 (whole movement) when dates matter. For specialized domains, " +
    "name the canonical reference (Article number, archive, paper, etc.).",
  );
  return lines.join("\n");
}

function parseResolution(
  rawText: string,
  groundingSources: GroundingSource[],
): ResearchResolution {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e: any) {
    return {
      accurate: false,
      verifiedFact:
        "Could not parse LLM response as JSON. Raw: " +
        rawText.slice(0, 240),
      source:
        "(parse error — " +
        (e?.message ?? String(e)) +
        ")" +
        formatGroundingSources(groundingSources),
      addToLoreDb: false,
    };
  }

  const accurate =
    typeof parsed.accurate === "boolean" ? parsed.accurate : false;
  const verifiedFact = String(parsed.verifiedFact ?? "");
  const baseSource = String(parsed.source ?? "");
  const addToLoreDb =
    typeof parsed.addToLoreDb === "boolean" ? parsed.addToLoreDb : false;

  return {
    accurate,
    verifiedFact,
    source: baseSource + formatGroundingSources(groundingSources),
    addToLoreDb,
  };
}

function formatGroundingSources(sources: GroundingSource[]): string {
  if (!sources.length) return "";
  const parts = sources
    .map((s) => {
      if (s.title && s.uri) return s.title + " <" + s.uri + ">";
      if (s.uri) return s.uri;
      if (s.title) return s.title;
      return "";
    })
    .filter(Boolean);
  if (!parts.length) return "";
  return " | Web sources: " + parts.join("; ");
}
