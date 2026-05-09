/**
 * Premise-staging discipline (R8-C in TODO.md).
 *
 * Two checker rules — `PropositionalChecker/unsupported_conclusion` and
 * `SoundnessChecker/non_sequitur` — keep recurring in real generation runs
 * with the same shape: the model writes a flat assertion ("Zhi is innocent",
 * "the interrogation is a setup") in narration without staging the
 * supporting premise in the prose first. The patch LLM rewrites the
 * conclusion sentence but doesn't add the missing premise — so the next
 * round flags the same failure.
 *
 * R8-C closes the loop in two places:
 *   1. Patch prompt augmentation — `buildPremiseStagingInstruction`
 *      adds an explicit constraint when the issue is one of the two rules,
 *      asking for BOTH an insertion (the missing premise) AND a
 *      modification (the now-grounded conclusion).
 *   2. Patch shape validation — `validatePremisePatch` rejects single-line
 *      conclusion-only edits and deletion-only edits before they reach the
 *      draft, forcing the runner to ask the LLM to retry.
 */

import { extractFingerprint } from "./oscillation-guard";

/**
 * The two rules whose violations require explicit premise insertion before
 * the conclusion sentence is rewritten.
 */
export const PREMISE_STAGING_RULES: readonly string[] = [
  "PropositionalChecker/unsupported_conclusion",
  "SoundnessChecker/non_sequitur",
];

/** Returns true iff the feedback's fingerprint is in PREMISE_STAGING_RULES. */
export function requiresPremiseStaging(feedback: string): boolean {
  const fp = extractFingerprint(feedback);
  if (fp === null) return false;
  return PREMISE_STAGING_RULES.includes(fp);
}

/**
 * A single ORIGINAL/REVISED edit produced by `applyDiffPatches`. We keep
 * the type local instead of importing `DiffEntry` from the runner to avoid
 * a circular dependency between `runner/premise-staging.ts` and
 * `runner/index.ts` — the runner can pass through any structurally
 * compatible value.
 */
export interface PremiseDiff {
  original: string;
  revised: string;
}

export interface PremiseValidationResult {
  accepted: boolean;
  /** When `accepted=false`, a short human-readable reason. */
  reason?: string;
}

/**
 * Validates a patch's *shape* against the premise-staging requirement.
 *
 * Acceptable shapes:
 *   A. **Multi-diff**: ≥2 diffs (the LLM clearly inserted somewhere AND
 *      modified somewhere else — the canonical "premise + grounded
 *      conclusion" pattern).
 *   B. **Single-diff insertion**: exactly 1 diff whose `revised` is at
 *      least 1.5× the length of `original`. The LLM packaged the inserted
 *      premise and the modified conclusion into a single block — fine,
 *      because the inserted text dominates the diff.
 *
 * Rejected shapes:
 *   - Empty diff list (LLM returned NO_CHANGE or malformed response).
 *   - Single-diff edits where the revised text is comparable to or shorter
 *     than the original — these are conclusion-only rewrites or deletions,
 *     which are exactly the failure mode R8-C is designed to catch.
 */
export function validatePremisePatch(
  diffs: readonly PremiseDiff[]
): PremiseValidationResult {
  if (diffs.length === 0) {
    return {
      accepted: false,
      reason:
        "Patch produced no diffs — premise-staging requires an insertion (the missing premise) AND a modification (the grounded conclusion).",
    };
  }
  if (diffs.length >= 2) {
    return { accepted: true };
  }
  // Single-diff path: require a meaningful insertion (revised >= 1.5x the
  // original by character count). The 1.5x threshold is empirical: tightening
  // it to 2x rejects too many legitimate "added a clause" patches; loosening
  // it to 1.2x lets through paraphrase-only edits that don't actually stage
  // a premise.
  const single = diffs[0]!;
  const origLen = single.original.length;
  const revLen = single.revised.length;
  if (revLen >= origLen * 1.5) {
    return { accepted: true };
  }
  return {
    accepted: false,
    reason:
      "Single-diff patch did not insert a premise. The revised text must extend the original substantially — premise-staging requires both an insertion (the missing premise) and a modification (the grounded conclusion).",
  };
}

/**
 * Builds the patch-prompt augmentation block for a premise-needing issue.
 * Returns an empty string for unrelated issues so callers can concatenate
 * unconditionally.
 *
 * The wording closely tracks TODO.md R8-C so that the LLM gets the same
 * constraint we've been documenting in the project notes.
 */
export function buildPremiseStagingInstruction(feedback: string): string {
  if (!requiresPremiseStaging(feedback)) return "";
  return [
    "",
    "## ⚠ Premise-Staging Constraint",
    "This issue requires you to add a missing premise to the prose, not just rewrite the conclusion sentence.",
    "Your replacement MUST satisfy two constraints:",
    "  (a) Add the supporting premise to the prose **before** the conclusion in document order.",
    "      The premise must appear in narration, dialogue, or action — not just in your reasoning.",
    "  (b) The patch diff must include both an insertion (the new premise) AND a modification",
    "      (the conclusion now grounded). A single-line edit that only changes the conclusion sentence",
    "      is forbidden and will be rejected.",
    "",
    "If you cannot ground the conclusion in this scene, return `NO_CHANGE`.",
  ].join(String.fromCharCode(10));
}
