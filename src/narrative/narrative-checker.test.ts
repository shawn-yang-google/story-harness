import { describe, it, expect } from "bun:test";
import { checkNarrative } from "./narrative-checker";
import { createEmptyNarrativeGraph } from "../types/narrative-graph";
import type { NarrativeGraph } from "../types/narrative-graph";

/** Base graph with one real conflict to avoid no_conflict noise in unrelated tests */
const baseGraph: NarrativeGraph = {
  ...createEmptyNarrativeGraph(),
  conflicts: [
    { type: "inner", description: "default conflict", parties: ["A"], resolved: false },
  ],
};

function graphWith(overrides: Partial<NarrativeGraph>): NarrativeGraph {
  return { ...baseGraph, ...overrides };
}

describe("NarrativeChecker", () => {
  // === Empty Graph ===

  //#given an empty narrative graph
  //#when checking narrative craft
  //#then only the no_conflict error is returned (empty = no conflict data)
  it("returns only no_conflict for an empty graph", () => {
    const results = checkNarrative(createEmptyNarrativeGraph());
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("no_conflict");
  });

  // === Well-Crafted Narrative ===

  //#given a well-crafted narrative with turning values, escalating stakes, goals with obstacles, and shown themes
  //#when checking narrative craft
  //#then no errors or warnings are returned
  it("returns no errors for a well-crafted narrative", () => {
    const graph = graphWith({
      turningValues: [
        { scene: "Hero discovers the threat", valueBefore: "safety", valueAfter: "danger", changed: true, location: "act 1" },
        { scene: "Hero confronts the villain", valueBefore: "fear", valueAfter: "courage", changed: true, location: "act 2" },
      ],
      stakes: [
        { description: "Hero's reputation", level: "professional", order: 1, escalatesFromPrevious: false },
        { description: "Hero's life", level: "life_death", order: 2, escalatesFromPrevious: true },
      ],
      protagonistDesires: [
        { character: "Hero", goal: "save the village", hasGoal: true, obstaclePresent: true },
      ],
      themeDeliveries: [
        { theme: "courage", delivery: "shown", location: "act 2" },
      ],
      conflicts: [
        { type: "personal", description: "Hero vs Villain", parties: ["Hero", "Villain"], resolved: false },
      ],
      premiseCounterPremise: [
        { premise: "courage conquers fear", counterPremise: "fear is rational self-preservation", counterPresent: true },
      ],
    });
    const results = checkNarrative(graph);
    expect(results).toEqual([]);
  });

  // === Non-Turning Scene ===

  //#given a scene where the value does not change
  //#when checking narrative craft
  //#then a non_turning_scene error is returned
  it("detects non-turning scene (changed=false)", () => {
    const graph = graphWith({
      turningValues: [
        { scene: "Characters sit around talking", valueBefore: "boredom", valueAfter: "boredom", changed: false, location: "act 1, scene 3" },
      ],
    });
    const results = checkNarrative(graph);
    expect(results.length).toBe(1);
    expect(results[0].checker).toBe("NarrativeChecker");
    expect(results[0].rule).toBe("non_turning_scene");
    expect(results[0].severity).toBe("error");
    expect(results[0].message).toContain("no value change");
    expect(results[0].evidence).toContain("act 1, scene 3");
  });

  //#given multiple scenes where some turn and some don't
  //#when checking narrative craft
  //#then only the non-turning scenes are flagged
  it("only flags non-turning scenes, not turning ones", () => {
    const graph = graphWith({
      turningValues: [
        { scene: "Exciting battle", valueBefore: "peace", valueAfter: "war", changed: true, location: "act 2" },
        { scene: "Filler scene", valueBefore: "calm", valueAfter: "calm", changed: false, location: "act 1" },
      ],
    });
    const results = checkNarrative(graph);
    const nonTurning = results.filter(r => r.rule === "non_turning_scene");
    expect(nonTurning.length).toBe(1);
    expect(nonTurning[0].evidence).toContain("act 1");
  });

  // === Flat Stakes ===

  //#given multiple stakes where none escalate from previous
  //#when checking narrative craft
  //#then a flat_stakes warning is returned
  it("detects flat stakes (no escalation)", () => {
    const graph = graphWith({
      stakes: [
        { description: "Lose job", level: "professional", order: 1, escalatesFromPrevious: false },
        { description: "Lose friend", level: "personal", order: 2, escalatesFromPrevious: false },
        { description: "Lose house", level: "personal", order: 3, escalatesFromPrevious: false },
      ],
    });
    const results = checkNarrative(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("flat_stakes");
    expect(results[0].severity).toBe("warning");
    expect(results[0].message).toContain("escalate");
  });

  //#given a single stake entry
  //#when checking narrative craft
  //#then no flat_stakes warning (need >1 to judge escalation)
  it("does not flag flat stakes when only one stake exists", () => {
    const graph = graphWith({
      stakes: [
        { description: "Lose job", level: "professional", order: 1, escalatesFromPrevious: false },
      ],
    });
    const results = checkNarrative(graph);
    const flatStakes = results.filter(r => r.rule === "flat_stakes");
    expect(flatStakes.length).toBe(0);
  });

  //#given stakes where at least one escalates
  //#when checking narrative craft
  //#then no flat_stakes warning
  it("does not flag stakes when at least one escalates", () => {
    const graph = graphWith({
      stakes: [
        { description: "Lose job", level: "professional", order: 1, escalatesFromPrevious: false },
        { description: "Lose life", level: "life_death", order: 2, escalatesFromPrevious: true },
      ],
    });
    const results = checkNarrative(graph);
    const flatStakes = results.filter(r => r.rule === "flat_stakes");
    expect(flatStakes.length).toBe(0);
  });

  // === No Protagonist Goal ===

  //#given a protagonist desire where hasGoal is false
  //#when checking narrative craft
  //#then a no_protagonist_goal error is returned
  it("detects protagonist lacking clear goal", () => {
    const graph = graphWith({
      protagonistDesires: [
        { character: "Hero", goal: "", hasGoal: false, obstaclePresent: false },
      ],
    });
    const results = checkNarrative(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("no_protagonist_goal");
    expect(results[0].severity).toBe("error");
    expect(results[0].message).toContain("lacks clear goal");
    expect(results[0].evidence).toContain("Hero");
  });

  // === Goal Without Obstacle ===

  //#given a protagonist desire where hasGoal is true but obstaclePresent is false
  //#when checking narrative craft
  //#then a no_obstacle warning is returned
  it("detects goal without obstacle", () => {
    const graph = graphWith({
      protagonistDesires: [
        { character: "Hero", goal: "save the world", hasGoal: true, obstaclePresent: false },
      ],
    });
    const results = checkNarrative(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("no_obstacle");
    expect(results[0].severity).toBe("warning");
    expect(results[0].message).toContain("no tension");
    expect(results[0].evidence).toContain("Hero");
  });

  //#given a protagonist desire where hasGoal is true and obstaclePresent is true
  //#when checking narrative craft
  //#then no warnings
  it("does not flag goal with obstacle present", () => {
    const graph = graphWith({
      protagonistDesires: [
        { character: "Hero", goal: "save the world", hasGoal: true, obstaclePresent: true },
      ],
    });
    const results = checkNarrative(graph);
    expect(results).toEqual([]);
  });

  // === Didactic Theme ===

  //#given a theme delivery where delivery is "didactic"
  //#when checking narrative craft
  //#then a didactic_theme error is returned
  it("detects didactic theme delivery", () => {
    const graph = graphWith({
      themeDeliveries: [
        { theme: "greed is bad", delivery: "didactic", location: "epilogue" },
      ],
    });
    const results = checkNarrative(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("didactic_theme");
    expect(results[0].severity).toBe("error");
    expect(results[0].message).toContain("stated directly");
    expect(results[0].evidence).toContain("epilogue");
  });

  //#given a theme delivery where delivery is "shown"
  //#when checking narrative craft
  //#then no error
  it("does not flag shown theme delivery", () => {
    const graph = graphWith({
      themeDeliveries: [
        { theme: "courage", delivery: "shown", location: "act 2" },
      ],
    });
    const results = checkNarrative(graph);
    expect(results).toEqual([]);
  });

  //#given a theme delivery where delivery is "stated"
  //#when checking narrative craft
  //#then no error (stated is acceptable, only didactic is not)
  it("does not flag stated theme delivery", () => {
    const graph = graphWith({
      themeDeliveries: [
        { theme: "love conquers all", delivery: "stated", location: "act 3" },
      ],
    });
    const results = checkNarrative(graph);
    expect(results).toEqual([]);
  });

  // === No Conflict ===

  //#given an empty conflicts array
  //#when checking narrative craft
  //#then a no_conflict error is returned
  it("detects no conflict when conflicts array is empty", () => {
    const graph = graphWith({
      conflicts: [],
    });
    const results = checkNarrative(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("no_conflict");
    expect(results[0].severity).toBe("error");
    expect(results[0].message).toContain("No conflict");
  });

  //#given all conflicts with type "none"
  //#when checking narrative craft
  //#then a no_conflict error is returned
  it("detects no conflict when all conflicts have type none", () => {
    const graph = graphWith({
      conflicts: [
        { type: "none", description: "peaceful", parties: [], resolved: false },
        { type: "none", description: "calm", parties: [], resolved: false },
      ],
    });
    const results = checkNarrative(graph);
    const noConflict = results.filter(r => r.rule === "no_conflict");
    expect(noConflict.length).toBe(1);
    expect(noConflict[0].severity).toBe("error");
  });

  //#given at least one real conflict
  //#when checking narrative craft
  //#then no no_conflict error
  it("does not flag conflict when at least one real conflict exists", () => {
    const graph = graphWith({
      conflicts: [
        { type: "none", description: "peaceful", parties: [], resolved: false },
        { type: "inner", description: "moral dilemma", parties: ["Hero"], resolved: false },
      ],
    });
    const results = checkNarrative(graph);
    const noConflict = results.filter(r => r.rule === "no_conflict");
    expect(noConflict.length).toBe(0);
  });

  // === No Counter-Premise ===

  //#given a premise/counter-premise where counterPresent is false
  //#when checking narrative craft
  //#then a no_counter_premise warning is returned
  it("detects missing counter-premise", () => {
    const graph = graphWith({
      premiseCounterPremise: [
        { premise: "love conquers all", counterPremise: "", counterPresent: false },
      ],
    });
    const results = checkNarrative(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("no_counter_premise");
    expect(results[0].severity).toBe("warning");
    expect(results[0].message).toContain("one-sided");
    expect(results[0].evidence).toContain("love conquers all");
  });

  //#given a premise/counter-premise where counterPresent is true
  //#when checking narrative craft
  //#then no warning
  it("does not flag when counter-premise is present", () => {
    const graph = graphWith({
      premiseCounterPremise: [
        { premise: "love conquers all", counterPremise: "love blinds", counterPresent: true },
      ],
    });
    const results = checkNarrative(graph);
    expect(results).toEqual([]);
  });

  // === Combined: multiple issues in one graph ===

  //#given a graph with multiple narrative craft issues
  //#when checking narrative craft
  //#then all issues are reported
  it("reports multiple issues in a single graph", () => {
    const graph = graphWith({
      turningValues: [
        { scene: "Filler", valueBefore: "calm", valueAfter: "calm", changed: false, location: "act 1" },
      ],
      protagonistDesires: [
        { character: "Hero", goal: "", hasGoal: false, obstaclePresent: false },
      ],
      themeDeliveries: [
        { theme: "greed is bad", delivery: "didactic", location: "epilogue" },
      ],
      conflicts: [],
    });
    const results = checkNarrative(graph);
    const rules = results.map(r => r.rule);
    expect(rules).toContain("non_turning_scene");
    expect(rules).toContain("no_protagonist_goal");
    expect(rules).toContain("didactic_theme");
    expect(rules).toContain("no_conflict");
  });
});
