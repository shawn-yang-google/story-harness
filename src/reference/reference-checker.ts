/**
 * Reference Checker — Aggregates all 8 reference checker modules.
 *
 * Phase B of the Reference Harness. After the LLM extracts claims and provides
 * initial assessments, these checkers perform deterministic validations across
 * 8 specialized domains (30 rules total):
 *
 * 1. HistoricalChecker (4 rules): dates, figures, timelines, vague history
 * 2. GeographicChecker (4 rules): places, celestial, environment, unverifiable
 * 3. CulturalChecker (4 rules): customs, era mismatch, stereotyping, unverifiable
 * 4. ScientificChecker (4 rules): inaccurate, fictional leak, outdated, unverifiable
 * 5. LinguisticChecker (4 rules): dialect, period language, naming, register
 * 6. AnachronismChecker (4 rules): technology, concept, language, cultural
 * 7. ConsistencyChecker (3 rules): cross-ref, category contradiction, duplicates
 * 8. SourceChecker (4 rules): lore contradiction, unsourced critical, research, coverage
 */

import type { ReferenceGraph, FactualClaim } from "../types/reference-graph";
import type { HarnessContext } from "../types";
import type { CheckResult } from "../logic/types";
import type { ReferenceLevel } from "./reference-level";
import { checkHistorical } from "./historical-checker";
import { checkGeographic } from "./geographic-checker";
import { checkCultural } from "./cultural-checker";
import { checkScientific } from "./scientific-checker";
import { checkLinguistic } from "./linguistic-checker";
import { checkAnachronism } from "./anachronism-checker";
import { checkConsistency } from "./consistency-checker";
import { checkSources } from "./source-checker";

/**
 * Runs all 8 reference checker modules against a ReferenceGraph,
 * then applies level-based severity filtering.
 *
 * Returns the combined array of all CheckResults (errors + warnings).
 * The caller can filter by severity to determine pass/fail.
 */
export function checkReferences(
  graph: ReferenceGraph,
  context: HarnessContext
): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkHistorical(graph));
  results.push(...checkGeographic(graph));
  results.push(...checkCultural(graph));
  results.push(...checkScientific(graph));
  results.push(...checkLinguistic(graph));
  results.push(...checkAnachronism(graph));
  results.push(...checkConsistency(graph));
  results.push(...checkSources(graph, context));

  const level = (context.personaConfig?.referenceLevel ?? 3) as ReferenceLevel;
  return applyReferenceLevel(results, level);
}

/**
 * Filters and adjusts check results based on reference enforcement level.
 *
 * Level 1: Only errors (suppress warnings)
 * Level 2: All results unchanged
 * Level 3: Promote unsourced_critical to error
 * Level 4-5: Also promote vague_history and lore_coverage to error
 */
export function applyReferenceLevel(
  results: CheckResult[],
  level: ReferenceLevel
): CheckResult[] {
  switch (level) {
    case 1:
      return results.filter(r => r.severity === "error");
    case 2:
      return results;
    case 3:
      return results.map(r => {
        if (r.rule === "unsourced_critical") {
          return { ...r, severity: "error" as const };
        }
        return r;
      });
    case 4:
    case 5:
      return results.map(r => {
        if (r.rule === "unsourced_critical" || r.rule === "vague_history" || r.rule === "lore_coverage") {
          return { ...r, severity: "error" as const };
        }
        return r;
      });
  }
}

/**
 * Collects all claims from all typed arrays into a flat FactualClaim list.
 * This normalizes historical, geographic, cultural, scientific, and linguistic
 * references into a common format for cross-cutting checks.
 */
export function collectAllClaims(graph: ReferenceGraph): FactualClaim[] {
  const claims: FactualClaim[] = [...graph.claims];

  for (const hist of graph.historical) {
    if (!claims.some((c) => c.id === hist.id)) {
      claims.push({
        id: hist.id,
        category: "historical",
        excerpt: hist.excerpt,
        claim: hist.claim,
        location: hist.location,
        confidence: hist.confidence,
        reasoning: "",
        verdict: hist.verdict,
        correction: hist.correction,
      });
    }
  }

  for (const geo of graph.geographic) {
    if (!claims.some((c) => c.id === geo.id)) {
      claims.push({
        id: geo.id,
        category: "geographic",
        excerpt: geo.excerpt,
        claim: geo.claim,
        location: geo.location,
        confidence: geo.confidence,
        reasoning: "",
        verdict: geo.verdict,
        correction: geo.correction,
      });
    }
  }

  for (const cul of graph.cultural) {
    if (!claims.some((c) => c.id === cul.id)) {
      claims.push({
        id: cul.id,
        category: "cultural",
        excerpt: cul.excerpt,
        claim: cul.claim,
        location: cul.location,
        confidence: cul.confidence,
        reasoning: "",
        verdict: cul.verdict,
        correction: cul.correction,
      });
    }
  }

  for (const sci of graph.scientific) {
    if (!claims.some((c) => c.id === sci.id)) {
      claims.push({
        id: sci.id,
        category: "scientific",
        excerpt: sci.excerpt,
        claim: sci.claim,
        location: sci.location,
        confidence: sci.confidence,
        reasoning: "",
        verdict: sci.verdict,
        correction: sci.correction,
      });
    }
  }

  for (const ling of graph.linguistic) {
    if (!claims.some((c) => c.id === ling.id)) {
      claims.push({
        id: ling.id,
        category: "linguistic",
        excerpt: ling.excerpt,
        claim: ling.claim,
        location: ling.location,
        confidence: ling.confidence,
        reasoning: "",
        verdict: ling.verdict,
        correction: ling.correction,
      });
    }
  }

  return claims;
}
