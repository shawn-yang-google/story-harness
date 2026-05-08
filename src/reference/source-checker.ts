import type { ReferenceGraph } from "../types/reference-graph";
import type { HarnessContext } from "../types";
import type { CheckResult } from "../logic/types";
import { collectAllClaims } from "./reference-checker";

/**
 * SourceChecker — Validates claims against author-provided sources (loreDb)
 * and identifies claims requiring human research.
 *
 * Like JustificationChecker for logic, this ensures claims have backing.
 *
 * Checks:
 * 1. contradicts_lore: Claim contradicts author-provided reference database
 * 2. unsourced_critical: High-impact claim with no source or low confidence
 * 3. research_needed: Aggregate count of claims needing human verification
 * 4. lore_coverage: Claims that could benefit from loreDb entries
 */
export function checkSources(
  graph: ReferenceGraph,
  context: HarnessContext
): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkContradictsLore(graph, context));
  results.push(...checkUnsourcedCritical(graph));
  results.push(...checkResearchNeeded(graph));
  results.push(...checkLoreCoverage(graph, context));

  return results;
}

/**
 * Check 1: Contradicts Lore
 * Claims that directly contradict author-provided facts in the loreDb.
 */
function checkContradictsLore(
  graph: ReferenceGraph,
  context: HarnessContext
): CheckResult[] {
  const results: CheckResult[] = [];
  const loreDb = context.loreDb;

  if (!loreDb || Object.keys(loreDb).length === 0) return results;

  // Collect all lore entries from known sections
  const loreFacts = new Map<string, string>();
  const loreKeys = ["references", "facts", "history", "geography", "science", "culture"];
  for (const key of loreKeys) {
    if (loreDb[key] && typeof loreDb[key] === "object") {
      for (const [k, v] of Object.entries(loreDb[key])) {
        loreFacts.set(k.toLowerCase(), String(v).toLowerCase());
      }
    }
  }

  if (loreFacts.size === 0) return results;

  const allClaims = collectAllClaims(graph);

  for (const claim of allClaims) {
    if (claim.verdict !== "inaccurate") continue;

    const claimLower = claim.claim.toLowerCase();
    for (const [loreKey, loreValue] of loreFacts) {
      if (claimLower.includes(loreKey)) {
        results.push({
          checker: "SourceChecker",
          rule: "contradicts_lore",
          severity: "error",
          message:
            `Claim "${claim.claim}" contradicts author-provided reference: ` +
            `"${loreKey}" → "${loreValue}". The story should align with ` +
            `the author's research database.`,
          evidence: [claim.id],
        });
      }
    }
  }

  return results;
}

/**
 * Check 2: Unsourced Critical
 * High-impact factual claims (historical events, scientific assertions)
 * with no stated knowledge source and only medium/low confidence.
 */
function checkUnsourcedCritical(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const allClaims = collectAllClaims(graph);
  const criticalCategories = new Set(["historical", "scientific"]);

  for (const claim of allClaims) {
    if (
      criticalCategories.has(claim.category) &&
      !claim.knowledgeSource &&
      (claim.confidence === "medium" || claim.confidence === "low") &&
      claim.verdict !== "accurate"
    ) {
      results.push({
        checker: "SourceChecker",
        rule: "unsourced_critical",
        severity: "warning",
        message:
          `Critical ${claim.category} claim lacks verified source: ` +
          `"${claim.claim.slice(0, 80)}...". Consider adding this to the ` +
          `loreDb after verification.`,
        evidence: [claim.id],
      });
    }
  }

  return results;
}

/**
 * Check 3: Research Needed
 * Aggregate warning for claims that need human research.
 */
function checkResearchNeeded(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const allClaims = collectAllClaims(graph);
  const needsResearch = allClaims.filter(
    (c) =>
      c.verdict === "needs_research" ||
      c.confidence === "unverifiable"
  );

  if (needsResearch.length > 0) {
    const categories = [...new Set(needsResearch.map((c) => c.category))];
    results.push({
      checker: "SourceChecker",
      rule: "research_needed",
      severity: "warning",
      message:
        `${needsResearch.length} factual claim(s) require human verification ` +
        `across categories: ${categories.join(", ")}. ` +
        `Run the needs-research export to generate a research checklist.`,
      evidence: needsResearch.map((c) => c.id),
    });
  }

  return results;
}

