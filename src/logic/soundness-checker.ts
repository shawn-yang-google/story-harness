import type { LogicGraph, Proposition } from "../types/logic-graph";
import type { CheckResult } from "./types";

/**
 * SoundnessChecker — Verifies whether conclusions are sound, not just formally valid.
 *
 * Checks:
 * 1. Vacuous deduction: premise is trivially obvious relative to the conclusion
 * 2. Non-sequitur reasoning: premises have no meaningful connection to the claim
 * 3. Circular reasoning: premise is essentially a restatement of the conclusion
 */
export function checkSoundness(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const propById = new Map<string, Proposition>();
  for (const p of graph.propositions) {
    propById.set(p.id, p);
  }

  for (const conclusion of graph.conclusions) {
    // Skip conclusions with no premises (handled by PropositionalChecker)
    if (conclusion.premises.length === 0) continue;

    // Resolve premise propositions
    const resolvedPremises: Proposition[] = [];
    for (const premId of conclusion.premises) {
      const prop = propById.get(premId);
      if (prop) resolvedPremises.push(prop);
    }

    // Skip if we can't resolve any premises
    if (resolvedPremises.length === 0) continue;

    const claimWords = extractContentWords(conclusion.claim);
    const premiseTexts = resolvedPremises.map(p => p.text);
    const allPremiseWords = premiseTexts.flatMap(t => extractContentWords(t));
    const uniquePremiseWords = [...new Set(allPremiseWords)];

    // Check 1: Circular reasoning (highest priority — premise ≈ conclusion)
    if (isCircularReasoning(claimWords, uniquePremiseWords, premiseTexts, conclusion.claim)) {
      results.push({
        checker: "SoundnessChecker",
        rule: "circular_reasoning",
        severity: "error",
        message:
          `Circular reasoning at ${conclusion.location}: ` +
          `"${conclusion.claim}" — the premise is essentially a restatement of the conclusion. ` +
          `Premises: [${premiseTexts.map(t => `"${t}"`).join(", ")}].`,
        evidence: conclusion.premises,
      });
      continue; // Don't double-flag
    }

    // Check 2: Vacuous deduction (premise is trivially obvious)
    if (isVacuousDeduction(claimWords, uniquePremiseWords, premiseTexts)) {
      results.push({
        checker: "SoundnessChecker",
        rule: "vacuous_deduction",
        severity: "warning",
        message:
          `Vacuous deduction at ${conclusion.location}: ` +
          `"${conclusion.claim}" — the stated premise is trivially obvious and adds no real information. ` +
          `Premises: [${premiseTexts.map(t => `"${t}"`).join(", ")}].`,
        evidence: conclusion.premises,
      });
      continue;
    }

    // Check 3: Non-sequitur (premises don't support the claim)
    if (isNonSequitur(claimWords, uniquePremiseWords)) {
      results.push({
        checker: "SoundnessChecker",
        rule: "non_sequitur",
        severity: "warning",
        message:
          `Non-sequitur reasoning at ${conclusion.location}: ` +
          `"${conclusion.claim}" — the stated premises do not meaningfully support this claim. ` +
          `Premises: [${premiseTexts.map(t => `"${t}"`).join(", ")}].`,
        evidence: conclusion.premises,
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
 * Check if premise content words overlap excessively with the conclusion,
 * indicating circular reasoning (premise ≈ conclusion).
 *
 * Threshold: Jaccard similarity >= 0.6 (high overlap = restatement)
 */
function isCircularReasoning(
  claimWords: string[],
  premiseWords: string[],
  _premiseTexts: string[],
  _claim: string
): boolean {
  if (claimWords.length === 0 || premiseWords.length === 0) return false;

  const similarity = jaccardSimilarity(claimWords, premiseWords);
  return similarity >= 0.6;
}

/**
 * Check if the premise is trivially obvious relative to the conclusion.
 *
 * A vacuous deduction occurs when:
 * - The premise shares SOME words with the conclusion (not zero overlap)
 * - But the premise content is much more "contained" and self-evident
 *
 * Heuristic: moderate overlap (0.15–0.59) AND premise is short/simple
 * relative to the conclusion content.
 */
function isVacuousDeduction(
  claimWords: string[],
  premiseWords: string[],
  premiseTexts: string[]
): boolean {
  if (claimWords.length === 0 || premiseWords.length === 0) return false;

  const similarity = jaccardSimilarity(claimWords, premiseWords);

  // Moderate overlap range: some connection exists, but it's trivial
  if (similarity < 0.15 || similarity >= 0.6) return false;

  // Check if premises are short/simple relative to claim
  // Vacuous premises tend to be single, short statements
  const avgPremiseLength = premiseTexts.reduce((sum, t) => sum + t.length, 0) / premiseTexts.length;
  const isTriviallyShort = premiseTexts.length === 1 && avgPremiseLength < 60;

  // The premise shares words with the conclusion but doesn't add
  // new information. Check that the premise words mostly overlap
  // with claim words (premise is subset-like).
  const premiseSet = new Set(premiseWords);
  const claimSet = new Set(claimWords);
  let premiseWordsInClaim = 0;
  for (const w of premiseSet) {
    if (claimSet.has(w)) premiseWordsInClaim++;
  }
  const premiseCoverage = premiseSet.size > 0 ? premiseWordsInClaim / premiseSet.size : 0;

  return isTriviallyShort && premiseCoverage >= 0.3;
}

/**
 * Check if premises are entirely unrelated to the conclusion (non-sequitur).
 *
 * Heuristic: very low Jaccard similarity (< 0.05) means the premise
 * keywords share almost nothing with the conclusion keywords.
 */
function isNonSequitur(claimWords: string[], premiseWords: string[]): boolean {
  if (claimWords.length === 0 || premiseWords.length === 0) return false;

  const similarity = jaccardSimilarity(claimWords, premiseWords);
  return similarity < 0.05;
}
