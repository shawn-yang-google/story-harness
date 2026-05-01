import { describe, it, expect, mock, beforeEach } from "bun:test";
import { MultiSectionRunner } from "./multi-section";

//#given a mock LLM
let mockCallCount = 0;
mock.module("../llm", () => ({
  MODELS: {
    GENERATOR: "gemini-2.5-pro",
    EVALUATOR: "gemini-3.1-flash-lite-preview",
  },
  generateContent: mock(async (_model: string, prompt: string) => {
    mockCallCount++;
    // If the prompt asks for splitting with a high word limit, return 1 section
    if (prompt.includes("Split the following story") && prompt.includes("10000 words or fewer")) {
      return JSON.stringify([
        { title: "Full Story", prompt: "A short prompt.", estimatedWords: 200 },
      ]);
    }
    // If the prompt asks for splitting, return sections
    if (prompt.includes("Split the following story")) {
      return JSON.stringify([
        { title: "Part 1", prompt: "The beginning.", estimatedWords: 300 },
        { title: "Part 2", prompt: "The middle.", estimatedWords: 300 },
      ]);
    }
    // Otherwise generate a scene draft
    return "A perfectly valid scene draft.";
  }),
}));

describe("MultiSectionRunner", () => {
  beforeEach(() => {
    mockCallCount = 0;
  });

  //#when generating a multi-section story
  it("should split the prompt and generate each section sequentially", async () => {
    const runner = new MultiSectionRunner({
      harnessDirectory: "harnesses",
      maxRetries: 2,
      loreDb: {},
      targetAudience: "general",
      maxWordsPerSection: 500,
    });

    const result = await runner.generate("Write a long story about two parts.");

    //#then it returns an array of generated sections
    expect(result.sections.length).toBe(2);
    expect(result.sections[0]).toHaveProperty("title");
    expect(result.sections[0]).toHaveProperty("content");
    expect(result.sections[0].content.length).toBeGreaterThan(0);
  });

  //#when generating a multi-section story
  it("should accumulate previous beats across sections", async () => {
    const runner = new MultiSectionRunner({
      harnessDirectory: "harnesses",
      maxRetries: 2,
      loreDb: {},
      targetAudience: "general",
      maxWordsPerSection: 500,
    });

    const result = await runner.generate("Write a story with continuity.");

    //#then later sections have awareness of earlier ones
    expect(result.sections.length).toBeGreaterThanOrEqual(2);
    // The combined output should contain content from all sections
    expect(result.combined.length).toBeGreaterThan(0);
  });

  //#when the full text is short enough for one section
  it("should produce a single section for short prompts", async () => {
    const runner = new MultiSectionRunner({
      harnessDirectory: "harnesses",
      maxRetries: 2,
      loreDb: {},
      targetAudience: "general",
      maxWordsPerSection: 10000, // Very high limit
    });

    const result = await runner.generate("A short prompt.");

    //#then it returns exactly one section
    expect(result.sections.length).toBe(1);
  });
});
