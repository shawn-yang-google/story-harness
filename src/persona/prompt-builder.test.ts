import { describe, it, expect } from "bun:test";
import { buildGenerationPrompt } from "./prompt-builder";
import { createPersona } from "./index";

describe("buildGenerationPrompt", () => {
  //#when building a prompt for a noir mystery persona
  it("should include genre, tone, and style instructions", () => {
    const persona = createPersona({
      name: "Noir Detective Writer",
      genre: "mystery",
      tone: "dark",
      style: "minimalist",
      audienceAge: "adult",
    });

    const prompt = buildGenerationPrompt(persona);

    //#then the prompt contains persona-specific guidance
    expect(prompt).toContain("mystery");
    expect(prompt).toContain("dark");
    expect(prompt).toContain("minimalist");
    expect(prompt).toContain("adult");
  });

  //#when the persona has a custom system prompt
  it("should include the custom system prompt verbatim", () => {
    const persona = createPersona({
      name: "Hemingway",
      genre: "literary-fiction",
      tone: "gritty",
      style: "minimalist",
      audienceAge: "adult",
      systemPrompt: "Write like Ernest Hemingway. Short sentences. No adjectives.",
    });

    const prompt = buildGenerationPrompt(persona);

    //#then the custom prompt is included
    expect(prompt).toContain("Write like Ernest Hemingway. Short sentences. No adjectives.");
  });

  //#when the persona has emphasis tags
  it("should include emphasis priorities in the prompt", () => {
    const persona = createPersona({
      name: "Character-driven",
      genre: "literary-fiction",
      tone: "melancholic",
      style: "ornate",
      audienceAge: "adult",
      emphasis: ["character-depth", "subtext"],
    });

    const prompt = buildGenerationPrompt(persona);

    //#then emphasis priorities appear in the prompt
    expect(prompt).toContain("character-depth");
    expect(prompt).toContain("subtext");
  });

  //#when building for a children's story persona
  it("should include audience-appropriate language guidance", () => {
    const persona = createPersona({
      name: "Kids Writer",
      genre: "children",
      tone: "whimsical",
      style: "conversational",
      audienceAge: "children",
    });

    const prompt = buildGenerationPrompt(persona);

    //#then the prompt mentions age-appropriate content
    expect(prompt).toContain("children");
    expect(prompt).toContain("whimsical");
  });

  //#when the returned prompt is used as a system instruction
  it("should be a non-empty string", () => {
    const persona = createPersona({
      name: "Default",
      genre: "literary-fiction",
      tone: "neutral",
      style: "balanced",
      audienceAge: "general",
    });

    const prompt = buildGenerationPrompt(persona);
    expect(prompt.length).toBeGreaterThan(50);
  });
});
