import type { LogicGraph, Proposition } from "../types/logic-graph";
import type { CheckResult } from "./types";

/**
 * JustificationChecker — Verifies whether stated justifications/reasons are defensible.
 *
 * Checks:
 * 1. Absurd causal claims: the stated reason doesn't logically address the action's purpose
 * 2. Category errors: justifications that confuse the domain/purpose of an action
 * 3. Tautological explanations: the justification merely restates the question as the answer
 */
export function checkJustification(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const propById = new Map<string, Proposition>();
  for (const p of graph.propositions) {
    propById.set(p.id, p);
  }

  // Only check narrative-sourced rules (lore/world_rule are accepted as-is)
  const narrativeRules = graph.rules.filter(r => r.source === "narrative");

  for (const rule of narrativeRules) {
    const antecedent = propById.get(rule.antecedent);
    const consequent = propById.get(rule.consequent);

    // Skip if we can't resolve both propositions
    if (!antecedent || !consequent) continue;

    const antWords = extractContentWords(antecedent.text);
    const conWords = extractContentWords(consequent.text);

    // Check 1: Tautological explanation (highest priority — restates the same thing)
    if (isTautological(antWords, conWords)) {
      results.push({
        checker: "JustificationChecker",
        rule: "tautological_explanation",
        severity: "warning",
        message:
          `Tautological explanation at ${rule.location}: ` +
          `"${antecedent.text}" → "${consequent.text}" — ` +
          `the justification merely restates the conclusion in different words.`,
        evidence: [antecedent.id, consequent.id, rule.id],
      });
      continue; // Don't double-flag
    }

    // Check 2: Absurd causal claim (domain mismatch)
    if (isAbsurdCausalClaim(antecedent, consequent)) {
      results.push({
        checker: "JustificationChecker",
        rule: "absurd_causal_claim",
        severity: "warning",
        message:
          `Absurd causal claim at ${rule.location}: ` +
          `"${antecedent.text}" is used to justify "${consequent.text}" — ` +
          `the stated reason does not logically address the action's purpose.`,
        evidence: [antecedent.id, consequent.id, rule.id],
      });
      continue;
    }

    // Check 3: Category error (aesthetic ↔ functional confusion)
    if (isCategoryError(antWords, conWords)) {
      results.push({
        checker: "JustificationChecker",
        rule: "category_error",
        severity: "warning",
        message:
          `Category error at ${rule.location}: ` +
          `"${antecedent.text}" → "${consequent.text}" — ` +
          `the justification confuses the domain or purpose of the action.`,
        evidence: [antecedent.id, consequent.id, rule.id],
      });
    }
  }

  return results;
}

/**
 * Stop words to exclude from content word extraction.
 */
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "cannot", "could", "not",
  "and", "but", "or", "nor", "for", "yet", "so", "if", "then", "that",
  "this", "these", "those", "with", "without", "from", "into", "onto",
  "upon", "about", "only", "also", "very", "too", "just", "any", "all",
  "each", "every", "both", "either", "neither", "no", "of", "in", "on",
  "at", "to", "by", "it", "its", "he", "she", "they", "them", "his",
  "her", "their", "him", "who", "what", "which", "when", "where", "how",
  "why", "because", "therefore", "thus", "hence", "since", "as", "than",
  "more", "most", "some", "such", "than", "there", "here", "did", "does",
  "been", "being", "much", "many", "own", "other", "another",
]);

/**
 * Extract meaningful content words from text, filtering stop words.
 * Returns lowercased words with length >= 3.
 */
function extractContentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word));
}

/**
 * Compute Jaccard similarity between two word sets.
 */
