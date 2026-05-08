/**
 * Needs-Research Output Generator
 *
 * When the Reference Harness identifies claims that cannot be verified
 * by the model (low confidence, unverifiable, or needs_research verdict),
 * this module generates a structured JSON file that the author can use
 * as a research checklist.
 *
 * The output is designed to be:
 * 1. Actionable — each item tells the author exactly what to research
 * 2. Organized — grouped by category with priority levels
 * 3. Round-trippable — the author fills in the "resolution" field and
 *    feeds it back into the loreDb for future validation
 */

import { writeFile } from "fs/promises";
import type { ReferenceGraph, FactualClaim, ClaimCategory } from "../types/reference-graph";
import { collectAllClaims } from "./reference-checker";

export interface ResearchItem {
  /** Unique identifier matching the original claim */
  id: string;
  /** Category of research needed */
  category: ClaimCategory;
  /** Priority: "high" = likely inaccurate, "medium" = uncertain, "low" = just unverifiable */
  priority: "high" | "medium" | "low";
  /** The factual claim that needs verification */
  claim: string;
  /** The exact excerpt from the draft */
  excerpt: string;
  /** Location in the draft */
  location: string;
  /** Why this needs research */
  reason: string;
  /** The model's best guess or partial knowledge */
  modelAssessment: string;
  /** Suggested research directions */
  suggestedSources: string[];
  /** Author fills this in after research */
  resolution: ResearchResolution | null;
}

export interface ResearchResolution {
  /** Is the claim accurate? */
  accurate: boolean;
  /** The verified fact */
  verifiedFact: string;
  /** Source of verification */
  source: string;
  /** Should this be added to the loreDb for future stories? */
  addToLoreDb: boolean;
}

export interface NeedsResearchOutput {
  /** When this research file was generated */
  generatedAt: string;
  /** Summary statistics */
  summary: {
    totalClaims: number;
    verifiedClaims: number;
    needsResearchClaims: number;
    inaccurateClaims: number;
    byCategory: Record<ClaimCategory, number>;
  };
  /** Instructions for the author */
  instructions: string;
  /** The research items, grouped by priority */
  items: ResearchItem[];
}

/**
 * Generates the needs-research output from a ReferenceGraph.
 */
export function generateNeedsResearch(
  graph: ReferenceGraph
): NeedsResearchOutput {
  const allClaims = collectAllClaims(graph);

  const researchClaims = allClaims.filter(
    (c) =>
      c.verdict === "needs_research" ||
      c.verdict === "partially_accurate" ||
      c.confidence === "unverifiable" ||
      c.confidence === "low"
  );

  const items: ResearchItem[] = researchClaims.map((claim) =>
    claimToResearchItem(claim)
  );

  // Sort by priority: high → medium → low
  const priorityOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  items.sort(
    (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  );

  // Compute summary
  const byCategory: Record<string, number> = {};
  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalClaims: allClaims.length,
      verifiedClaims: allClaims.filter(
        (c) => c.verdict === "accurate" && c.confidence === "high"
      ).length,
      needsResearchClaims: items.length,
      inaccurateClaims: allClaims.filter((c) => c.verdict === "inaccurate")
        .length,
      byCategory: byCategory as Record<ClaimCategory, number>,
    },
    instructions: [
      "This file contains factual claims from your story that could not be fully verified.",
      "For each item, please:",
      "1. Research the claim using the suggested sources",
      "2. Fill in the 'resolution' field with your findings",
      "3. Set 'addToLoreDb: true' if you want this fact remembered for future stories",
      "4. Feed the resolved file back: bun run src/cli/index.ts import-research <this-file>",
      "",
      "Priority levels:",
      "- HIGH: The claim is likely inaccurate or contradicts known facts — research urgently",
      "- MEDIUM: The model has some knowledge but is uncertain — verify before publishing",
      "- LOW: The claim is about a very specific/niche topic — verify if aiming for high authenticity",
    ].join("\n"),
    items,
  };
}

/**
 * Converts a FactualClaim into a ResearchItem with suggested sources.
 */
function claimToResearchItem(claim: FactualClaim): ResearchItem {
  const priority = computePriority(claim);
  const suggestedSources = suggestSources(claim);

  return {
    id: claim.id,
    category: claim.category,
    priority,
    claim: claim.claim,
    excerpt: claim.excerpt,
    location: claim.location,
    reason: buildReason(claim),
    modelAssessment: claim.reasoning || "No assessment provided by the model.",
    suggestedSources,
    resolution: null,
  };
}

function computePriority(claim: FactualClaim): "high" | "medium" | "low" {
  if (claim.verdict === "inaccurate" || claim.verdict === "partially_accurate") {
    return "high";
  }
  if (claim.confidence === "low") {
    return "medium";
  }
  return "low";
}

