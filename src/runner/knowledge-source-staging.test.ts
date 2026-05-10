import { describe, it, expect } from "bun:test";
import {
  KNOWLEDGE_SOURCE_STAGING_RULES,
  requiresKnowledgeSourceStaging,
  validateKnowledgeSourcePatch,
  buildKnowledgeSourceStagingInstruction,
} from "./knowledge-source-staging";

/**
 * R10-A: epistemic source-staging gate.
 *
 * Mirrors `premise-staging.test.ts` but for the EpistemicChecker rule
 * `psychic_knowledge`, which kept recurring (recurrence=4) in BOTH Q1
 * sessions of R9 despite R8-A's oscillation warning.
 *
 * The rule fires when an agent in the prose acts on information whose
 * source is not staged in the narrative. The fix has the same shape as
 * R8-C's premise-staging fix: the patch must (a) STAGE the source of
 * the knowledge somewhere before the agent acts on it (overheard
 * conversation, discovered document, witness, deduction from prior
 * scene) and (b) modify the knowledge-claim sentence so it is now
 * grounded. Single-line rewrites of the knowledge sentence alone are
 * exactly the failure mode this gate exists to catch.
 */

describe("requiresKnowledgeSourceStaging", () => {
  //#given a feedback string for the psychic_knowledge rule
  //#when requiresKnowledgeSourceStaging is asked
  //#then it returns true
  it("identifies the psychic_knowledge rule from R10-A", () => {
    expect(
      requiresKnowledgeSourceStaging(
        '[EpistemicChecker/psychic_knowledge] "Ying" knows "Zhi is missing" but the source is unexplained.'
      )
    ).toBe(true);
  });

  //#given a feedback string for an unrelated rule (especially the R8-C
  //#  rules — the two gates must not overlap)
  //#when requiresKnowledgeSourceStaging is asked
  //#then it returns false
  it("returns false for the R8-C premise rules", () => {
    expect(
      requiresKnowledgeSourceStaging(
        "[PropositionalChecker/unsupported_conclusion] paragraph 8: 'Zhi is innocent'..."
      )
    ).toBe(false);
    expect(
      requiresKnowledgeSourceStaging(
        "[SoundnessChecker/non_sequitur] paragraph 13 conclusion does not follow..."
      )
    ).toBe(false);
  });

  //#given an empty or unrelated feedback string
  //#when requiresKnowledgeSourceStaging is asked
  //#then it returns false
  it("returns false for unrelated rules and empty input", () => {
    expect(
      requiresKnowledgeSourceStaging("[DialogueChecker/no_subtext] 5/5 ...")
    ).toBe(false);
    expect(requiresKnowledgeSourceStaging("Avoid clichés.")).toBe(false);
    expect(requiresKnowledgeSourceStaging("")).toBe(false);
  });

  //#given the exported registry
  //#then it contains exactly the R10-A rules (currently just psychic_knowledge)
  it("KNOWLEDGE_SOURCE_STAGING_RULES enumerates the R10-A scope", () => {
    expect(KNOWLEDGE_SOURCE_STAGING_RULES).toContain(
      "EpistemicChecker/psychic_knowledge"
    );
  });
});

