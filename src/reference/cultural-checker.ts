import type { ReferenceGraph, CulturalReference } from "../types/reference-graph";
import type { CheckResult } from "../logic/types";

/**
 * CulturalChecker — Verifies cultural references against region and era.
 *
 * Checks:
 * 1. inaccurate_custom: Custom/tradition wrong for the stated culture
 * 2. era_mismatch: Cultural practice from wrong time period
 * 3. stereotyping: Overly simplified or stereotypical cultural depiction
 * 4. unverifiable_culture: Niche cultural claim needing research
 */
export function checkCultural(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkInaccurateCustoms(graph));
  results.push(...checkEraMismatch(graph));
  results.push(...checkStereotyping(graph));
  results.push(...checkUnverifiableCulture(graph));

  return results;
}

/**
 * Check 1: Inaccurate Customs
 * Customs, traditions, food, clothing, art wrong for the stated culture.
 */
function checkInaccurateCustoms(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const cul of graph.cultural) {
    if (cul.verdict === "inaccurate") {
      results.push({
        checker: "CulturalChecker",
        rule: "inaccurate_custom",
        severity: cul.confidence === "high" ? "error" : "warning",
        message:
          `Inaccurate cultural reference for ${cul.regionAndEra}: ` +
          `"${cul.claim}" (${cul.type}). ` +
          (cul.correction ? `Correction: ${cul.correction}. ` : "") +
          `[subject: "${cul.subject}"]`,
        evidence: [cul.id],
      });
    }
  }

  return results;
}

/**
 * Check 2: Era Mismatch
 * Cultural practice exists but is from the wrong time period.
 * Detected when a claim is partially_accurate — the custom exists
 * but not in the era depicted.
 */
function checkEraMismatch(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const cul of graph.cultural) {
    if (cul.verdict === "partially_accurate") {
      results.push({
        checker: "CulturalChecker",
        rule: "era_mismatch",
        severity: "warning",
        message:
          `Cultural era mismatch for "${cul.subject}" in ${cul.regionAndEra}: ` +
          `"${cul.claim}". This custom may not apply to the depicted time period. ` +
          (cul.correction ? `Note: ${cul.correction}. ` : ""),
        evidence: [cul.id],
      });
    }
  }

  return results;
}

/**
 * Check 3: Stereotyping
 * Detects overly broad cultural generalizations.
 * Triggered by cultural claims that use universalizing language.
 */
function checkStereotyping(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const UNIVERSALIZING = /\b(all|every|always|never|typical|stereotype|exotic|primitive|backward)\b/i;

  for (const cul of graph.cultural) {
    if (UNIVERSALIZING.test(cul.claim)) {
      results.push({
        checker: "CulturalChecker",
        rule: "stereotyping",
        severity: "warning",
        message:
          `Possible cultural stereotyping: "${cul.claim}" uses universalizing ` +
          `language about "${cul.subject}". Cultural practices vary within communities ` +
          `and should not be generalized with words like "all", "every", "always", etc.`,
        evidence: [cul.id],
      });
    }
  }

  return results;
}

/**
 * Check 4: Unverifiable Culture
 * Niche cultural claims that need expert or local verification.
 */
function checkUnverifiableCulture(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const unverifiable = graph.cultural.filter(
    (c) => c.confidence === "unverifiable" || c.confidence === "low"
  );

  for (const cul of unverifiable) {
    results.push({
      checker: "CulturalChecker",
      rule: "unverifiable_culture",
      severity: "warning",
      message:
        `Unverifiable cultural claim for "${cul.subject}" (${cul.regionAndEra}): ` +
        `"${cul.claim}". Consider consulting cultural experts or primary sources.`,
      evidence: [cul.id],
    });
  }

  return results;
}
