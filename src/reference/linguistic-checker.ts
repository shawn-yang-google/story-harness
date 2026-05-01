import type { ReferenceGraph, LinguisticReference } from "../types/reference-graph";
import type { CheckResult } from "../logic/types";

/**
 * LinguisticChecker — Verifies linguistic and dialogue authenticity.
 *
 * Checks:
 * 1. dialect_mismatch: Character's speech doesn't match their stated region
 * 2. period_language_violation: Modern language in historical setting
 * 3. naming_inconsistency: Character names inappropriate for their background
 * 4. register_mismatch: Social register (formal/informal) wrong for context
 */
export function checkLinguistic(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkDialectMismatch(graph));
  results.push(...checkPeriodLanguage(graph));
  results.push(...checkNamingInconsistency(graph));
  results.push(...checkRegisterMismatch(graph));

  return results;
}

/**
 * Check 1: Dialect Mismatch
 * Speech patterns that don't match the character's stated regional background.
 */
function checkDialectMismatch(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const dialectRefs = graph.linguistic.filter(
    (l) => l.type === "dialect_feature" || l.type === "idiom"
  );

  for (const ling of dialectRefs) {
    if (ling.verdict === "inaccurate") {
      results.push({
        checker: "LinguisticChecker",
        rule: "dialect_mismatch",
        severity: ling.confidence === "high" ? "error" : "warning",
        message:
          `Dialect mismatch: speech pattern "${ling.claim}" is attributed ` +
          `to ${ling.regionAndEra} (${ling.languageOrDialect}), but this ` +
          `is not authentic for that region/dialect. ` +
          (ling.correction ? `Note: ${ling.correction}. ` : "") +
          `[excerpt: "${ling.excerpt.slice(0, 100)}"]`,
        evidence: [ling.id],
      });
    }
  }

  return results;
}

/**
 * Check 2: Period Language Violation
 * Modern slang, idioms, or expressions in a historical setting.
 */
function checkPeriodLanguage(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const periodRefs = graph.linguistic.filter(
    (l) => l.type === "period_language" || l.type === "slang"
  );

  for (const ling of periodRefs) {
    if (ling.verdict === "inaccurate" || ling.verdict === "partially_accurate") {
      results.push({
        checker: "LinguisticChecker",
        rule: "period_language_violation",
        severity: ling.verdict === "inaccurate" ? "error" : "warning",
        message:
          `Period language violation in ${ling.regionAndEra}: ` +
          `"${ling.claim}" — this expression or speech pattern may be ` +
          `anachronistic for the depicted time period. ` +
          (ling.correction ? `Note: ${ling.correction}. ` : "") +
          `[excerpt: "${ling.excerpt.slice(0, 100)}"]`,
        evidence: [ling.id],
      });
    }
  }

  return results;
}

/**
 * Check 3: Naming Inconsistency
 * Character names that don't fit their stated cultural/regional background.
 */
function checkNamingInconsistency(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const namingRefs = graph.linguistic.filter(
    (l) => l.type === "naming_convention"
  );

  for (const ling of namingRefs) {
    if (ling.verdict === "inaccurate") {
      results.push({
        checker: "LinguisticChecker",
        rule: "naming_inconsistency",
        severity: "warning",
        message:
          `Naming inconsistency: "${ling.claim}" — this name or naming ` +
          `convention doesn't match the character's stated background ` +
          `(${ling.regionAndEra}, ${ling.languageOrDialect}). ` +
          (ling.correction ? `Suggestion: ${ling.correction}. ` : ""),
        evidence: [ling.id],
      });
    }
  }

  return results;
}

/**
 * Check 4: Register Mismatch
 * Formal/informal register wrong for the social context.
 */
function checkRegisterMismatch(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const registerRefs = graph.linguistic.filter((l) => l.type === "register");

  for (const ling of registerRefs) {
    if (ling.verdict === "inaccurate" || ling.verdict === "partially_accurate") {
      results.push({
        checker: "LinguisticChecker",
        rule: "register_mismatch",
        severity: "warning",
        message:
          `Social register mismatch in ${ling.regionAndEra}: "${ling.claim}". ` +
          `The level of formality doesn't match the social context. ` +
          (ling.correction ? `Expected: ${ling.correction}. ` : ""),
        evidence: [ling.id],
      });
    }
  }

  return results;
}
