import type { ReferenceGraph, HistoricalReference, FactualClaim } from "../types/reference-graph";
import type { CheckResult } from "../logic/types";

/**
 * HistoricalChecker — Verifies historical references within a ReferenceGraph.
 *
 * Checks:
 * 1. inaccurate_date: Historical event placed at a wrong date/period
 * 2. inaccurate_figure: Historical figure misattributed or mischaracterized
 * 3. timeline_conflict: Multiple historical claims with contradictory timelines
 * 4. vague_history: Historical reference too vague to be meaningful
 */
export function checkHistorical(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkInaccurateDates(graph));
  results.push(...checkInaccurateFigures(graph));
  results.push(...checkTimelineConflicts(graph));
  results.push(...checkVagueHistory(graph));

  return results;
}

/**
 * Check 1: Inaccurate Dates
 * Historical references the LLM has confidently marked as inaccurate.
 */
function checkInaccurateDates(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const hist of graph.historical) {
    if (hist.verdict === "inaccurate" && hist.confidence === "high") {
      results.push({
        checker: "HistoricalChecker",
        rule: "inaccurate_date",
        severity: "error",
        message:
          `Inaccurate historical date: "${hist.subject}" is placed in ` +
          `"${hist.timePeriod}" but this is incorrect. ` +
          (hist.correction ? `Correction: ${hist.correction}. ` : "") +
          `[excerpt: "${hist.excerpt.slice(0, 100)}"]`,
        evidence: [hist.id],
      });
    }
  }

  // Also check claims tagged as historical
  for (const claim of graph.claims) {
    if (
      claim.category === "historical" &&
      claim.verdict === "inaccurate" &&
      claim.confidence === "high"
    ) {
      if (!graph.historical.some((h) => h.id === claim.id)) {
        results.push({
          checker: "HistoricalChecker",
          rule: "inaccurate_date",
          severity: "error",
          message:
            `Inaccurate historical claim: "${claim.claim}". ` +
            (claim.correction ? `Correction: ${claim.correction}. ` : "") +
            `[excerpt: "${claim.excerpt.slice(0, 100)}"]`,
          evidence: [claim.id],
        });
      }
    }
  }

  return results;
}

/**
 * Check 2: Inaccurate Figures
 * Historical figures misattributed, wrong titles, wrong roles.
 */
function checkInaccurateFigures(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const hist of graph.historical) {
    if (hist.verdict === "partially_accurate") {
      results.push({
        checker: "HistoricalChecker",
        rule: "inaccurate_figure",
        severity: "warning",
        message:
          `Partially accurate historical reference: "${hist.subject}" — ` +
          `${hist.claim}. ` +
          (hist.correction ? `Nuance: ${hist.correction}. ` : "") +
          `Consider verifying the specifics.`,
        evidence: [hist.id],
      });
    }
  }

  return results;
}

/**
 * Check 3: Timeline Conflicts
 * Two historical references that contradict each other's timeline.
 * E.g., event A is said to happen in 1958 but also during the Cultural Revolution (1966-1976).
 */
function checkTimelineConflicts(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  // Use cross-references if the LLM detected them
  for (const xref of graph.crossReferences) {
    const involvedHistorical = xref.claimIds.filter((id) =>
      graph.historical.some((h) => h.id === id)
    );
    if (involvedHistorical.length >= 2) {
      results.push({
        checker: "HistoricalChecker",
        rule: "timeline_conflict",
        severity: "error",
        message:
          `Historical timeline conflict: ${xref.inconsistency}`,
        evidence: xref.claimIds,
      });
    }
  }

  return results;
}

/**
 * Check 4: Vague History
 * Historical references that are too vague to verify — needs_research with low confidence.
 */
function checkVagueHistory(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const vagueRefs = graph.historical.filter(
    (h) => h.confidence === "low" || h.confidence === "unverifiable"
  );

  if (vagueRefs.length > 0) {
    for (const vague of vagueRefs) {
      results.push({
        checker: "HistoricalChecker",
        rule: "vague_history",
        severity: "warning",
        message:
          `Unverifiable historical reference: "${vague.subject}" (${vague.timePeriod}) — ` +
          `"${vague.claim}". This claim requires author research.`,
        evidence: [vague.id],
      });
    }
  }

  return results;
}
