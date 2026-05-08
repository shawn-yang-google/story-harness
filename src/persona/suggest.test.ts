import { describe, it, expect, mock, beforeEach } from "bun:test";
import { suggestPersonaDefaults, type PersonaSuggestion } from "./suggest";

let mockCallCount = 0;
mock.module("../llm", () => ({
  MODELS: {
    EVALUATOR: "gemini-3.1-flash-lite-preview",
  },
  generateContent: mock(async (_model: string, _prompt: string) => {
    mockCallCount++;
    return JSON.stringify({
      genre: "historical",
      tone: "melancholic",
      style: "ornate",
      audienceAge: "adult",
      emphasis: ["character-depth", "emotional-arc"],
      referenceLevel: 4,
      reasons: {
        genre: "Family history stories are rooted in real events across generations, making historical the natural genre.",
        tone: "Reflecting on family past often carries a bittersweet, nostalgic quality.",
        style: "Rich, detailed prose suits the layered nature of generational storytelling.",
        audienceAge: "Family history themes resonate most with adult readers.",
        emphasis: "Family stories need deep characters and emotional arcs to honor real people's lives.",
        referenceLevel: "Biographical work demands deep fact-checking and implicit-claim extraction.",
      },
    });
  }),
}));

describe("suggestPersonaDefaults", () => {
  beforeEach(() => {
    mockCallCount = 0;
  });

  //#when given a persona name
  it("should return genre, tone, style, audience suggestions with reasons", async () => {
    const result = await suggestPersonaDefaults("family history writer");

    //#then it returns structured suggestions
    expect(result.genre).toBe("historical");
    expect(result.tone).toBe("melancholic");
    expect(result.style).toBe("ornate");
    expect(result.audienceAge).toBe("adult");
    expect(result.reasons.genre.length).toBeGreaterThan(0);
    expect(result.reasons.tone.length).toBeGreaterThan(0);
    expect(result.reasons.style.length).toBeGreaterThan(0);
    expect(result.reasons.audienceAge.length).toBeGreaterThan(0);
  });

  //#when given a persona name
  it("should call the LLM exactly once", async () => {
    await suggestPersonaDefaults("noir detective");
    expect(mockCallCount).toBe(1);
  });

  //#when suggestions include emphasis
  it("should include optional emphasis suggestions", async () => {
    const result = await suggestPersonaDefaults("family history writer");
    expect(result.emphasis).toBeDefined();
    expect(result.emphasis!.length).toBeGreaterThan(0);
  });

  //#when the LLM returns a valid referenceLevel
  //#then the suggestion surfaces it together with its reason
  it("should include the LLM-suggested referenceLevel and reason", async () => {
    const result = await suggestPersonaDefaults("family history writer");
    expect(result.referenceLevel).toBe(4);
    expect(result.reasons.referenceLevel).toBeDefined();
    expect(result.reasons.referenceLevel!.length).toBeGreaterThan(0);
  });
});
