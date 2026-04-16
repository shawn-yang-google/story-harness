import { describe, it, expect, mock } from "bun:test";
import { evaluateNarrativeCraft } from "./story-critic";

//#given a mocked LLM that returns valid JSON for narrative craft evaluation
mock.module("../llm", () => ({
  MODELS: {
    CRITIC: "gemini-2.5-pro",
  },
  generateContent: mock(async (_model: string, prompt: string) => {
    // Detect scenario from the prompt content to return appropriate mock
    if (prompt.includes("rushed toward the crumbling bridge")) {
      return JSON.stringify({
        label: "good",
        score: 0.91,
        reasoning:
          "Scene turns on a clear value: safety→danger. Protagonist has clear conscious desire (save the child). Stakes escalate from property damage to life-or-death. Theme shown through action, not stated.",
        flaws: [],
      });
    }
    if (prompt.includes("The lesson of the story was")) {
      return JSON.stringify({
        label: "bad",
        score: 0.18,
        reasoning:
          "The narrator directly states the moral rather than dramatizing it through climax. This is didactic theme delivery, violating 'meaning through climax' and 'audience respect'.",
        flaws: ["didactic_theme", "condescending_exposition"],
      });
    }
    if (prompt.includes("sat in the café")) {
      return JSON.stringify({
        label: "bad",
        score: 0.25,
        reasoning:
          "The scene depicts pleasant activity with no value change—characters agree, nothing is at stake, no conflict surfaces. Violates 'scene turning values' and 'law of conflict'.",
        flaws: [
          "non_turning_scene",
          "no_value_change",
          "stakes_flat",
        ],
      });
    }
    if (prompt.includes("markdown")) {
      const inner = JSON.stringify({
        label: "good",
        score: 0.85,
        reasoning: "Solid narrative craft.",
        flaws: [],
      });
      return "``" + "`json\n" + inner + "\n``" + "`";
    }
    // Default fallback
    return JSON.stringify({
      label: "good",
      score: 0.8,
      reasoning: "No major narrative craft issues detected.",
      flaws: [],
    });
  }),
}));

describe("Story Critic (Tier 2 Narrative Craft)", () => {
  //#when evaluating a well-crafted passage with turning scenes and clear desire
  it("should label a well-crafted passage as good with empty flaws", async () => {
    //#then the result should have label 'good', high score, and empty flaws
    const text =
      "[CHARACTER_NAME_MAREN] rushed toward the crumbling bridge, her only thought the child trapped on the far side. The ropes snapped one by one. She leapt as the final plank gave way, catching the railing with bloodied fingers. Below, the river roared.";
    const result = await evaluateNarrativeCraft(text);

    expect(result.label).toBe("good");
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.flaws).toEqual([]);
  });

  //#when evaluating a passage with didactic theme delivery
  it("should label a didactic passage as bad with specific flaws", async () => {
    //#then the result should have label 'bad' and include didactic_theme flaw
    const text =
      "The lesson of the story was that kindness always wins. As the narrator, I want you to know that being good is the right choice. This showed that evil never prevails.";
    const result = await evaluateNarrativeCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("didactic_theme");
    expect(result.flaws.length).toBeGreaterThan(0);
  });

  //#when evaluating a non-turning scene with no conflict
  it("should label a flat, conflict-free scene as bad", async () => {
    //#then the result should flag non_turning_scene and stakes_flat
    const text =
      "They sat in the café and agreed on everything. The weather was nice. They ordered coffee and smiled. Nothing changed. They left content, exactly as they had arrived.";
    const result = await evaluateNarrativeCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("non_turning_scene");
  });

  //#when the LLM wraps JSON in markdown code blocks
  it("should handle markdown-wrapped JSON responses gracefully", async () => {
    //#then the result should parse successfully despite markdown wrapping
    const text = "A passage that tests markdown cleaning capability.";
    const result = await evaluateNarrativeCraft(text);

    expect(result.label).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.flaws)).toBe(true);
  });

  //#when evaluating with a custom target audience
  it("should accept an optional targetAudience parameter", async () => {
    //#then it should not throw and return a valid result
    const text =
      "[CHARACTER_NAME_MAREN] rushed toward the crumbling bridge, her only thought the child trapped on the far side.";
    const result = await evaluateNarrativeCraft(text, "young adult");

    expect(result.label).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(typeof result.reasoning).toBe("string");
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(Array.isArray(result.flaws)).toBe(true);
  });
});
