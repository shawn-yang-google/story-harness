import { describe, it, expect } from "bun:test";
import { checkCharacter } from "./character-checker";
import { createEmptyCharacterGraph } from "../types/character-graph";
import type { CharacterGraph } from "../types/character-graph";

function graphWith(overrides: Partial<CharacterGraph>): CharacterGraph {
  return { ...createEmptyCharacterGraph(), ...overrides };
}

describe("CharacterChecker", () => {
  // === Empty Graph ===

  //#given an empty character graph
  //#when checking character craft
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkCharacter(createEmptyCharacterGraph());
    expect(results).toEqual([]);
  });

  // === Well-Crafted Character ===

  //#given a well-crafted character with mask != truth, dimensions, earned emotions, and desire
  //#when checking character craft
  //#then no errors are returned
  it("returns no errors for a well-crafted character", () => {
    const graph = graphWith({
      characters: [
        { name: "Elara", mask: "brave warrior", trueNature: "terrified of failure", maskMatchesTruth: false },
      ],
      pressureChoices: [
        {
          character: "Elara",
          pressure: "facing execution",
          choiceA: "betray friend",
          choiceB: "face death",
          chosen: "face death",
          isGenuineDilemma: true,
          revealsCharacter: true,
        },
      ],
      dimensions: [
        {
          character: "Elara",
          dimension: "courage vs cowardice",
          positive: "fights for others",
          negative: "runs from own problems",
          present: true,
        },
      ],
      emotionalMoments: [
        {
          character: "Elara",
          emotion: "grief",
          trigger: "death of her mentor",
          earned: true,
          proportionate: true,
        },
      ],
      desires: [
        {
          character: "Elara",
          consciousDesire: "protect her village",
          subconsciousDesire: "prove she is worthy",
          hasDesire: true,
        },
      ],
    });
    const results = checkCharacter(graph);
    expect(results).toEqual([]);
  });

  // === Check 1: Cement-Block Character ===

  //#given a character where maskMatchesTruth is true
  //#when checking character craft
  //#then a cement_block_character error is returned
  it("detects cement-block character (mask matches truth)", () => {
    const graph = graphWith({
      characters: [
        { name: "[CHARACTER_NAME_KAEL]", mask: "brave warrior", trueNature: "brave warrior", maskMatchesTruth: true },
      ],
    });
    const results = checkCharacter(graph);
    const cementErrors = results.filter(r => r.rule === "cement_block_character");
    expect(cementErrors.length).toBe(1);
    expect(cementErrors[0].checker).toBe("CharacterChecker");
    expect(cementErrors[0].severity).toBe("error");
    expect(cementErrors[0].message).toContain("no gap between mask and true character");
    expect(cementErrors[0].evidence).toContain("[CHARACTER_NAME_KAEL]");
  });

  // === Check 2: No Pressure Choice ===

  //#given characters but an empty pressureChoices array
  //#when checking character craft
  //#then a no_pressure_choice warning is returned
  it("warns when pressureChoices is empty", () => {
    const graph = graphWith({
      characters: [
        { name: "Elara", mask: "brave", trueNature: "afraid", maskMatchesTruth: false },
      ],
      pressureChoices: [],
    });
    const results = checkCharacter(graph);
    const pressureWarnings = results.filter(r => r.rule === "no_pressure_choice");
    expect(pressureWarnings.length).toBe(1);
    expect(pressureWarnings[0].checker).toBe("CharacterChecker");
    expect(pressureWarnings[0].severity).toBe("warning");
    expect(pressureWarnings[0].message).toContain("no meaningful choice under pressure");
  });

  //#given pressureChoices where none reveals character
  //#when checking character craft
  //#then a no_pressure_choice warning is returned
  it("warns when no pressure choice reveals character", () => {
    const graph = graphWith({
      pressureChoices: [
        {
          character: "Elara",
          pressure: "choosing lunch",
          choiceA: "sandwich",
          choiceB: "salad",
          chosen: "sandwich",
          isGenuineDilemma: false,
          revealsCharacter: false,
        },
      ],
    });
    const results = checkCharacter(graph);
    const pressureWarnings = results.filter(r => r.rule === "no_pressure_choice");
    expect(pressureWarnings.length).toBe(1);
    expect(pressureWarnings[0].severity).toBe("warning");
  });

  // === Check 3: Flat Character ===

  //#given a character with no DimensionalContradiction where present=true
  //#when checking character craft
  //#then a flat_character error is returned
  it("detects flat character (no dimensional contradiction)", () => {
    const graph = graphWith({
      characters: [
        { name: "Dorne", mask: "noble knight", trueNature: "hidden coward", maskMatchesTruth: false },
      ],
      dimensions: [
        {
          character: "Dorne",
          dimension: "courage vs cowardice",
          positive: "fights bravely",
          negative: "flees in terror",
          present: false,
        },
      ],
    });
    const results = checkCharacter(graph);
    const flatErrors = results.filter(r => r.rule === "flat_character");
    expect(flatErrors.length).toBe(1);
    expect(flatErrors[0].checker).toBe("CharacterChecker");
    expect(flatErrors[0].severity).toBe("error");
    expect(flatErrors[0].message).toContain("character lacks dimensional contradiction");
    expect(flatErrors[0].evidence).toContain("Dorne");
  });

  // === Check 4: Unearned Emotion ===

  //#given an EmotionalMoment where earned is false
  //#when checking character craft
  //#then an unearned_emotion error is returned
  it("detects unearned emotional moment", () => {
    const graph = graphWith({
      emotionalMoments: [
        {
          character: "Elara",
          emotion: "devastating grief",
          trigger: "a stranger's departure",
          earned: false,
          proportionate: true,
        },
      ],
    });
    const results = checkCharacter(graph);
    const unearnedErrors = results.filter(r => r.rule === "unearned_emotion");
    expect(unearnedErrors.length).toBe(1);
    expect(unearnedErrors[0].checker).toBe("CharacterChecker");
    expect(unearnedErrors[0].severity).toBe("error");
    expect(unearnedErrors[0].message).toContain("unearned emotional moment");
    expect(unearnedErrors[0].evidence).toContain("Elara");
  });

  // === Check 5: Disproportionate Emotion ===

  //#given an EmotionalMoment where proportionate is false
  //#when checking character craft
  //#then a disproportionate_emotion warning is returned
  it("warns about disproportionate emotion (sentimentality)", () => {
    const graph = graphWith({
      emotionalMoments: [
        {
          character: "[CHARACTER_NAME_KAEL]",
          emotion: "inconsolable sobbing",
          trigger: "dropping a coin",
          earned: true,
          proportionate: false,
        },
      ],
    });
    const results = checkCharacter(graph);
    const dispropWarnings = results.filter(r => r.rule === "disproportionate_emotion");
    expect(dispropWarnings.length).toBe(1);
    expect(dispropWarnings[0].checker).toBe("CharacterChecker");
    expect(dispropWarnings[0].severity).toBe("warning");
    expect(dispropWarnings[0].message).toContain("sentimentality: emotion is disproportionate");
    expect(dispropWarnings[0].evidence).toContain("[CHARACTER_NAME_KAEL]");
  });

  // === Check 6: No Desire ===

  //#given a DesireEntry where hasDesire is false
  //#when checking character craft
  //#then a no_desire error is returned
  it("detects character without desire", () => {
    const graph = graphWith({
      desires: [
        {
          character: "Wren",
          consciousDesire: "",
          subconsciousDesire: "",
          hasDesire: false,
        },
      ],
    });
    const results = checkCharacter(graph);
    const desireErrors = results.filter(r => r.rule === "no_desire");
    expect(desireErrors.length).toBe(1);
    expect(desireErrors[0].checker).toBe("CharacterChecker");
    expect(desireErrors[0].severity).toBe("error");
    expect(desireErrors[0].message).toContain("character lacks conscious desire or goal");
    expect(desireErrors[0].evidence).toContain("Wren");
  });

  // === Multiple Characters, Only One Flat ===

  //#given multiple characters, only one lacking dimensional contradiction
  //#when checking character craft
  //#then only one flat_character error is returned for the flat character
  it("reports only the flat character when others have dimensions", () => {
    const graph = graphWith({
      characters: [
        { name: "Elara", mask: "brave", trueNature: "afraid", maskMatchesTruth: false },
        { name: "Flat Fred", mask: "kind", trueNature: "also kind", maskMatchesTruth: false },
      ],
      dimensions: [
        {
          character: "Elara",
          dimension: "courage vs cowardice",
          positive: "fights",
          negative: "flees",
          present: true,
        },
        {
          character: "Flat Fred",
          dimension: "kindness vs cruelty",
          positive: "helps",
          negative: "ignores",
          present: false,
        },
      ],
    });
    const results = checkCharacter(graph);
    const flatErrors = results.filter(r => r.rule === "flat_character");
    expect(flatErrors.length).toBe(1);
    expect(flatErrors[0].evidence).toContain("Flat Fred");
    expect(flatErrors[0].evidence).not.toContain("Elara");
  });
});
