import { describe, it, expect, mock } from "bun:test";
import { evaluateCharacterCraft } from "./character-critic";

//#given a mocked LLM that returns valid JSON for character craft evaluation
mock.module("../llm", () => ({
  MODELS: {
    CRITIC: "gemini-2.5-pro",
  },
  generateContent: mock(async (_model: string, prompt: string) => {
    // Detect scenario from the prompt content to return appropriate mock
    if (prompt.includes("mask shattered")) {
      return JSON.stringify({
        label: "good",
        score: 0.94,
        reasoning:
          "Strong mask-to-true-character gap revealed under pressure. The stoic warrior facade cracks to reveal vulnerability beneath. Dimensional contradiction present (fearless/terrified). Emotion earned through established stakes.",
        flaws: [],
      });
    }
    if (prompt.includes("was brave") && prompt.includes("was strong") && prompt.includes("perfect hero")) {
      return JSON.stringify({
        label: "bad",
        score: 0.15,
        reasoning:
          "Cement-block character: purely described through adjective lists with no gap between mask and true self. No pressure reveals inner nature. Single-dimensional with no contradiction. Surface characterization only.",
        flaws: ["cement_block_character", "missing_mask", "single_dimension", "stereotypical_traits"],
      });
    }
    if (prompt.includes("I am angry") && prompt.includes("I feel betrayed")) {
      return JSON.stringify({
        label: "bad",
        score: 0.18,
        reasoning:
          "On-the-nose dialogue: every character directly states their emotional state with zero subtext. No gap between what is said and what is meant. Violates life-in-the-subtext principle.",
        flaws: ["on_the_nose_dialogue", "no_subtext"],
      });
    }
    if (prompt.includes("tears streamed") && prompt.includes("wilted flower")) {
      return JSON.stringify({
        label: "bad",
        score: 0.20,
        reasoning:
          "Sentimentality: overwhelming emotional response to a trivial trigger (wilted flower). The grief is unearned—no proportionate stakes established. Disproportionate emotion undermines credibility.",
        flaws: ["unearned_emotion", "disproportionate_emotion"],
      });
    }
    if (prompt.includes("markdown")) {
      var inner = JSON.stringify({
        label: "good",
        score: 0.85,
        reasoning: "Solid character craft.",
        flaws: [],
      });
      return "``" + "`json\n" + inner + "\n``" + "`";
    }
    // Default fallback
    return JSON.stringify({
      label: "good",
      score: 0.8,
      reasoning: "No major character craft issues detected.",
      flaws: [],
    });
  }),
}));

describe("Character Critic (Tier 2 Character Craft)", () => {
  //#when evaluating a well-crafted passage with mask revelation under pressure
  it("should label a well-crafted character passage as good with empty flaws", async () => {
    //#then the result should have label 'good', high score, and empty flaws
    const text =
      "[CHARACTER_NAME_KAEL] had always presented himself as the stoic warrior. But when the blade struck, " +
      "the mask shattered. Beneath the surface was not the fearless captain, but a man " +
      "terrified of loss. His true self emerged in the crisis.";
    const result = await evaluateCharacterCraft(text);

    expect(result.label).toBe("good");
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.flaws).toEqual([]);
  });

  //#when evaluating a cement-block character with no depth
  it("should label a cement-block character passage as bad with specific flaws", async () => {
    //#then the result should have label 'bad' and include cement_block_character flaw
    const text =
      "[CHARACTER_NAME_KAEL] was brave. He was strong. He was honorable. He was the perfect hero " +
      "in every way, inside and out.";
    const result = await evaluateCharacterCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("cement_block_character");
    expect(result.flaws.length).toBeGreaterThan(0);
  });

  //#when evaluating on-the-nose dialogue
  it("should label on-the-nose dialogue as bad with subtext flaws", async () => {
    //#then the result should flag on_the_nose_dialogue
    const text =
      "'I am angry at you,' said [CHARACTER_NAME_KAEL]. 'I feel betrayed,' said [CHARACTER_NAME_MIRA]. " +
      "'I am sad because you lied,' [CHARACTER_NAME_KAEL] replied.";
    const result = await evaluateCharacterCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("on_the_nose_dialogue");
  });

  //#when evaluating unearned sentimentality
  it("should label unearned emotion as bad with emotion flaws", async () => {
    //#then the result should flag unearned_emotion
    const text =
      "She found a slightly wilted flower and tears streamed down her face. " +
      "Her heart shattered. She sobbed uncontrollably at this minor occurrence.";
    const result = await evaluateCharacterCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("unearned_emotion");
  });

  //#when the LLM wraps JSON in markdown code blocks
  it("should handle markdown-wrapped JSON responses gracefully", async () => {
    //#then the result should parse successfully despite markdown wrapping
    const text = "A passage that tests markdown cleaning capability.";
    const result = await evaluateCharacterCraft(text);

    expect(result.label).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.flaws)).toBe(true);
  });
});
