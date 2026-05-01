import { describe, it, expect } from "bun:test";
import { getEnabledHarnesses, ALL_HARNESS_FILES } from "./harness-map";
import { createPersona } from "./index";

describe("harness-map", () => {
  //#given the full harness file list
  it("should export ALL_HARNESS_FILES matching real harness directory", () => {
    //#then the list contains the known harness files
    expect(ALL_HARNESS_FILES).toContain("StyleHarness.ts");
    expect(ALL_HARNESS_FILES).toContain("StructureHarness.ts");
    expect(ALL_HARNESS_FILES).toContain("EmotionHarness.ts");
    expect(ALL_HARNESS_FILES).toContain("TensionHarness.ts");
    expect(ALL_HARNESS_FILES).toContain("LogicHarness.ts");
    expect(ALL_HARNESS_FILES).toContain("LogicCraftHarness.hybrid.json");
    expect(ALL_HARNESS_FILES).toContain("CharacterCraftHarness.hybrid.json");
    expect(ALL_HARNESS_FILES).toContain("DialogueCraftHarness.hybrid.json");
    expect(ALL_HARNESS_FILES).toContain("NarrativeCraftHarness.hybrid.json");
    expect(ALL_HARNESS_FILES).toContain("ReaderExperience.prompt.txt");
  });

  //#when a literary-fiction persona is used
  it("should enable all harnesses for literary-fiction genre", () => {
    const persona = createPersona({
      name: "Literary Writer",
      genre: "literary-fiction",
      tone: "lyrical",
      style: "ornate",
      audienceAge: "adult",
    });

    const enabled = getEnabledHarnesses(persona);

    //#then all harnesses are enabled (literary fiction needs maximum validation)
    expect(enabled).toContain("StyleHarness.ts");
    expect(enabled).toContain("StructureHarness.ts");
    expect(enabled).toContain("CharacterCraftHarness.hybrid.json");
    expect(enabled).toContain("DialogueCraftHarness.hybrid.json");
    expect(enabled).toContain("NarrativeCraftHarness.hybrid.json");
    expect(enabled).toContain("ReaderExperience.prompt.txt");
  });

  //#when a thriller persona is used
  it("should enable tension and logic harnesses for thriller genre", () => {
    const persona = createPersona({
      name: "Thriller Writer",
      genre: "thriller",
      tone: "suspenseful",
      style: "minimalist",
      audienceAge: "adult",
    });

    const enabled = getEnabledHarnesses(persona);

    //#then tension harness is enabled
    expect(enabled).toContain("TensionHarness.ts");
    expect(enabled).toContain("LogicCraftHarness.hybrid.json");
    expect(enabled).toContain("StructureHarness.ts");
  });

  //#when a children's story persona is used
  it("should disable complex harnesses for children genre", () => {
    const persona = createPersona({
      name: "Kids Writer",
      genre: "children",
      tone: "whimsical",
      style: "conversational",
      audienceAge: "children",
    });

    const enabled = getEnabledHarnesses(persona);

    //#then tension and heavy logic harnesses are disabled
    expect(enabled).not.toContain("TensionHarness.ts");
    expect(enabled).not.toContain("LogicCraftHarness.hybrid.json");
    // Structure and basic style should still be enabled
    expect(enabled).toContain("StructureHarness.ts");
    expect(enabled).toContain("StyleHarness.ts");
  });

  //#when a comedy persona is used
  it("should disable tension and emotion for comedy genre", () => {
    const persona = createPersona({
      name: "Comedy Writer",
      genre: "comedy",
      tone: "humorous",
      style: "conversational",
      audienceAge: "adult",
    });

    const enabled = getEnabledHarnesses(persona);

    //#then tension harness is disabled (comedy has different pacing)
    expect(enabled).not.toContain("TensionHarness.ts");
    // Dialogue is critical for comedy
    expect(enabled).toContain("DialogueCraftHarness.hybrid.json");
    expect(enabled).toContain("StructureHarness.ts");
  });

  //#when a horror persona is used
  it("should enable tension and emotion for horror genre", () => {
    const persona = createPersona({
      name: "Horror Writer",
      genre: "horror",
      tone: "dark",
      style: "balanced",
      audienceAge: "adult",
    });

    const enabled = getEnabledHarnesses(persona);

    //#then tension and emotion harnesses are enabled
    expect(enabled).toContain("TensionHarness.ts");
    expect(enabled).toContain("EmotionHarness.ts");
    expect(enabled).toContain("LogicCraftHarness.hybrid.json");
  });

  //#when the enabled list is returned
  it("should never return an empty list", () => {
    const persona = createPersona({
      name: "Any Writer",
      genre: "comedy",
      tone: "humorous",
      style: "conversational",
      audienceAge: "general",
    });

    const enabled = getEnabledHarnesses(persona);

    //#then at least StructureHarness is always enabled
    expect(enabled.length).toBeGreaterThanOrEqual(1);
    expect(enabled).toContain("StructureHarness.ts");
  });

  //#when a custom (non-predefined) genre is used
  it("should fall back to literary-fiction harnesses for custom genres", () => {
    const persona = createPersona({
      name: "Family History Writer",
      genre: "family-history",
      tone: "nostalgic",
      style: "epistolary",
      audienceAge: "multigenerational",
    });

    const enabled = getEnabledHarnesses(persona);

    //#then it falls back to literary-fiction (all harnesses)
    expect(enabled).toContain("StyleHarness.ts");
    expect(enabled).toContain("StructureHarness.ts");
    expect(enabled).toContain("CharacterCraftHarness.hybrid.json");
    expect(enabled).toContain("NarrativeCraftHarness.hybrid.json");
    expect(enabled).toContain("ReaderExperience.prompt.txt");
    expect(enabled.length).toBeGreaterThanOrEqual(9);
  });
});
