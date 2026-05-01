import { describe, it, expect } from "bun:test";
import { resolvePersonaConfig, type PersonaConfig } from "./persona-config";
import { createPersona } from "./index";

describe("resolvePersonaConfig", () => {
  //#given a literary-fiction persona
  it("should enable all checkers with strict thresholds", () => {
    const persona = createPersona({
      name: "Literary Writer",
      genre: "literary-fiction",
      tone: "lyrical",
      style: "ornate",
      audienceAge: "adult",
    });

    const config = resolvePersonaConfig(persona);

    //#then all logic checkers are enabled
    expect(config.enabledCheckers.propositional).toBe(true);
    expect(config.enabledCheckers.temporal).toBe(true);
    expect(config.enabledCheckers.soundness).toBe(true);
    expect(config.enabledCheckers.epistemic).toBe(true);
    //#then style thresholds are strict
    expect(config.thresholds.maxExclamationMarks).toBeLessThanOrEqual(3);
    expect(config.thresholds.maxFillerWordOccurrences).toBeLessThanOrEqual(3);
  });

  //#given a comedy persona
  it("should relax style thresholds and disable tension checks", () => {
    const persona = createPersona({
      name: "Comedy Writer",
      genre: "comedy",
      tone: "humorous",
      style: "conversational",
      audienceAge: "adult",
    });

    const config = resolvePersonaConfig(persona);

    //#then exclamation marks are more lenient
    expect(config.thresholds.maxExclamationMarks).toBeGreaterThan(3);
    //#then soundness checker is relaxed (comedy doesn't need strict logic)
    expect(config.enabledCheckers.soundness).toBe(false);
  });

  //#given a children's story persona
  it("should disable complex logic checkers", () => {
    const persona = createPersona({
      name: "Kids Writer",
      genre: "children",
      tone: "whimsical",
      style: "conversational",
      audienceAge: "children",
    });

    const config = resolvePersonaConfig(persona);

    //#then heavy logic checkers are disabled
    expect(config.enabledCheckers.soundness).toBe(false);
    expect(config.enabledCheckers.justification).toBe(false);
    expect(config.enabledCheckers.deontic).toBe(false);
    //#then basic ones stay on
    expect(config.enabledCheckers.propositional).toBe(true);
    expect(config.enabledCheckers.temporal).toBe(true);
    //#then word count is lower
    expect(config.thresholds.minWords).toBeLessThan(500);
  });

  //#given a thriller persona
  it("should enable all logic checkers and require tension", () => {
    const persona = createPersona({
      name: "Thriller Writer",
      genre: "thriller",
      tone: "suspenseful",
      style: "minimalist",
      audienceAge: "adult",
    });

    const config = resolvePersonaConfig(persona);

    //#then all logic checkers enabled (plot holes ruin thrillers)
    expect(config.enabledCheckers.propositional).toBe(true);
    expect(config.enabledCheckers.temporal).toBe(true);
    expect(config.enabledCheckers.soundness).toBe(true);
    expect(config.enabledCheckers.epistemic).toBe(true);
    //#then tension threshold is higher
    expect(config.thresholds.minTensionKeywords).toBeGreaterThanOrEqual(3);
  });

  //#given a horror persona
  it("should keep strict logic but allow more exclamation marks", () => {
    const persona = createPersona({
      name: "Horror Writer",
      genre: "horror",
      tone: "dark",
      style: "balanced",
      audienceAge: "adult",
    });

    const config = resolvePersonaConfig(persona);

    expect(config.enabledCheckers.soundness).toBe(true);
    expect(config.thresholds.maxExclamationMarks).toBeGreaterThan(2);
  });

  //#given a custom genre persona
  it("should fall back to sensible defaults for unknown genres", () => {
    const persona = createPersona({
      name: "Family History Writer",
      genre: "family-history",
      tone: "nostalgic",
      style: "journalistic",
      audienceAge: "adult",
    });

    const config = resolvePersonaConfig(persona);

    //#then it uses literary-fiction defaults (all enabled, strict)
    expect(config.enabledCheckers.propositional).toBe(true);
    expect(config.enabledCheckers.temporal).toBe(true);
    expect(config.thresholds.maxExclamationMarks).toBeLessThanOrEqual(3);
  });

  //#given any persona
  it("should always include a complete enabledCheckers map", () => {
    const persona = createPersona({
      name: "Any",
      genre: "drama",
      tone: "neutral",
      style: "balanced",
      audienceAge: "general",
    });

    const config = resolvePersonaConfig(persona);

    //#then all checker keys are defined (no undefined values)
    const checkerKeys = [
      "propositional", "temporal", "epistemic", "deontic",
      "entity", "causal", "soundness", "worldKnowledge", "justification",
      "character", "dialogue", "narrative",
    ];
    for (const key of checkerKeys) {
      expect(typeof (config.enabledCheckers as any)[key]).toBe("boolean");
    }
  });
});
