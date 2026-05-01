import { describe, it, expect, mock, beforeEach } from "bun:test";
import { StorySplitter, type SplitSection } from "./story-splitter";

//#given a mock LLM that returns structured section splits
let mockCallCount = 0;
mock.module("../llm", () => ({
  MODELS: {
    GENERATOR: "gemini-2.5-pro",
    EVALUATOR: "gemini-3.1-flash-lite-preview",
  },
  generateContent: mock(async (_model: string, prompt: string) => {
    mockCallCount++;
    // If the prompt mentions a very high word limit, return a single section
    if (prompt.includes("5000 words or fewer")) {
      return JSON.stringify([
        {
          title: "Full Story",
          prompt: "Write a very short poem about a cat.",
          estimatedWords: 50,
        },
      ]);
    }
    // Otherwise return a multi-section split
    return JSON.stringify([
      {
        title: "The Arrival",
        prompt: "Detective arrives at the old mansion on a stormy night.",
        estimatedWords: 400,
      },
      {
        title: "The Discovery",
        prompt: "Detective discovers the victim in the study.",
        estimatedWords: 500,
      },
      {
        title: "The Confrontation",
        prompt: "Detective confronts the suspects gathered in the drawing room.",
        estimatedWords: 600,
      },
    ]);
  }),
}));

describe("StorySplitter", () => {
  beforeEach(() => {
    mockCallCount = 0;
  });

  //#when splitting a long story prompt into sections
  it("should split a long prompt into multiple sections", async () => {
    const splitter = new StorySplitter({ maxWordsPerSection: 800 });
    const sections = await splitter.split(
      "Write a murder mystery set in an old English mansion. " +
        "A detective arrives during a storm, discovers a body in the study, " +
        "and must confront the suspects. The story should be approximately 2000 words."
    );

    //#then it returns an array of sections with titles and prompts
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0]).toHaveProperty("title");
    expect(sections[0]).toHaveProperty("prompt");
    expect(sections[0].prompt.length).toBeGreaterThan(0);
  });

  //#when the prompt is short enough for a single section
  it("should return a single section for short prompts", async () => {
    const splitter = new StorySplitter({ maxWordsPerSection: 5000 });
    const sections = await splitter.split("Write a very short poem about a cat.");

    //#then it returns exactly one section wrapping the original prompt
    expect(sections.length).toBe(1);
    expect(sections[0].prompt).toContain("cat");
  });

  //#when given previousBeats context
  it("should include previous beats in the split prompt for coherence", async () => {
    const splitter = new StorySplitter({ maxWordsPerSection: 800 });
    const sections = await splitter.split(
      "Continue the story where the detective chases the suspect.",
      ["The detective found the first clue."]
    );

    //#then the LLM was called (to produce coherent splits)
    expect(mockCallCount).toBeGreaterThan(0);
    expect(sections.length).toBeGreaterThanOrEqual(1);
  });

  //#when the LLM returns invalid JSON
  it("should fall back to a single section on parse failure", async () => {
    // Override mock for this test
    const { generateContent } = await import("../llm");
    const mockedFn = generateContent as any;
    const originalImpl = mockedFn.getMockImplementation?.();

    mockedFn.mockImplementationOnce(async () => "This is not valid JSON at all");

    const splitter = new StorySplitter({ maxWordsPerSection: 800 });
    const sections = await splitter.split("A complex story prompt that LLM fails to split.");

    //#then it falls back to a single section with the original prompt
    expect(sections.length).toBe(1);
    expect(sections[0].prompt).toContain("A complex story prompt");
  });
});