/**
 * Check 4: Lore Coverage
 * Identifies categories of claims that have no loreDb support,
 * suggesting the author add verified facts to their reference database.
 */
function checkLoreCoverage(
  graph: ReferenceGraph,
  context: HarnessContext
): CheckResult[] {
  const results: CheckResult[] = [];
  const loreDb = context.loreDb;

  if (!loreDb || Object.keys(loreDb).length === 0) return results;

  const allClaims = collectAllClaims(graph);
  if (allClaims.length === 0) return results;

  // Build a haystack from loreDb VALUES (not the full JSON dump). The previous
  // implementation stringified the entire loreDb, which meant top-level key
  // names like "references" or "history" trivially matched any claim
  // containing those words — silently suppressing real coverage gaps.
  const loreHaystack = collectLoreValues(loreDb).toLowerCase();

  // Per-category tally: total high-confidence-accurate claims vs covered.
  const tally = new Map<string, { total: number; covered: number }>();
  for (const claim of allClaims) {
    if (claim.verdict !== "accurate" || claim.confidence !== "high") continue;
    const claimTerms = claim.claim.toLowerCase().split(/\s+/).filter((t) => t.length > 4);
    const isCovered = claimTerms.some((t) => loreHaystack.includes(t));
    const bucket = tally.get(claim.category) ?? { total: 0, covered: 0 };
    bucket.total += 1;
    if (isCovered) bucket.covered += 1;
    tally.set(claim.category, bucket);
  }

  // (a) Existing behavior: categories that are 100% uncovered (when overall
  // graph has > 3 claims to keep the signal-to-noise reasonable).
  const allCategories = new Set([...tally.keys()]);
  const fullyUncovered = [...allCategories].filter((c) => (tally.get(c)?.covered ?? 0) === 0);
  if (fullyUncovered.length > 0 && allClaims.length > 3) {
    results.push({
      checker: "SourceChecker",
      rule: "lore_coverage",
      severity: "warning",
      message:
        `LoreDb has no entries for categories: ${fullyUncovered.join(", ")}. ` +
        `Consider adding verified reference facts for these areas to ` +
        `improve future validation accuracy.`,
      evidence: [],
    });
  }

  // (b) New behavior: categories with >=3 claims and >=50% uncovered. These
  // are partial gaps where lore exists but isn't comprehensive.
  const PARTIAL_MIN_CLAIMS = 3;
  const PARTIAL_THRESHOLD = 0.5;
  for (const [category, { total, covered }] of tally) {
    if (covered === 0) continue; // already handled by (a)
    if (total < PARTIAL_MIN_CLAIMS) continue;
    const uncoveredCount = total - covered;
    if (uncoveredCount / total < PARTIAL_THRESHOLD) continue;
    results.push({
      checker: "SourceChecker",
      rule: "lore_coverage_partial",
      severity: "warning",
      message:
        `LoreDb covers only ${covered}/${total} ${category} claim(s) — ` +
        `${uncoveredCount} of ${total} are uncovered. ` +
        `Consider adding more verified ${category} facts to the loreDb.`,
      evidence: [],
    });
  }

  return results;
}

/**
 * Recursively collect string values (not keys) from a loreDb-shaped object.
 * Used to build a coverage haystack that doesn't accidentally match against
 * structural key names like "references" or "history".
 */
function collectLoreValues(obj: unknown, out: string[] = []): string {
  if (obj == null) return out.join(" ");
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    out.push(String(obj));
  } else if (Array.isArray(obj)) {
    for (const item of obj) collectLoreValues(item, out);
  } else if (typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      collectLoreValues(v, out);
    }
  }
  return out.join(" ");
}
