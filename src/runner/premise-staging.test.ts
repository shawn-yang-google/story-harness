import { describe, it, expect } from "bun:test";
import {
  PREMISE_STAGING_RULES,
  requiresPremiseStaging,
  validatePremisePatch,
  buildPremiseStagingInstruction,
} from "./premise-staging";

describe("requiresPremiseStaging", () => {
  //#given a feedback string for one of the two premise-needing rules
  //#when requiresPremiseStaging is asked
  //#then it returns true
  it("identifies the two premise-needing rules from R8-C", () => {
    expect(
      requiresPremiseStaging(
        "[PropositionalChecker/unsupported_conclusion] paragraph 8: 'Zhi is innocent'..."
      )
    ).toBe(true);
    expect(
      requiresPremiseStaging(
        "[SoundnessChecker/non_sequitur] paragraph 13 conclusion does not follow..."
      )
    ).toBe(true);
  });

  //#given a feedback string for an unrelated rule
  //#when requiresPremiseStaging is asked
  //#then it returns false
  it("returns false for unrelated rules", () => {
    expect(
      requiresPremiseStaging(
        "[EpistemicChecker/psychic_knowledge] Zhi knows X..."
      )
    ).toBe(false);
    expect(
      requiresPremiseStaging("Avoid clichés.")
    ).toBe(false);
    expect(requiresPremiseStaging("")).toBe(false);
  });

  //#given the exported registry
  //#then it contains exactly the two R8-C rules
  it("PREMISE_STAGING_RULES enumerates the R8-C scope", () => {
    expect(PREMISE_STAGING_RULES).toContain(
      "PropositionalChecker/unsupported_conclusion"
    );
    expect(PREMISE_STAGING_RULES).toContain(
      "SoundnessChecker/non_sequitur"
    );
  });
});

describe("validatePremisePatch", () => {
  //#given a patch with TWO diffs (one insertion-shaped, one modification)
  //#when validatePremisePatch runs
  //#then accepted = true
  it("accepts a multi-diff patch", () => {
    const result = validatePremisePatch([
      // diff 1: pure insertion (revised contains original + extra premise)
      { original: "She walked in.", revised: "She walked in. Her hand brushed the file marked with her name." },
      // diff 2: conclusion grounded
      { original: "She knew the trial was rigged.", revised: "Seeing the file, she knew the trial was rigged." },
    ]);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  //#given a single-diff patch where the revised text is meaningfully
  //#longer than the original (an insertion-shaped edit)
  //#when validatePremisePatch runs
  //#then accepted = true (the LLM packaged premise + grounded conclusion
  //  in one diff block)
  it("accepts a single-diff patch that significantly extends the original", () => {
    const result = validatePremisePatch([
      {
        original: "She knew the trial was rigged.",
        revised:
          "She picked up the file marked with her name and the verdict written in red. She knew the trial was rigged.",
      },
    ]);
    expect(result.accepted).toBe(true);
  });

  //#given a single-diff patch that just rewrites the conclusion sentence
  //#in place (no significant length increase)
  //#when validatePremisePatch runs
  //#then accepted = false with a reason mentioning the missing premise
  it("rejects a single-line conclusion-only edit", () => {
    const result = validatePremisePatch([
      {
        original: "She knew the trial was rigged.",
        revised: "She believed the trial was rigged.",
      },
    ]);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/premise/i);
  });

  //#given an empty diff list (the LLM returned NO_CHANGE or a malformed
  //#response that produced no patches)
  //#when validatePremisePatch runs
  //#then accepted = false with a clear reason
  it("rejects an empty patch", () => {
    const result = validatePremisePatch([]);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/no.*diff/i);
  });

  //#given a patch where revised is SHORTER than original (a deletion-only
  //#edit — the model removed the conclusion instead of grounding it)
  //#when validatePremisePatch runs
  //#then accepted = false; deletion is not a fix, it's avoidance
  it("rejects a deletion-only single-diff patch", () => {
    const result = validatePremisePatch([
      {
        original: "She knew, somehow, that the trial was rigged.",
        revised: "She knew the trial was rigged.",
      },
    ]);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/premise|insertion/i);
  });
});

describe("buildPremiseStagingInstruction", () => {
  //#given a feedback string for unsupported_conclusion
  //#when buildPremiseStagingInstruction is called
  //#then the returned instruction explicitly requires both insertion and
  //  modification, name-checks the rule, and uses verbatim wording from
  //  TODO.md so the LLM gets the same constraint we've been documenting.
  it("returns a non-empty instruction block tailored to the premise rules", () => {
    const text = buildPremiseStagingInstruction(
      "[PropositionalChecker/unsupported_conclusion] paragraph 8..."
    );
    expect(text.length).toBeGreaterThan(0);
    expect(text.toLowerCase()).toContain("premise");
    expect(text.toLowerCase()).toContain("conclusion");
    // Should mention the requirement for two-edit shape (insertion + modification).
    expect(text.toLowerCase()).toMatch(/insertion/);
    expect(text.toLowerCase()).toMatch(/modification|grounded/);
  });

  //#given feedback for an unrelated rule
  //#when buildPremiseStagingInstruction is called
  //#then it returns an empty string (the caller can use empty-string as a
  //  no-op signal when concatenating into the prompt)
  it("returns an empty string for non-premise rules", () => {
    expect(
      buildPremiseStagingInstruction(
        "[EpistemicChecker/psychic_knowledge] Zhi knows X..."
      )
    ).toBe("");
  });
});
