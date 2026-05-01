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

  const coveredCategories = new Set<string>();
  const loreStr = JSON.stringify(loreDb).toLowerCase();

  for (const claim of allClaims) {
    if (claim.verdict === "accurate" && claim.confidence === "high") {
      // Check if this claim's subject appears in the loreDb
      const claimTerms = claim.claim.toLowerCase().split(/\s+/).filter((t) => t.length > 4);
      if (claimTerms.some((t) => loreStr.includes(t))) {
        coveredCategories.add(claim.category);
      }
    }
  }

  const allCategories = new Set(allClaims.map((c) => c.category));
  const uncovered = [...allCategories].filter((c) => !coveredCategories.has(c));

  if (uncovered.length > 0 && allClaims.length > 3) {
    results.push({
      checker: "SourceChecker",
      rule: "lore_coverage",
      severity: "warning",
      message:
        `LoreDb has no entries for categories: ${uncovered.join(", ")}. ` +
        `Consider adding verified reference facts for these areas to ` +
        `improve future validation accuracy.`,
      evidence: [],
    });
  }

  return results;
}
