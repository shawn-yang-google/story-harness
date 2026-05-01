import { describe, it, expect } from "bun:test";
import {
  type WriterPersona,
  type Genre,
  type Tone,
  type Style,
  type AudienceAge,
  GENRES,
  TONES,
  STYLES,
  AUDIENCE_AGES,
  createPersona,
} from "./index";

describe("WriterPersona", () => {
  //#given the available genre options
  it("should expose all supported genres", () => {
    //#then GENRES contains the expected set
    expect(GENRES).toContain("literary-fiction");
    expect(GENRES).toContain("thriller");
    expect(GENRES).toContain("horror");
    expect(GENRES).toContain("comedy");
    expect(GENRES).toContain("romance");
    expect(GENRES).toContain("sci-fi");
    expect(GENRES).toContain("fantasy");
    expect(GENRES).toContain("mystery");
    expect(GENRES).toContain("children");
    expect(GENRES.length).toBeGreaterThanOrEqual(9);
  });

  //#given the available tone options
  it("should expose all supported tones", () => {
    expect(TONES).toContain("dark");
    expect(TONES).toContain("humorous");
    expect(TONES).toContain("lyrical");
    expect(TONES).toContain("gritty");
    expect(TONES).toContain("whimsical");
    expect(TONES).toContain("suspenseful");
    expect(TONES).toContain("melancholic");
    expect(TONES).toContain("neutral");
  });

  //#given the available style options
  it("should expose all supported styles", () => {
    expect(STYLES).toContain("minimalist");
    expect(STYLES).toContain("ornate");
    expect(STYLES).toContain("conversational");
    expect(STYLES).toContain("journalistic");
    expect(STYLES).toContain("stream-of-consciousness");
    expect(STYLES).toContain("balanced");
  });

  //#given the available audience age options
  it("should expose all supported audience ages", () => {
    expect(AUDIENCE_AGES).toContain("children");
    expect(AUDIENCE_AGES).toContain("young-adult");
    expect(AUDIENCE_AGES).toContain("adult");
    expect(AUDIENCE_AGES).toContain("general");
  });

  //#when creating a persona with valid options
  it("should create a valid WriterPersona object", () => {
    const persona = createPersona({
      name: "Noir Detective Writer",
      genre: "mystery",
      tone: "dark",
      style: "minimalist",
      audienceAge: "adult",
    });

    //#then the persona has all required fields
    expect(persona.name).toBe("Noir Detective Writer");
    expect(persona.genre).toBe("mystery");
    expect(persona.tone).toBe("dark");
    expect(persona.style).toBe("minimalist");
    expect(persona.audienceAge).toBe("adult");
  });

  //#when creating a persona with optional systemPrompt
  it("should include a custom system prompt when provided", () => {
    const persona = createPersona({
      name: "Hemingway",
      genre: "literary-fiction",
      tone: "gritty",
      style: "minimalist",
      audienceAge: "adult",
      systemPrompt: "Write like Ernest Hemingway. Short sentences. No adjectives.",
    });

    expect(persona.systemPrompt).toBe("Write like Ernest Hemingway. Short sentences. No adjectives.");
  });

  //#when creating a persona with optional emphasis tags
  it("should accept emphasis priorities", () => {
    const persona = createPersona({
      name: "Character-driven author",
      genre: "literary-fiction",
      tone: "melancholic",
      style: "ornate",
      audienceAge: "adult",
      emphasis: ["character-depth", "subtext", "emotional-arc"],
    });

    expect(persona.emphasis).toEqual(["character-depth", "subtext", "emotional-arc"]);
  });

  //#when creating a persona with custom (non-predefined) values
  it("should accept custom genre, tone, style, and audience strings", () => {
    const persona = createPersona({
      name: "Family History Writer",
      genre: "family-history",
      tone: "nostalgic",
      style: "epistolary",
      audienceAge: "multigenerational",
    });

    //#then custom values are preserved as-is
    expect(persona.genre).toBe("family-history");
    expect(persona.tone).toBe("nostalgic");
    expect(persona.style).toBe("epistolary");
    expect(persona.audienceAge).toBe("multigenerational");
  });
});
