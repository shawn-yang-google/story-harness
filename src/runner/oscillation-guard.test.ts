import { describe, it, expect } from "bun:test";
import {
  extractFingerprint,
  OscillationGuard,
} from "./oscillation-guard";

describe("extractFingerprint", () => {
  //#given a feedback string in the canonical "[Checker/rule] message" form
  //#when extractFingerprint is called
  //#then it returns "Checker/rule"
  it("extracts checker/rule from a canonical feedback string", () => {
    expect(
      extractFingerprint(
        "[EpistemicChecker/psychic_knowledge] Psychic knowledge: Zhi knows X..."
      )
    ).toBe("EpistemicChecker/psychic_knowledge");
  });

  //#given a feedback string with severity in brackets
  //#when extractFingerprint is called
  //#then it returns "Checker/rule" without the severity tag
  it("ignores trailing severity tags inside the bracket prefix", () => {
    expect(
      extractFingerprint(
        "[SoundnessChecker/non_sequitur/error] paragraph 8 sentence 2..."
      )
    ).toBe("SoundnessChecker/non_sequitur");
  });

  //#given an unstructured feedback string (e.g. tier-1 style note)
  //#when extractFingerprint is called
  //#then it returns null because there is no fingerprint to track
  it("returns null for feedback without a [Checker/rule] prefix", () => {
    expect(extractFingerprint("Avoid clichés")).toBeNull();
    expect(extractFingerprint("⚠ LLM Harness skipped (API unavailable).")).toBeNull();
    expect(extractFingerprint("Hybrid Harness failed: timeout")).toBeNull();
  });

  //#given an empty or whitespace string
  //#when extractFingerprint is called
  //#then it returns null defensively
  it("returns null for empty input", () => {
    expect(extractFingerprint("")).toBeNull();
    expect(extractFingerprint("   ")).toBeNull();
  });
});

describe("OscillationGuard", () => {
  //#given a fresh guard
  //#when nothing has been recorded
  //#then no fingerprint counts as previously seen and recurrence counts are 0
  it("starts empty", () => {
    const g = new OscillationGuard();
    expect(g.wasSeenInPriorRound(1, "EpistemicChecker/psychic_knowledge")).toBe(false);
    expect(g.recurrenceCount("EpistemicChecker/psychic_knowledge")).toBe(0);
    expect(g.priorRounds("EpistemicChecker/psychic_knowledge")).toEqual([]);
  });

  //#given feedback recorded in round 1
  //#when wasSeenInPriorRound is asked about that fingerprint in round 2
  //#then it returns true
  it("flags a fingerprint as previously seen on a later round", () => {
    const g = new OscillationGuard();
    g.recordRound(1, [
      "[EpistemicChecker/psychic_knowledge] Zhi knows X...",
    ]);
    expect(
      g.wasSeenInPriorRound(2, "EpistemicChecker/psychic_knowledge")
    ).toBe(true);
  });

  //#given feedback recorded in round 1
  //#when wasSeenInPriorRound is asked about it in round 1 (the SAME round)
  //#then it returns false — only PRIOR rounds count, not the current one
  it("does not flag fingerprints from the current round as 'prior'", () => {
    const g = new OscillationGuard();
    g.recordRound(1, [
      "[EpistemicChecker/psychic_knowledge] Zhi knows X...",
    ]);
    expect(
      g.wasSeenInPriorRound(1, "EpistemicChecker/psychic_knowledge")
    ).toBe(false);
  });

  //#given the same fingerprint fires in rounds 1, 2, and 3
  //#when recurrenceCount is queried
  //#then it returns 2 (rounds beyond the first sighting)
  it("counts each subsequent re-introduction as a recurrence", () => {
    const g = new OscillationGuard();
    g.recordRound(1, ["[EpistemicChecker/psychic_knowledge] msg"]);
    g.recordRound(2, ["[EpistemicChecker/psychic_knowledge] msg"]);
    g.recordRound(3, ["[EpistemicChecker/psychic_knowledge] msg"]);
    expect(g.recurrenceCount("EpistemicChecker/psychic_knowledge")).toBe(2);
    expect(g.priorRounds("EpistemicChecker/psychic_knowledge")).toEqual([1, 2, 3]);
  });

  //#given a fingerprint fires multiple times within ONE round (multiple violations of same rule)
  //#when recurrenceCount is queried
  //#then it counts it as one round, not multiple
  it("does not double-count multiple violations of the same rule in one round", () => {
    const g = new OscillationGuard();
    g.recordRound(1, [
      "[EpistemicChecker/psychic_knowledge] first occurrence",
      "[EpistemicChecker/psychic_knowledge] second occurrence",
    ]);
    expect(g.priorRounds("EpistemicChecker/psychic_knowledge")).toEqual([1]);
    expect(g.recurrenceCount("EpistemicChecker/psychic_knowledge")).toBe(0);
  });

  //#given a fingerprint that fired in rounds 1 and 3 (skipping round 2)
  //#when shouldEscalateToStructural is asked
  //#then threshold=1 escalates (recurrenceCount=1) but threshold=2 does not.
  //  Recurrence is "rounds beyond the first": 2 distinct rounds → recurrence=1.
  it("escalates to structural after the configured recurrence threshold", () => {
    const g = new OscillationGuard();
    g.recordRound(1, ["[EpistemicChecker/psychic_knowledge] msg"]);
    g.recordRound(3, ["[EpistemicChecker/psychic_knowledge] msg"]);
    expect(g.recurrenceCount("EpistemicChecker/psychic_knowledge")).toBe(1);
    expect(
      g.shouldEscalateToStructural("EpistemicChecker/psychic_knowledge", 1)
    ).toBe(true);
    expect(
      g.shouldEscalateToStructural("EpistemicChecker/psychic_knowledge", 2)
    ).toBe(false);
  });

  //#given non-fingerprintable feedback (no [Checker/rule] prefix)
  //#when recordRound processes the round
  //#then those entries are silently ignored — they cannot oscillate
  it("ignores non-fingerprintable feedback entries during recording", () => {
    const g = new OscillationGuard();
    g.recordRound(1, [
      "Avoid clichés",
      "⚠ LLM Harness skipped (API unavailable).",
      "[EpistemicChecker/psychic_knowledge] msg",
    ]);
    // Only the structured one is tracked.
    expect(g.priorRounds("EpistemicChecker/psychic_knowledge")).toEqual([1]);
  });

  //#given several fingerprints recorded across rounds
  //#when allRecurrent is asked with various thresholds
  //#then only fingerprints meeting the threshold are returned, sorted alphabetically.
  //  A/x fires in rounds 1,2,3 → recurrence=2.
  //  B/y fires in round 1 only → recurrence=0 (never recurrent).
  //  C/z fires in round 2 only → recurrence=0 (never recurrent).
  it("reports all fingerprints whose recurrence meets the threshold", () => {
    const g = new OscillationGuard();
    g.recordRound(1, [
      "[A/x] msg",
      "[B/y] msg",
    ]);
    g.recordRound(2, [
      "[A/x] msg",
      "[C/z] msg",
    ]);
    g.recordRound(3, [
      "[A/x] msg",
    ]);
    expect(g.allRecurrent(1)).toEqual(["A/x"]);
    expect(g.allRecurrent(2)).toEqual(["A/x"]);
    expect(g.allRecurrent(3)).toEqual([]);
  });
});
