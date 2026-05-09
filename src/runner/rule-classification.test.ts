import { describe, it, expect } from "bun:test";
import {
  classifyFeedback,
  STRUCTURAL_FINGERPRINTS,
  STRUCTURAL_TIER3_PATTERNS,
} from "./rule-classification";

describe("classifyFeedback", () => {
  //#given a Tier-2 rule fingerprinted to a known structural rule
  //#when classifyFeedback is asked
  //#then it returns "structural"
  it("classifies known structural Tier-2 rules", () => {
    expect(
      classifyFeedback(
        "[CharacterChecker/cement_block_character] Zhi has a single mode..."
      )
    ).toBe("structural");
    expect(
      classifyFeedback(
        "[DialogueChecker/exposition_dump] paragraph 5 has 4 facts in 2 sentences..."
      )
    ).toBe("structural");
    expect(
      classifyFeedback(
        "[DialogueChecker/indistinct_voices] characters speak in the same register..."
      )
    ).toBe("structural");
  });

  //#given a Tier-2 rule that is line-fixable
  //#when classifyFeedback is asked
  //#then it returns "surgical"
  it("classifies known surgical Tier-2 rules", () => {
    expect(
      classifyFeedback(
        "[EpistemicChecker/psychic_knowledge] Zhi knows X without learning it..."
      )
    ).toBe("surgical");
    expect(
      classifyFeedback(
        "[SourceChecker/unsourced_critical] paragraph 12 makes a medical claim..."
      )
    ).toBe("surgical");
  });

  //#given an unknown Tier-2 rule fingerprint
  //#when classifyFeedback is asked
  //#then it defaults to "surgical" — surgical patches are the safe option
  //  and can never make the draft worse than a structural rewrite would.
  it("defaults unknown Tier-2 fingerprints to surgical", () => {
    expect(
      classifyFeedback(
        "[NewlyAddedChecker/some_brand_new_rule] something happened..."
      )
    ).toBe("surgical");
  });

  //#given a Tier-3 LLM-harness feedback string (no [Checker/rule] prefix)
  //#that mentions a known reader-experience dimension
  //#when classifyFeedback is asked
  //#then it returns "structural" — these are scene-level verdicts that
  //  can't be fixed by a sentence-level patch
  it("classifies Tier-3 reader-experience feedback as structural", () => {
    expect(
      classifyFeedback(
        "Page-Turner Momentum: The narrative jumps through years and major life events..."
      )
    ).toBe("structural");
    expect(
      classifyFeedback(
        "Who Cares? Test: I have no reason to care about the protagonist."
      )
    ).toBe("structural");
    expect(
      classifyFeedback(
        "Cringe Factor: The interrogation reads like a soap opera."
      )
    ).toBe("structural");
    expect(
      classifyFeedback(
        "Opening Hook: Generic, boring opening — I would not turn the page."
      )
    ).toBe("structural");
  });

  //#given Tier-3 feedback that is a generic / unrecognized line note
  //#when classifyFeedback is asked
  //#then it returns "surgical" by default (safer)
  it("defaults unknown Tier-3 feedback to surgical", () => {
    expect(classifyFeedback("Avoid clichés in paragraph 3.")).toBe("surgical");
    expect(classifyFeedback("Word 'very' overused.")).toBe("surgical");
  });

  //#given infrastructure / harness-failure noise
  //#when classifyFeedback is asked
  //#then it returns "surgical" — these aren't real story issues at all,
  //  but we never want to escalate them into a full rewrite.
  it("treats infrastructure noise as surgical so it never escalates", () => {
    expect(
      classifyFeedback("⚠ LLM Harness skipped (API unavailable). Will retry next round.")
    ).toBe("surgical");
    expect(classifyFeedback("Hybrid Harness failed: 503 UNAVAILABLE")).toBe("surgical");
  });

  //#given a Tier-3 feedback string that BOTH has a structural keyword AND
  //#contains an unrelated sentence
  //#when classifyFeedback is asked
  //#then a single positive structural keyword is enough to classify
  it("matches structural Tier-3 patterns case-insensitively and as substrings", () => {
    expect(
      classifyFeedback("page-turner momentum is missing entirely.")
    ).toBe("structural");
    expect(
      classifyFeedback("The dialogue suffers from CRINGE FACTOR throughout.")
    ).toBe("structural");
  });
});

describe("structural registries", () => {
  //#given the exported registries
  //#when inspected
  //#then they contain the rules called out in TODO.md R8-B
  it("STRUCTURAL_FINGERPRINTS includes the rules listed in R8-B", () => {
    // These are the explicit examples from TODO.md R8-B and the existing
    // hardcoded `structuralPatterns` in runner/index.ts.
    expect(STRUCTURAL_FINGERPRINTS).toContain(
      "CharacterChecker/cement_block_character"
    );
    expect(STRUCTURAL_FINGERPRINTS).toContain(
      "DialogueChecker/exposition_dump"
    );
    expect(STRUCTURAL_FINGERPRINTS).toContain(
      "DialogueChecker/indistinct_voices"
    );
    expect(STRUCTURAL_FINGERPRINTS).toContain(
      "CharacterChecker/unearned_emotion"
    );
  });

  it("STRUCTURAL_TIER3_PATTERNS includes the reader-experience dimensions from ReaderExperience.prompt.txt", () => {
    expect(STRUCTURAL_TIER3_PATTERNS).toContain("page-turner momentum");
    expect(STRUCTURAL_TIER3_PATTERNS).toContain("who cares?");
    expect(STRUCTURAL_TIER3_PATTERNS).toContain("cringe factor");
    expect(STRUCTURAL_TIER3_PATTERNS).toContain("opening hook");
    expect(STRUCTURAL_TIER3_PATTERNS).toContain("voice distinctiveness");
  });
});
