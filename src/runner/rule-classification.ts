/**
 * Rule classification — answers "is this feedback fixable by a sentence-level
 * patch (`surgical`), or does it require rewriting the whole scene
 * (`structural`)?"
 *
 * Background (R8-B in TODO.md): real generation runs showed Tier-3
 * narrative-craft critiques (`Page-Turner Momentum`, `Cringe Factor`,
 * `Who Cares?`, `cement_block_character`, `indistinct_voices`) firing in
 * EVERY round of two consecutive failed sessions because the patch loop
 * tried to surgically replace tokens to satisfy verdicts like "the
 * interrogation scene reads like a soap opera" — an unfixable approach.
 *
 * The runner previously special-cased a hardcoded list of 6 substring
 * patterns inside `index.ts`. This module replaces that list with a
 * single-place registry so:
 *   - Tier-2 fingerprints (e.g. `CharacterChecker/cement_block_character`)
 *     are mapped explicitly via STRUCTURAL_FINGERPRINTS.
 *   - Tier-3 free-form feedback (no `[Checker/rule]` prefix) is matched
 *     against STRUCTURAL_TIER3_PATTERNS via case-insensitive substring.
 *   - Anything else defaults to `surgical` — the safer choice (a surgical
 *     patch can never make the draft worse than a structural rewrite would).
 */

import { extractFingerprint } from "./oscillation-guard";

export type FeedbackClass = "structural" | "surgical";

/**
 * Tier-2 (hybrid harness) fingerprints in `${checker}/${rule}` form that
 * cannot be fixed by a single ORIGINAL/REVISED replacement and instead
 * require rewriting the offending scene/section.
 *
 * The criterion for inclusion: the rule fires on a SCENE-LEVEL property
 * (character depth, dramatic tension, information density) rather than a
 * SENTENCE-LEVEL property (a specific factual claim, a temporal
 * inconsistency, an unsourced statistic).
 *
 * Adding a new rule here is a one-line change. Removing one degrades to
 * surgical-only handling — which is also safe.
 */
export const STRUCTURAL_FINGERPRINTS: readonly string[] = [
  // Character craft — these flag identity/depth issues that span the scene.
  "CharacterChecker/cement_block_character",
  "CharacterChecker/unearned_emotion",
  // Dialogue craft — these fire on patterns that span multiple lines.
  // (Both checkers exist; emit-source verified via grep.)
  "DialogueChecker/exposition_dump",
  "DialogueChecker/indistinct_voices",
  "DialogueChecker/no_subtext",
  "DialogueChecker/no_conflict",
  // Narrative craft — subtext / conflict / obstacle absence is structural.
  "NarrativeChecker/no_conflict",
  "NarrativeChecker/no_obstacle",
];

/**
 * Lower-cased substrings that, if present in a Tier-3 feedback string (no
 * fingerprint), mark the verdict as a scene-level reader-experience problem.
 *
 * Sourced directly from `harnesses/ReaderExperience.prompt.txt` — every
 * dimension that can score 1-2 there is a "I would stop reading" verdict
 * and cannot be fixed by editing one sentence. Keep the strings lowercase
 * since classifyFeedback lowercases the input before comparing.
 */
export const STRUCTURAL_TIER3_PATTERNS: readonly string[] = [
  "opening hook",
  "who cares?",
  "page-turner momentum",
  "cringe factor",
  "voice distinctiveness",
];

/**
 * Returns the class of a single feedback string.
 *
 * Decision order:
 *   1. If the feedback parses to a known Tier-2 fingerprint in
 *      STRUCTURAL_FINGERPRINTS → structural.
 *   2. Else if the feedback (case-insensitive) contains any structural
 *      Tier-3 keyword → structural.
 *   3. Else → surgical.
 *
 * Infrastructure noise (`⚠ ... skipped`, `Harness failed: ...`) defaults
 * to surgical because none of the structural patterns match it. We
 * intentionally do NOT short-circuit on it — it should never trigger a
 * scene rewrite, but the surgical patch loop already filters it out via
 * `!startsWith("⚠")` and `!includes("Harness failed:")` in the runner.
 */
export function classifyFeedback(feedback: string): FeedbackClass {
  // Step 1: Tier-2 fingerprint lookup.
  const fp = extractFingerprint(feedback);
  if (fp !== null) {
    if (STRUCTURAL_FINGERPRINTS.includes(fp)) return "structural";
    return "surgical";
  }

  // Step 2: Tier-3 substring keyword match.
  const haystack = feedback.toLowerCase();
  for (const pattern of STRUCTURAL_TIER3_PATTERNS) {
    if (haystack.includes(pattern)) return "structural";
  }

  // Step 3: default.
  return "surgical";
}