function jaccardSimilarity(wordsA: string[], wordsB: string[]): number {
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check if the consequent's content words are largely contained in the antecedent,
 * indicating a tautological explanation (the "reason" just restates the claim).
 *
 * Threshold: Jaccard >= 0.5 OR consequent words are ≥70% covered by antecedent.
 */
function isTautological(antWords: string[], conWords: string[]): boolean {
  if (antWords.length === 0 || conWords.length === 0) return false;

  const similarity = jaccardSimilarity(antWords, conWords);
  if (similarity >= 0.5) return true;

  // Check if consequent is a subset of antecedent
  const antSet = new Set(antWords);
  let covered = 0;
  for (const w of conWords) {
    if (antSet.has(w)) covered++;
  }
  const coverage = covered / conWords.length;
  return coverage >= 0.7;
}

/**
 * Domain categories for detecting absurd causal claims.
 * Maps domain keywords to their category label.
 */
const DOMAIN_CATEGORIES: Array<{ keywords: Set<string>; category: string }> = [
  // Physical toughness / strength
  { keywords: new Set(["tough", "strong", "strength", "endurance", "muscle", "resilient", "withstand", "resistant"]), category: "physical_toughness" },
  // Protective equipment / safety
  { keywords: new Set(["gloves", "helmet", "gear", "protective", "armor", "shield", "mask", "goggles", "suit"]), category: "protective_equipment" },
  // Forensic / evidence
  { keywords: new Set(["evidence", "fingerprint", "forensic", "scene", "crime", "investigation", "clue"]), category: "forensic_procedure" },
  // Aesthetic / beauty
  { keywords: new Set(["beautiful", "elegant", "pretty", "gorgeous", "lovely", "aesthetic", "attractive", "stunning"]), category: "aesthetic" },
  // Structural / engineering
  { keywords: new Set(["support", "load", "weight", "structural", "bearing", "capacity", "heavy", "traffic"]), category: "structural" },
  // Heat / temperature
  { keywords: new Set(["heat", "temperature", "furnace", "fire", "burn", "hot", "cold", "freezing"]), category: "thermal" },
];

/**
 * Classify text into domain categories based on keyword presence.
 */
function classifyDomain(words: string[]): Set<string> {
  const domains = new Set<string>();
  for (const category of DOMAIN_CATEGORIES) {
    for (const word of words) {
      if (category.keywords.has(word)) {
        domains.add(category.category);
        break;
      }
    }
  }
  return domains;
}

/**
 * Known absurd causal patterns: when a "reason" from one domain is used
 * to justify skipping something from a different, unrelated domain.
 */
const ABSURD_DOMAIN_PAIRS: Array<{ reasonDomain: string; actionDomain: string }> = [
  { reasonDomain: "physical_toughness", actionDomain: "protective_equipment" },
  { reasonDomain: "physical_toughness", actionDomain: "forensic_procedure" },
  { reasonDomain: "physical_toughness", actionDomain: "thermal" },
];

/**
 * Check if the antecedent (reason) is from a domain that absurdly doesn't
 * support the consequent (action) domain.
 *
 * E.g., "hands were tough" (physical_toughness) → "didn't wear gloves" (protective_equipment)
 * The toughness of hands doesn't address why gloves are needed (forensics, not protection).
 */
function isAbsurdCausalClaim(antecedent: Proposition, consequent: Proposition): boolean {
  const antWords = extractContentWords(antecedent.text);
  const conWords = extractContentWords(consequent.text);

  const antDomains = classifyDomain(antWords);
  const conDomains = classifyDomain(conWords);

  for (const pair of ABSURD_DOMAIN_PAIRS) {
    if (antDomains.has(pair.reasonDomain) && conDomains.has(pair.actionDomain)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the antecedent and consequent are from fundamentally different
 * domain categories, indicating a category error.
 *
 * E.g., aesthetic → structural, emotional → mechanical
 */
const CATEGORY_ERROR_PAIRS: Array<{ fromDomain: string; toDomain: string }> = [
  { fromDomain: "aesthetic", toDomain: "structural" },
  { fromDomain: "aesthetic", toDomain: "thermal" },
];

function isCategoryError(antWords: string[], conWords: string[]): boolean {
  const antDomains = classifyDomain(antWords);
  const conDomains = classifyDomain(conWords);

  for (const pair of CATEGORY_ERROR_PAIRS) {
    if (antDomains.has(pair.fromDomain) && conDomains.has(pair.toDomain)) {
      return true;
    }
  }

  return false;
}
