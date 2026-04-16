import { describe, it, expect, mock } from "bun:test";
import { evaluateLogicConsistency } from "./logic-critic";

//#given a mocked LLM that returns valid JSON for logic evaluation
mock.module("../llm", () => ({
  MODELS: {
    CRITIC: "gemini-2.5-pro",
  },
  generateContent: mock(async (_model: string, prompt: string) => {
    // Detect "good" vs "bad" from the prompt content to return appropriate mock
    if (prompt.includes("bridge collapsed")) {
      return JSON.stringify({
        label: "good",
        score: 0.92,
        reasoning: "Valid modus ponens: if bridge collapses then flood; bridge collapsed; therefore flood.",
        flaws: [],
      });
    }
    if (prompt.includes("amulet glows")) {
      return JSON.stringify({
        label: "bad",
        score: 0.2,
        reasoning: "Contradiction: the wizard establishes that glowing amulet means danger, then ignores the established conditional.",
        flaws: ["contradiction", "ignored_established_rule"],
      });
    }
    // Default fallback
    return JSON.stringify({
      label: "good",
      score: 0.8,
      reasoning: "No logical issues detected.",
      flaws: [],
    });
  }),
}));

describe("Logic Critic (Tier 2)", () => {
  //#when evaluating a logically consistent passage
  it("should label a logically consistent passage as good", async () => {
    //#then the result should have label 'good' and empty flaws
    const text =
      "If the bridge collapsed, then the village would flood. The bridge collapsed at dawn, and by noon the village was underwater.";
    const result = await evaluateLogicConsistency(text);

    expect(result.label).toBe("good");
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.flaws).toEqual([]);
  });

  //#when evaluating a passage with a logical contradiction
  it("should label a contradictory passage as bad with specific flaws", async () => {
    //#then the result should have label 'bad' and list contradiction flaws
    const text =
      "The wizard declared that if the amulet glows, then danger approaches. The amulet began glowing. But the wizard concluded there was no danger.";
    const result = await evaluateLogicConsistency(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("contradiction");
    expect(result.flaws.length).toBeGreaterThan(0);
  });

  //#when evaluating with a custom target audience
  it("should accept an optional targetAudience parameter", async () => {
    //#then it should not throw
    const text = "A simple story about a bridge collapsed and flood came.";
    const result = await evaluateLogicConsistency(text, "children");

    expect(result.label).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.flaws)).toBe(true);
  });

  //#when the result contains a reasoning field
  it("should include a reasoning string in the result", async () => {
    //#then reasoning should be a non-empty string
    const text =
      "If the bridge collapsed, then the village would flood. The bridge collapsed.";
    const result = await evaluateLogicConsistency(text);

    expect(typeof result.reasoning).toBe("string");
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});
