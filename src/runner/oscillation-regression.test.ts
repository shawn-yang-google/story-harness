/**
 * Regression: family-history oscillation case.
 *
 * Replays the captured round-by-round feedback from
 * `logs/generate-2026-05-08T22-57-33-123Z` (the historic 5-round
 * failed-converge session that motivated R8-A and R8-B) through the pure
 * post-feedback analysis layer (OscillationGuard + classifyFeedback +
 * requiresPremiseStaging). Asserts that every recurrent fingerprint and
 * structural critique observed in the real session is correctly
 * surfaced — so a future change to the analysis contract that would have
 * silently re-broken R8 lights up here instead of in production.
 *
 * See tests/fixtures/regression/family-history-oscillation/README.md for
 * the fixture history.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { OscillationGuard } from "./oscillation-guard";
import { classifyFeedback } from "./rule-classification";
import { requiresPremiseStaging } from "./premise-staging";

const FIXTURE_DIR = join(
  __dirname,
  "..",
  "..",
  "tests",
  "fixtures",
  "regression",
  "family-history-oscillation"
);

interface RoundsFixture {
  session: string;
  rounds: { round: number; feedback: string[] }[];
}

function loadFixture(): RoundsFixture {
  return JSON.parse(
    readFileSync(join(FIXTURE_DIR, "rounds.json"), "utf-8")
  ) as RoundsFixture;
}

describe("Regression: family-history oscillation", () => {
  //#given the captured 5-round feedback from the historic failed session
  //#when each round is recorded into a fresh OscillationGuard
  //#then the known-recurring fingerprints surface with the right rounds
  it("OscillationGuard surfaces the historic recurring fingerprints", () => {
    const guard = new OscillationGuard();
    const fixture = loadFixture();
    for (const r of fixture.rounds) {
      guard.recordRound(r.round, r.feedback);
    }

    // Anchored from the actual feedback dump (see fixture comment):
    //   psychic_knowledge fired in rounds 1 and 5 → 2 distinct rounds → recurrence=1.
    expect(
      guard.priorRounds("EpistemicChecker/psychic_knowledge")
    ).toEqual([1, 5]);
    expect(
      guard.recurrenceCount("EpistemicChecker/psychic_knowledge")
    ).toBe(1);

    //   unsupported_conclusion fired in rounds 2, 3, 4, 5 → recurrence=3.
    expect(
      guard.priorRounds("PropositionalChecker/unsupported_conclusion")
    ).toEqual([2, 3, 4, 5]);
    expect(
      guard.recurrenceCount("PropositionalChecker/unsupported_conclusion")
    ).toBe(3);

    //   non_sequitur fired in rounds 2, 3, 5 → recurrence=2.
    expect(guard.priorRounds("SoundnessChecker/non_sequitur")).toEqual([2, 3, 5]);
    expect(guard.recurrenceCount("SoundnessChecker/non_sequitur")).toBe(2);

    //   no_subtext fired in rounds 1, 2 → recurrence=1.
    expect(guard.priorRounds("DialogueChecker/no_subtext")).toEqual([1, 2]);
    expect(guard.recurrenceCount("DialogueChecker/no_subtext")).toBe(1);

    //   monologue_too_long fired in rounds 3, 5 → recurrence=1.
    expect(
      guard.priorRounds("DialogueChecker/monologue_too_long")
    ).toEqual([3, 5]);
    expect(
      guard.recurrenceCount("DialogueChecker/monologue_too_long")
    ).toBe(1);

    // The full set of recurrent fingerprints (recurrence >= 1) must include
    // the four above. Other one-off rules (broken_conditional,
    // unsourced_critical, cement_block_character) fired only in one round
    // each in this session and are NOT recurrent.
    const recurrent = guard.allRecurrent(1);
    expect(recurrent).toContain("EpistemicChecker/psychic_knowledge");
    expect(recurrent).toContain("PropositionalChecker/unsupported_conclusion");
    expect(recurrent).toContain("SoundnessChecker/non_sequitur");
    expect(recurrent).toContain("DialogueChecker/no_subtext");
    expect(recurrent).toContain("DialogueChecker/monologue_too_long");
    expect(recurrent).not.toContain("PropositionalChecker/broken_conditional");
    expect(recurrent).not.toContain("CharacterChecker/cement_block_character");
  });

  //#given the captured feedback
  //#when classifyFeedback is run over every entry
  //#then every Tier-3 reader-experience verdict (Page-Turner / Cringe /
  //#  Who Cares? / Opening Hook / Voice Distinctiveness) and every
  //#  structural Tier-2 rule (cement_block_character, indistinct_voices,
  //#  no_subtext) is classified as structural — i.e. R8-B's escalation
  //#  rule will route them away from the surgical patch loop.
  it("classifyFeedback marks the historic structural critiques as structural", () => {
    const fixture = loadFixture();
    const allFeedback = fixture.rounds.flatMap((r) => r.feedback);

    const structuralCases = [
      // Tier-3 reader-experience.
      "Opening Hook:",
      "Who Cares? Test:",
      "Page-Turner Momentum:",
      "Cringe Factor:",
      "Voice Distinctiveness:",
      // Tier-2 structural.
      "[CharacterChecker/cement_block_character]",
      "[DialogueChecker/indistinct_voices]",
      "[DialogueChecker/no_subtext]",
    ];
    for (const needle of structuralCases) {
      const matches = allFeedback.filter((f) => f.includes(needle));
      expect(matches.length).toBeGreaterThan(0);
      for (const m of matches) {
        expect(classifyFeedback(m)).toBe("structural");
      }
    }

    // And the surgical fingerprints we know fired here stay surgical so
    // the patch loop still handles them (modulo R8-A escalation, which is
    // tested separately).
    const surgicalCases = [
      "[EpistemicChecker/psychic_knowledge]",
      "[DialogueChecker/monologue_too_long]",
      "[SourceChecker/unsourced_critical]",
      "[PropositionalChecker/broken_conditional]",
    ];
    for (const needle of surgicalCases) {
      const matches = allFeedback.filter((f) => f.includes(needle));
      expect(matches.length).toBeGreaterThan(0);
      for (const m of matches) {
        expect(classifyFeedback(m)).toBe("surgical");
      }
    }
  });

  //#given the captured feedback
  //#when requiresPremiseStaging is consulted for each entry
  //#then exactly the unsupported_conclusion / non_sequitur entries opt
  //#  in — confirming R8-C's gate would have fired on this session.
  it("requiresPremiseStaging fires on the unsupported_conclusion / non_sequitur entries", () => {
    const fixture = loadFixture();
    const allFeedback = fixture.rounds.flatMap((r) => r.feedback);

    const premiseEntries = allFeedback.filter(requiresPremiseStaging);
    // Anchored: 4 unsupported_conclusion + 3 non_sequitur = 7 entries
    // across the 5 rounds. The exact count guards against any future
    // expansion of PREMISE_STAGING_RULES that would silently change the
    // historic baseline.
    expect(premiseEntries.length).toBe(7);

    // Every premise entry MUST have one of the two qualifying prefixes.
    for (const e of premiseEntries) {
      const isUnsupportedConclusion = e.startsWith(
        "[PropositionalChecker/unsupported_conclusion]"
      );
      const isNonSequitur = e.startsWith("[SoundnessChecker/non_sequitur]");
      expect(isUnsupportedConclusion || isNonSequitur).toBe(true);
    }
  });
});