function buildReason(claim: FactualClaim): string {
  if (claim.verdict === "partially_accurate") {
    return `The model believes this claim is partially accurate but cannot fully verify it. ${claim.correction ? `Possible issue: ${claim.correction}` : ""}`;
  }
  if (claim.confidence === "unverifiable") {
    return "This claim involves very specific or niche knowledge that the model cannot verify.";
  }
  if (claim.confidence === "low") {
    return "The model has limited knowledge about this topic and cannot confidently assess accuracy.";
  }
  return "This claim requires human verification before publication.";
}

function suggestSources(claim: FactualClaim): string[] {
  const sources: string[] = [];

  switch (claim.category) {
    case "historical":
      sources.push(
        "Academic history databases (JSTOR, Google Scholar)",
        "Wikipedia (as a starting point, verify with primary sources)",
        "Historical archives and government records",
        "Period-specific history books"
      );
      break;
    case "geographic":
      sources.push(
        "Google Maps / Google Earth for physical geography",
        "National Geographic for environmental details",
        "NASA databases for celestial body information",
        "Local tourism/government websites for regional details"
      );
      break;
    case "cultural":
      sources.push(
        "Ethnographic studies and cultural anthropology papers",
        "Interviews with people from the referenced culture/era",
        "Documentary films about the region/period",
        "Cultural heritage organizations"
      );
      break;
    case "scientific":
      sources.push(
        "Peer-reviewed scientific journals (Nature, Science, arXiv)",
        "Textbooks in the relevant scientific domain",
        "NASA/ESA databases for astronomy",
        "Expert consultation in the specific field"
      );
      break;
    case "linguistic":
      sources.push(
        "Linguistic atlases and dialect surveys",
        "Period-specific literature from the referenced region",
        "Language documentation projects",
        "Native speakers from the referenced region/era"
      );
      break;
  }

  return sources;
}

/**
 * Writes the needs-research output to a JSON file.
 */
export async function writeNeedsResearchFile(
  output: NeedsResearchOutput,
  filePath: string
): Promise<void> {
  await writeFile(filePath, JSON.stringify(output, null, 2), "utf-8");
}

/**
 * Parses a resolved needs-research file and extracts verified facts
 * suitable for adding to the loreDb.
 */
export function extractVerifiedFacts(
  resolved: NeedsResearchOutput
): Record<string, string> {
  const facts: Record<string, string> = {};

  for (const item of resolved.items) {
    if (item.resolution && item.resolution.addToLoreDb) {
      const key = `${item.category}:${item.claim.slice(0, 50).replace(/\s+/g, "_").toLowerCase()}`;
      facts[key] = item.resolution.verifiedFact;
    }
  }

  return facts;
}

/**
 * Result of merging resolved research into an existing loreDb.
 */
export interface ResolveMergeResult {
  /** A new loreDb object with verified facts merged under `references`. */
  updatedLore: Record<string, any>;
  /** Number of items added (had a resolution and addToLoreDb=true). */
  addedCount: number;
  /** Number of items skipped (no resolution OR addToLoreDb=false). */
  skippedCount: number;
}

/**
 * Engine for the `resolve-research` CLI command.
 *
 * Merges verified facts from a resolved NeedsResearchOutput into an existing
 * loreDb object. Entries are placed under the top-level `references` key
 * (one of the SourceChecker's recognized loreKeys, so they load automatically
 * on the next run). Each entry retains full provenance so an author can audit
 * later.
 *
 * Pure function — no I/O. The CLI handles file reads/writes.
 *
 * @param resolved - Parsed needs-research.json after the author filled in
 *                   `resolution` fields.
 * @param existingLore - Current loreDb (parsed JSON). Pass {} for a new file.
 * @returns The updated lore plus counts for reporting.
 */
export function mergeResolvedIntoLore(
  resolved: NeedsResearchOutput,
  existingLore: Record<string, any>
): ResolveMergeResult {
  // Deep-clone the input so callers can rely on immutability.
  const updatedLore: Record<string, any> = JSON.parse(JSON.stringify(existingLore));
  if (!updatedLore.references || typeof updatedLore.references !== "object") {
    updatedLore.references = {};
  }

  let addedCount = 0;
  let skippedCount = 0;
  const addedAt = new Date().toISOString();

  for (const item of resolved.items) {
    if (!item.resolution || !item.resolution.addToLoreDb) {
      skippedCount++;
      continue;
    }

    // Same key shape as extractVerifiedFacts so re-resolving the same claim
    // overwrites rather than duplicates.
    const key = `${item.category}:${item.claim.slice(0, 50).replace(/\s+/g, "_").toLowerCase()}`;

    updatedLore.references[key] = {
      fact: item.resolution.verifiedFact,
      source: item.resolution.source,
      addedAt,
      originalClaim: item.claim,
      originalLocation: item.location,
    };
    addedCount++;
  }

  return { updatedLore, addedCount, skippedCount };
}
