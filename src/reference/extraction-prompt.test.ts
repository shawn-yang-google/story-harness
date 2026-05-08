import { describe, it, expect } from "bun:test";
import { buildReferenceExtractionPrompt } from "./extraction-prompt";
import type { HarnessContext } from "../types";

function ctxWithLevel(level: 1 | 2 | 3 | 4 | 5): HarnessContext {
  return {
    loreDb: {},
    previousBeats: [],
    targetAudience: "general",
    personaConfig: {
      enabledCheckers: {} as any,
      checkerOptions: {} as any,
      referenceLevel: level,
    } as any,
  };
}

describe("buildReferenceExtractionPrompt — per-level behavior", () => {
  // --- Level 1 (Scan) ---

  //#given level 1
  //#when building the prompt
  //#then the SCAN preamble appears and L4/L5 schema additions do NOT
  it("level 1 includes SCAN preamble and excludes enrichment/research schema", () => {
    const prompt = buildReferenceExtractionPrompt("Some draft.", ctxWithLevel(1));
    expect(prompt).toContain("SCAN (Level 1)");
    expect(prompt).not.toContain("enrichmentSuggestions");
    expect(prompt).not.toContain("researchQuestions");
  });

  //#given level 1 (skipCategories = ["linguistic", "cultural"])
  //#when building the prompt
  //#then the cultural and linguistic JSON schema sections are omitted
  it("level 1 actually omits skipped categories from the JSON schema", () => {
    const prompt = buildReferenceExtractionPrompt("Some draft.", ctxWithLevel(1));
    // The skipped category section keys must NOT appear inside the schema example.
    // We assert the schema-level keys (with the leading two-space indent + quote)
    // are absent so we don't false-positive on the prose.
    expect(prompt).not.toMatch(/^\s*"linguistic":\s*\[/m);
    expect(prompt).not.toMatch(/^\s*"cultural":\s*\[/m);
    // Other categories should still be there.
    expect(prompt).toMatch(/^\s*"historical":\s*\[/m);
    expect(prompt).toMatch(/^\s*"scientific":\s*\[/m);
    expect(prompt).toMatch(/^\s*"geographic":\s*\[/m);
  });

  // --- Level 2 (Validate) ---

  //#given level 2
  //#when building the prompt
  //#then the VALIDATE preamble appears and all categories are present
  it("level 2 includes VALIDATE preamble and all category schema sections", () => {
    const prompt = buildReferenceExtractionPrompt("Some draft.", ctxWithLevel(2));
    expect(prompt).toContain("VALIDATE (Level 2)");
    expect(prompt).toMatch(/^\s*"historical":\s*\[/m);
    expect(prompt).toMatch(/^\s*"cultural":\s*\[/m);
    expect(prompt).toMatch(/^\s*"linguistic":\s*\[/m);
    expect(prompt).not.toContain("enrichmentSuggestions");
    expect(prompt).not.toContain("researchQuestions");
  });

  // --- Level 3 (Scrutinize) — default ---

  //#given level 3
  //#when building the prompt
  //#then the SCRUTINIZE preamble appears
  it("level 3 includes SCRUTINIZE preamble", () => {
    const prompt = buildReferenceExtractionPrompt("Some draft.", ctxWithLevel(3));
    expect(prompt).toContain("SCRUTINIZE (Level 3)");
    expect(prompt).not.toContain("enrichmentSuggestions");
    expect(prompt).not.toContain("researchQuestions");
  });

  //#given an empty personaConfig (no referenceLevel specified)
  //#when building the prompt
  //#then it defaults to level 3 (SCRUTINIZE)
  it("defaults to level 3 when no referenceLevel is set", () => {
    const prompt = buildReferenceExtractionPrompt("Some draft.", {
      loreDb: {},
      previousBeats: [],
      targetAudience: "general",
    });
    expect(prompt).toContain("SCRUTINIZE (Level 3)");
  });

  // --- Level 4 (Investigate) ---

  //#given level 4
  //#when building the prompt
  //#then the INVESTIGATE preamble + enrichmentSuggestions schema appear; researchQuestions does NOT
  it("level 4 includes INVESTIGATE preamble and enrichmentSuggestions schema", () => {
    const prompt = buildReferenceExtractionPrompt("Some draft.", ctxWithLevel(4));
    expect(prompt).toContain("INVESTIGATE (Level 4)");
    expect(prompt).toContain("enrichmentSuggestions");
    expect(prompt).not.toContain("researchQuestions");
  });

  // --- Level 5 (Research) ---

  //#given level 5
  //#when building the prompt
  //#then RESEARCH preamble + both enrichmentSuggestions and researchQuestions schemas appear
  it("level 5 includes RESEARCH preamble plus both extra schemas", () => {
    const prompt = buildReferenceExtractionPrompt("Some draft.", ctxWithLevel(5));
    expect(prompt).toContain("RESEARCH (Level 5");
    expect(prompt).toContain("enrichmentSuggestions");
    expect(prompt).toContain("researchQuestions");
  });
});