describe("validateKnowledgeSourcePatch", () => {
  //#given a multi-diff patch (one staging the source, one modifying
  //#  the knowledge-claim sentence)
  //#when validateKnowledgeSourcePatch runs
  //#then accepted = true
  it("accepts a multi-diff patch", () => {
    const result = validateKnowledgeSourcePatch([
      // diff 1: stage the source — Ying overhears the call.
      {
        original: "Ying picked up the receiver.",
        revised:
          'Ying picked up the receiver. The voice on the other end said only "they took him from the office at noon" before the line went dead.',
      },
      // diff 2: modify the knowledge claim now that it has a source.
      {
        original: "Ying knew Zhi was missing.",
        revised: "Ying set down the receiver. Zhi was missing.",
      },
    ]);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  //#given a single-diff patch that significantly extends the original
  //#  (the source-staging text + the modified knowledge sentence are
  //#  packaged into one ORIGINAL/REVISED block)
  //#when validateKnowledgeSourcePatch runs
  //#then accepted = true
  it("accepts a single-diff patch that meaningfully extends the original", () => {
    const result = validateKnowledgeSourcePatch([
      {
        original: "Ying knew Zhi was missing.",
        revised:
          "The phone call had cut off mid-sentence — a stranger's voice saying they had taken him from the office. Ying held the dead receiver. Zhi was missing.",
      },
    ]);
    expect(result.accepted).toBe(true);
  });

  //#given a single-diff patch that just rewrites the knowledge sentence
  //#  in place — no source staging at all (the failure mode R10-A exists
  //#  to catch — what the patch LLM did 4× in the R9 persona run)
  //#when validateKnowledgeSourcePatch runs
  //#then accepted = false with a reason mentioning the missing source
  it("rejects a single-line knowledge-rewrite with no source", () => {
    const result = validateKnowledgeSourcePatch([
      {
        original: "Ying knew Zhi was missing.",
        revised: "Ying suspected Zhi was missing.",
      },
    ]);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/source|knowledge/i);
  });

  //#given an empty diff list (LLM returned NO_CHANGE / malformed response)
  //#when validateKnowledgeSourcePatch runs
  //#then accepted = false with a clear reason
  it("rejects an empty patch", () => {
    const result = validateKnowledgeSourcePatch([]);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/no.*diff/i);
  });

  //#given a deletion-only single-diff patch (model removed the
  //#  knowledge claim instead of grounding it — avoidance, not a fix)
  //#when validateKnowledgeSourcePatch runs
  //#then accepted = false
  it("rejects a deletion-only single-diff patch", () => {
    const result = validateKnowledgeSourcePatch([
      {
        original: "Ying knew, somehow, that Zhi was missing.",
        revised: "Ying knew Zhi was missing.",
      },
    ]);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/source|insertion|knowledge/i);
  });
});

describe("buildKnowledgeSourceStagingInstruction", () => {
  //#given a feedback string for psychic_knowledge
  //#when buildKnowledgeSourceStagingInstruction is called
  //#then the returned instruction explicitly requires staging the
  //  knowledge source (overheard conversation, document, witness,
  //  deduction) BEFORE the agent acts on it. Wording must mirror the
  //  R10-A spec in TODO.md so the LLM gets the same constraint we've
  //  been documenting.
  it("returns a non-empty instruction block tailored to psychic_knowledge", () => {
    const text = buildKnowledgeSourceStagingInstruction(
      '[EpistemicChecker/psychic_knowledge] "Ying" knows "Zhi is missing"...'
    );
    expect(text.length).toBeGreaterThan(0);
    const lower = text.toLowerCase();
    expect(lower).toContain("source");
    // Must mention at least one example mechanism so the LLM has
    // concrete options to choose from.
    expect(lower).toMatch(/overheard|document|witness|deduc/);
    // Must require the two-edit shape (insertion + modification).
    expect(lower).toMatch(/insertion|stage/);
    expect(lower).toMatch(/modification|grounded/);
  });

  //#given feedback for the R8-C rules (premise-staging) or any unrelated
  //#  rule
  //#when buildKnowledgeSourceStagingInstruction is called
  //#then it returns an empty string (caller can use empty-string as a
  //  no-op signal when concatenating into the prompt)
  it("returns an empty string for the R8-C premise rules", () => {
    expect(
      buildKnowledgeSourceStagingInstruction(
        "[PropositionalChecker/unsupported_conclusion] paragraph 8..."
      )
    ).toBe("");
    expect(
      buildKnowledgeSourceStagingInstruction(
        "[SoundnessChecker/non_sequitur] paragraph 13..."
      )
    ).toBe("");
  });

  //#given feedback for any other unrelated rule
  //#when buildKnowledgeSourceStagingInstruction is called
  //#then it returns an empty string
  it("returns an empty string for other unrelated rules", () => {
    expect(
      buildKnowledgeSourceStagingInstruction(
        "[DialogueChecker/no_subtext] 5/5 speeches have no hidden meaning."
      )
    ).toBe("");
    expect(buildKnowledgeSourceStagingInstruction("Avoid clichés.")).toBe("");
  });
});
