import { describe, it, expect, mock } from "bun:test";
import { evaluateNarrative } from "./critic";
import * as llm from "../llm";

// Mock the generateContent function
mock.module("../llm", () => ({
  MODELS: {
    CRITIC: "gemini-2.5-pro",
  },
  generateContent: mock(async () => {
    return JSON.stringify({
      label: "bad",
      score: 0.2,
      reasoning: "The pacing is too slow.",
      flaws: ["boring", "slow_start"]
    });
  }),
}));

describe("Tier 2 Critic", () => {
  it("should parse valid JSON from the LLM and return a CriticResult", async () => {
    const result = await evaluateNarrative("TensionHarness", "A very boring story...");
    
    expect(result.label).toBe("bad");
    expect(result.score).toBe(0.2);
    expect(result.reasoning).toBe("The pacing is too slow.");
    expect(result.flaws).toEqual(["boring", "slow_start"]);
  });
});
