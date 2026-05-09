/**
 * OscillationGuard — tracks `(checker, rule)` fingerprints across validation
 * rounds so the runner can detect when the patch loop is "fighting itself"
 * (R8-A in TODO.md).
 *
 * Background: real generation runs on the family-history prompt showed the
 * same `[EpistemicChecker/psychic_knowledge]` violation firing in rounds 1,
 * 2, 3, and 5 of a single session — the patch in round N would fix issue X
 * but reintroduce issue Y from round N-1. Without per-session memory of
 * prior violations, the runner has no way to ask the patch LLM "do not
 * reintroduce the violation we already paid to fix."
 *
 * This module provides the data structure. Wiring into the patch prompt and
 * structural-escalation paths lives in `runner/index.ts`.
 *
 * The fingerprint is intentionally `${checker}/${rule}` (not including the
 * message text or evidence target). The same rule firing on a different
 * paragraph still counts as the same oscillation: the patch LLM is failing
 * to internalize the rule itself, not just one site of it.
 */

/**
 * Parses the canonical `[Checker/rule] message` feedback string format
 * produced by the hybrid harness (`environment/hybrid-harness.ts`).
 *
 * Returns `${checker}/${rule}` or `null` if the string does not have a
 * structured prefix (e.g. tier-1 style notes, infrastructure warnings, or
 * harness execution errors).
 */
export function extractFingerprint(feedback: string): string | null {
  if (!feedback || !feedback.trim()) return null;

  // Match leading "[ ... ]" prefix.
  const m = feedback.match(/^\[([^\]]+)\]/);
  const inside = m?.[1];
  if (!inside) return null;

  // Inside may be "Checker/rule" or "Checker/rule/severity". We always keep
  // the first two segments only — severity is incidental metadata, not part
  // of the rule identity.
  const parts = inside.split("/");
  if (parts.length < 2) return null;

  const checker = (parts[0] ?? "").trim();
  const rule = (parts[1] ?? "").trim();
  if (!checker || !rule) return null;

  return `${checker}/${rule}`;
}

/**
 * Per-session memory of which `(checker, rule)` fingerprints have fired in
 * which validation rounds.
 *
 * Multiple violations of the SAME rule within a single round count as one
 * sighting — they're a single "the LLM has not internalized this rule"
 * signal, not N independent oscillations.
 */
export class OscillationGuard {
  /** fingerprint → set of round numbers in which the fingerprint fired. */
  private readonly seen = new Map<string, Set<number>>();

  /**
   * Records all fingerprintable feedback entries for `round`.
   * Entries that don't carry a `[Checker/rule]` prefix are silently
   * skipped — they cannot oscillate because the patch LLM has no
   * structured handle on them.
   */
  recordRound(round: number, feedback: readonly string[]): void {
    for (const entry of feedback) {
      const fp = extractFingerprint(entry);
      if (fp === null) continue;
      let rounds = this.seen.get(fp);
      if (!rounds) {
        rounds = new Set<number>();
        this.seen.set(fp, rounds);
      }
      rounds.add(round);
    }
  }

  /**
   * Returns the sorted list of rounds in which `fingerprint` has been
   * recorded. Empty array for unseen fingerprints. Useful for telling the
   * patch LLM "this rule already fired in rounds 1, 2, 3."
   */
  priorRounds(fingerprint: string): number[] {
    const rounds = this.seen.get(fingerprint);
    if (!rounds) return [];
    return [...rounds].sort((a, b) => a - b);
  }

  /**
   * True iff `fingerprint` was recorded in any round STRICTLY BEFORE
   * `currentRound`. The current round is excluded because a fingerprint
   * firing for the first time in this round isn't an oscillation yet — the
   * runner is seeing it now and trying to fix it for the first time.
   */
  wasSeenInPriorRound(currentRound: number, fingerprint: string): boolean {
    const rounds = this.seen.get(fingerprint);
    if (!rounds) return false;
    for (const r of rounds) {
      if (r < currentRound) return true;
    }
    return false;
  }

  /**
   * Number of recurrences = (number of distinct rounds the fingerprint
   * fired in) - 1. The first sighting is not a recurrence; each
   * subsequent round IS.
   */
  recurrenceCount(fingerprint: string): number {
    const rounds = this.seen.get(fingerprint);
    if (!rounds || rounds.size === 0) return 0;
    return rounds.size - 1;
  }

  /**
   * Decision helper for the runner: "is it time to stop patching this
   * rule and rewrite the offending scene structurally?"
   *
   * Threshold semantics: returns true when `recurrenceCount >= threshold`,
   * i.e. the fingerprint has fired in at least `threshold + 1` distinct
   * rounds. With threshold=2 (the recommended default per the TODO), this
   * fires after the third sighting — round 1 introduced it, rounds 2 and
   * 3 each tried (and failed) to patch it.
   */
  shouldEscalateToStructural(fingerprint: string, threshold: number): boolean {
    return this.recurrenceCount(fingerprint) >= threshold;
  }

  /**
   * All fingerprints whose recurrence count is at or above `threshold`,
   * sorted alphabetically for deterministic output (logs, snapshots).
   */
  allRecurrent(threshold: number): string[] {
    const out: string[] = [];
    for (const [fp] of this.seen) {
      if (this.recurrenceCount(fp) >= threshold) {
        out.push(fp);
      }
    }
    return out.sort();
  }
}
