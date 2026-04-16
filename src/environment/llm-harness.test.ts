import { expect, test, describe, mock, beforeEach } from "bun:test";
import { executeLlmHarness } from "./llm-harness";
import * as llm from "../llm";

describe("executeLlmHarness", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("should correctly parse a valid JSON response", async () => {
    //#given
    const prompt = "Check if the story is scary.";
    const draft = "The ghost appeared!";
    const context = { loreDb: {}, previousBeats: [], targetAudience: "horror fans" };
    
    mock.module("../llm", () => ({
      ...llm,
      generateContent: async () => JSON.stringify({ valid: true, feedback: [] }),
    }));

    //#when
    const result = await executeLlmHarness(prompt, draft, context);

    //#then
    expect(result.valid).toBe(true);
    expect(result.feedback).toEqual([]);
  });

  test("should handle invalid draft and return feedback", async () => {
    //#given
    const prompt = "Check for active voice.";
    const draft = "The ball was hit by the boy.";
    const context = { loreDb: {}, previousBeats: [], targetAudience: "general" };
    
    mock.module("../llm", () => ({
      ...llm,
      generateContent: async () => JSON.stringify({ valid: false, feedback: ["Use active voice."] }),
    }));

    //#when
    const result = await executeLlmHarness(prompt, draft, context);

    //#then
    expect(result.valid).toBe(false);
    expect(result.feedback).toContain("Use active voice.");
  });

  test("should use lenient JSON parsing if response contains extra text", async () => {
    //#given
    const prompt = "Check for length.";
    const draft = "Short.";
    const context = { loreDb: {}, previousBeats: [], targetAudience: "general" };
    
    mock.module("../llm", () => ({
      ...llm,
      generateContent: async () => "Here is your result: {\"valid\": true, \"feedback\": []}. Hope this helps!",
    }));

    //#when
    const result = await executeLlmHarness(prompt, draft, context);

    //#then
    expect(result.valid).toBe(true);
  });

  test("should retry once on parse failure", async () => {
    //#given
    const prompt = "Check for length.";
    const draft = "Short.";
    const context = { loreDb: {}, previousBeats: [], targetAudience: "general" };
    
    let callCount = 0;
    mock.module("../llm", () => ({
      ...llm,
      generateContent: async () => {
        callCount++;
        if (callCount === 1) return "invalid json";
        return JSON.stringify({ valid: true, feedback: [] });
      },
    }));

    //#when
    const result = await executeLlmHarness(prompt, draft, context);

    //#then
    expect(callCount).toBe(2);
    expect(result.valid).toBe(true);
  });
});
