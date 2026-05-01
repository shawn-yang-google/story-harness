import type { ReferenceGraph, AnachronismEntry } from "../types/reference-graph";
import type { CheckResult } from "../logic/types";

/**
 * AnachronismChecker — Detects objects, technology, concepts, and language
 * that don't belong in the story's time period.
 *
 * Checks:
 * 1. technology_anachronism: Tech/device from a later era
 * 2. concept_anachronism: Ideas/institutions that didn't exist yet
 * 3. language_anachronism: Words/phrases coined after the story's era
 * 4. cultural_anachronism: Cultural products (music, brands, media) from wrong era
 */
export function checkAnachronism(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkTechnologyAnachronism(graph));
  results.push(...checkConceptAnachronism(graph));
  results.push(...checkLanguageAnachronism(graph));
  results.push(...checkCulturalAnachronism(graph));

  return results;
}

/** Technology and device patterns */
const TECH_PATTERNS = /\b(phone|smartphone|computer|internet|email|television|tv|radio|car|automobile|airplane|telegraph|photograph|camera|microphone|satellite|gps|laser|nuclear|transistor|microchip|rocket)\b/i;

/** Concept/institution patterns */
const CONCEPT_PATTERNS = /\b(united nations|nato|eu|european union|who|world health|imf|world bank|communism|fascism|democracy|republic|parliament|congress)\b/i;

/**
 * Check 1: Technology Anachronism
 * Technology or devices that didn't exist in the story's time period.
 */
function checkTechnologyAnachronism(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const anach of graph.anachronisms) {
    if (TECH_PATTERNS.test(anach.element.toLowerCase())) {
      results.push({
        checker: "AnachronismChecker",
        rule: "technology_anachronism",
        severity: "error",
        message:
          `Technology anachronism: "${anach.element}" appears in a story ` +
          `set in ${anach.storyTimePeriod}, but this technology is from ` +
          `${anach.actualTimePeriod}. ${anach.description}. ` +
          `[excerpt: "${anach.excerpt.slice(0, 100)}"]`,
        evidence: [anach.id],
      });
      continue;
    }

    // Default: still an anachronism even if not specifically tech
    if (!CONCEPT_PATTERNS.test(anach.element.toLowerCase())) {
      // Will be caught by other checks or the default below
    }
  }

  return results;
}

/**
 * Check 2: Concept Anachronism
 * Ideas, institutions, or social constructs that didn't exist yet.
 */
function checkConceptAnachronism(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const anach of graph.anachronisms) {
    if (
      CONCEPT_PATTERNS.test(anach.element.toLowerCase()) &&
      !TECH_PATTERNS.test(anach.element.toLowerCase())
    ) {
      results.push({
        checker: "AnachronismChecker",
        rule: "concept_anachronism",
        severity: "error",
        message:
          `Concept anachronism: "${anach.element}" is referenced in a story ` +
          `set in ${anach.storyTimePeriod}, but this concept/institution ` +
          `didn't exist until ${anach.actualTimePeriod}. ${anach.description}.`,
        evidence: [anach.id],
      });
    }
  }

  return results;
}

/**
 * Check 3: Language Anachronism
 * Derived from LinguisticReferences that are anachronistic,
 * plus explicit anachronism entries about language.
 */
function checkLanguageAnachronism(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  // From linguistic references marked as anachronistic
  for (const ling of graph.linguistic) {
    if (
      (ling.type === "slang" || ling.type === "period_language") &&
      ling.verdict === "inaccurate" &&
      ling.confidence === "high"
    ) {
      results.push({
        checker: "AnachronismChecker",
        rule: "language_anachronism",
        severity: "error",
        message:
          `Language anachronism: "${ling.claim}" in ${ling.regionAndEra}. ` +
          `This expression or speech pattern didn't exist in the depicted era. ` +
          (ling.correction ? `Note: ${ling.correction}. ` : "") +
          `[excerpt: "${ling.excerpt.slice(0, 100)}"]`,
        evidence: [ling.id],
      });
    }
  }

  return results;
}

/**
 * Check 4: Cultural Anachronism
 * Cultural products (music, brands, movies, media) from wrong era.
 * Catches anachronisms not covered by tech or concept patterns.
 */
function checkCulturalAnachronism(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const anach of graph.anachronisms) {
    if (
      !TECH_PATTERNS.test(anach.element.toLowerCase()) &&
      !CONCEPT_PATTERNS.test(anach.element.toLowerCase())
    ) {
      results.push({
        checker: "AnachronismChecker",
        rule: "cultural_anachronism",
        severity: "error",
        message:
          `Anachronism: "${anach.element}" appears in a story set in ` +
          `${anach.storyTimePeriod}, but this didn't exist until ` +
          `${anach.actualTimePeriod}. ${anach.description}.` +
          `[excerpt: "${anach.excerpt.slice(0, 100)}"]`,
        evidence: [anach.id],
      });
    }
  }

  return results;
}
