/**
 * Knowledge-source staging discipline (R10-A in TODO.md).
 *
 * The R9 empirical run revealed that `EpistemicChecker/psychic_knowledge`
 * recurred in EVERY round of both Q1 sessions (recurrence=4). R8-A's
 * oscillation warning made the recurrence visible but did not stop the
 * patch LLM from producing the same shape of broken fix: rewriting the
 * knowledge sentence ("Ying knew Zhi was missing.") in place without
 * STAGING the source of that knowledge anywhere in the prose.
 *
 * R10-A closes the loop the same way R8-C did for premise-staging:
 *
 *   1. Patch prompt augmentation — `buildKnowledgeSourceStagingInstruction`
 *      adds an explicit constraint when the issue is a knowledge-source
 *      rule, asking for BOTH an insertion (the staged source — overheard
 *      conversation, discovered document, witness, deduction from prior
 *      scene) AND a modification (the now-grounded knowledge sentence).
 *   2. Patch shape validation — `validateKnowledgeSourcePatch` rejects
 *      single-line knowledge-rewrite-in-place patches and deletion-only
 *      patches before they reach the draft, forcing the runner to ask
 *      the LLM to retry.
 *
 * The two-rule sets (PREMISE_STAGING_RULES from R8-C and
 * KNOWLEDGE_SOURCE_STAGING_RULES here) are deliberately disjoint — the
 * `requires*` predicates partition the rule space so the runner can call
 * both without double-augmenting the prompt for any single feedback.
 */

import { extractFingerprint } from "./oscillation-guard";

/**
 * The rules whose violations require explicit knowledge-source staging
 * before the agent's knowledge claim is rewritten. Currently only
 * `psychic_knowledge`, but the registry shape mirrors
 * `PREMISE_STAGING_RULES` so future epistemic-shape rules can be added
 * without changing the runner wiring.
 */
export const KNOWLEDGE_SOURCE_STAGING_RULES: readonly string[] = [
  "EpistemicChecker/psychic_knowledge",
];

/** Returns true iff the feedback's fingerprint is in KNOWLEDGE_SOURCE_STAGING_RULES. */
export function requiresKnowledgeSourceStaging(feedback: string): boolean {
  const fp = extractFingerprint(feedback);
  if (fp === null) return false;
  return KNOWLEDGE_SOURCE_STAGING_RULES.includes(fp);
}

/**
 * A single ORIGINAL/REVISED edit produced by `applyDiffPatches`. Kept
 * structurally identical to `PremiseDiff` from `premise-staging.ts` so
 * the runner can pass through any compatible value without converting,
 * and to avoid a circular dependency with `runner/index.ts`.
 */
export interface KnowledgeSourceDiff {
  original: string;
  revised: string;
}

export interface KnowledgeSourceValidationResult {
  accepted: boolean;
  /** When `accepted=false`, a short human-readable reason. */
  reason?: string;
}

/**
 * Validates a patch's *shape* against the knowledge-source staging
 * requirement.
 *
 * Acceptable shapes:
 *   A. **Multi-diff**: ≥2 diffs (the LLM clearly inserted a source
 *      somewhere AND modified the knowledge claim somewhere else — the
 *      canonical "stage source + ground knowledge" pattern).
 *   B. **Single-diff insertion**: exactly 1 diff whose `revised` is at
 *      least 1.5× the length of `original`. The LLM packaged the source
 *      and the modified knowledge claim into a single block — fine,
 *      because the inserted text dominates the diff.
 *
 * Rejected shapes:
 *   - Empty diff list (LLM returned NO_CHANGE or malformed response).
 *   - Single-diff edits where the revised text is comparable to or
 *     shorter than the original — these are knowledge-rewrite-in-place
 *     edits or deletions, which are exactly the failure mode R10-A is
 *     designed to catch.
 *
 * The 1.5× threshold is intentionally identical to R8-C's
 * `validatePremisePatch`. The two gates share the same empirical
 * justification: looser thresholds let through paraphrases that don't
 * actually stage anything; tighter thresholds reject legitimate
 * "added a clause" patches.
 */
export function validateKnowledgeSourcePatch(
  diffs: readonly KnowledgeSourceDiff[]
): KnowledgeSourceValidationResult {
  if (diffs.length === 0) {
    return {
      accepted: false,
      reason:
        "Patch produced no diffs — knowledge-source staging requires an insertion (the staged source) AND a modification (the grounded knowledge sentence).",
    };
  }
  if (diffs.length >= 2) {
    return { accepted: true };
  }
  const single = diffs[0]!;
  const origLen = single.original.length;
  const revLen = single.revised.length;
  if (revLen >= origLen * 1.5) {
    return { accepted: true };
  }
  return {
    accepted: false,
    reason:
      "Single-diff patch did not insert a knowledge source. The revised text must extend the original substantially — knowledge-source staging requires both an insertion (the staged source — overheard conversation, document, witness, or deduction) and a modification (the grounded knowledge sentence).",
  };
}

/**
 * Builds the patch-prompt augmentation block for a knowledge-source-needing
 * issue. Returns an empty string for unrelated issues so callers can
 * concatenate unconditionally.
 *
 * The wording closely tracks TODO.md R10-A so that the LLM gets the same
 * constraint we've been documenting in the project notes.
 */
export function buildKnowledgeSourceStagingInstruction(feedback: string): string {
  if (!requiresKnowledgeSourceStaging(feedback)) return "";
  return [
    "",
    "## ⚠ Knowledge-Source Staging Constraint",
    "This issue requires you to STAGE the source of the agent's knowledge in the prose, not just rewrite the knowledge sentence.",
    "Your replacement MUST satisfy two constraints:",
    "  (a) Add a concrete source for HOW the agent learned the information **before** they act on it in document order.",
    "      Pick one mechanism that fits the scene: an overheard conversation, a discovered document or letter,",
    "      a witness who told them, or a deduction from a prior on-page event. The mechanism must appear in",
    "      narration, dialogue, or action — not just in your reasoning.",
    "  (b) The patch diff must include both an insertion (the staged source) AND a modification",
    "      (the knowledge sentence now grounded in that source). A single-line edit that only paraphrases",
    "      the knowledge sentence is forbidden and will be rejected.",
    "",
    "If you cannot ground the knowledge in this scene, return `NO_CHANGE`.",
  ].join(String.fromCharCode(10));
}
