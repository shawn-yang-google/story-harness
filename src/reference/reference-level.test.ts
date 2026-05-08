import { describe, it, expect } from "bun:test";
import { getReferenceLevelConfig, type ReferenceLevel } from "./reference-level";

describe("ReferenceLevelConfig", () => {
  //#given each valid reference level (1-5)
  //#when we call getReferenceLevelConfig
  //#then it should return a valid config with matching level
  it("getReferenceLevelConfig returns valid config for each level 1-5", () => {
    for (const level of [1, 2, 3, 4, 5] as ReferenceLevel[]) {
      const config = getReferenceLevelConfig(level);
      expect(config.level).toBe(level);
      expect(config.name).toBeDefined();
      expect(config.promptPreamble).toBeDefined();
      expect(Array.isArray(config.skipCategories)).toBe(true);
      expect(typeof config.enableEnrichment).toBe("boolean");
      expect(typeof config.enableResearchQuestions).toBe("boolean");
    }
  });

  //#given level 1 (scan)
  //#then skipCategories should include "linguistic" and "cultural"
  it("level 1 skipCategories includes 'linguistic' and 'cultural'", () => {
    const config = getReferenceLevelConfig(1);
    expect(config.skipCategories).toContain("linguistic");
    expect(config.skipCategories).toContain("cultural");
  });

  //#given level 1 (scan)
  //#then enrichment and research questions should be disabled
  it("level 1 disables enrichment and research questions", () => {
    const config = getReferenceLevelConfig(1);
    expect(config.enableEnrichment).toBe(false);
    expect(config.enableResearchQuestions).toBe(false);
  });

  //#given level 4 (investigate)
  //#then enrichment should be enabled but research questions disabled
  it("level 4 enables enrichment but not research questions", () => {
    const config = getReferenceLevelConfig(4);
    expect(config.enableEnrichment).toBe(true);
    expect(config.enableResearchQuestions).toBe(false);
  });

  //#given level 5 (research)
  //#then both enrichment and research questions should be enabled
  it("level 5 enables both enrichment and research questions", () => {
    const config = getReferenceLevelConfig(5);
    expect(config.enableEnrichment).toBe(true);
    expect(config.enableResearchQuestions).toBe(true);
  });

  //#given all levels
  //#then each should have a unique name
  it("each level has a unique name", () => {
    const names = new Set<string>();
    for (const level of [1, 2, 3, 4, 5] as ReferenceLevel[]) {
      const config = getReferenceLevelConfig(level);
      expect(names.has(config.name)).toBe(false);
      names.add(config.name);
    }
  });

  //#given all levels
  //#then each prompt preamble should contain the level name in uppercase
  it("each level prompt preamble contains the level name in uppercase", () => {
    for (const level of [1, 2, 3, 4, 5] as ReferenceLevel[]) {
      const config = getReferenceLevelConfig(level);
      expect(config.promptPreamble).toContain(config.name.toUpperCase());
    }
  });
});
