import { describe, it, expect } from "bun:test";
import { checkCausal } from "./causal-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";
import type { HarnessContext } from "../types";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

function emptyContext(): HarnessContext {
  return { loreDb: {}, previousBeats: [], targetAudience: "general" };
}

describe("CausalChecker", () => {
  // === Empty / No-violation baselines ===

  //#given an empty graph and empty context
  //#when checking causal logic
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkCausal(createEmptyLogicGraph(), emptyContext());
    expect(results).toEqual([]);
  });

  //#given world rules that are not violated by any events
  //#when checking causal logic
  //#then no errors are returned
  it("returns no errors when no world rules are violated", () => {
    const graph = graphWith({
      worldRules: [
        { rule: "Only dragonfire can melt adamantine", type: "impossible", source: "lore" },
      ],
      events: [
        { id: "e1", description: "Elara swings her sword at the goblin", agent: "Elara", order: 1, location: "para 1" },
      ],
    });
    const results = checkCausal(graph, emptyContext());
    expect(results).toEqual([]);
  });

  // === World rule: impossible ===

  //#given an impossible world rule and an event that violates it
  //#when checking causal logic
  //#then a world_rule_violated error is returned
  it("detects impossible world rule violation", () => {
    const graph = graphWith({
      worldRules: [
        { rule: "Mortals cannot fly without wings", type: "impossible", source: "lore" },
      ],
      events: [
        { id: "e1", description: "The mortal flew across the canyon without wings", agent: "Hero", order: 1, location: "para 3" },
      ],
    });
    const results = checkCausal(graph, emptyContext());
    const violations = results.filter(r => r.rule === "world_rule_violated");
    expect(violations.length).toBe(1);
    expect(violations[0].checker).toBe("CausalChecker");
    expect(violations[0].severity).toBe("error");
    expect(violations[0].evidence).toContain("e1");
  });

  // === Lore contradiction ===

  //#given loreDb with a weapon entry and inventory with a different weapon
  //#when checking causal logic
  //#then a lore_contradiction error is returned
  it("detects lore contradiction (weapon mismatch)", () => {
    const graph = graphWith({
      inventory: [
        { agent: "[CHARACTER_NAME_KAEL]", item: "Flamebrand", acquiredAt: "e1", status: "held" },
      ],
    });
    const context: HarnessContext = {
      loreDb: { [CHARACTER_NAME_KAEL]: { weapon: "Frostblade" } },
      previousBeats: [],
      targetAudience: "general",
    };
    const results = checkCausal(graph, context);
    const contradictions = results.filter(r => r.rule === "lore_contradiction");
    expect(contradictions.length).toBe(1);
    expect(contradictions[0].checker).toBe("CausalChecker");
    expect(contradictions[0].severity).toBe("error");
    expect(contradictions[0].message).toContain("[CHARACTER_NAME_KAEL]");
  });

  //#given loreDb with a weapon entry and inventory with the matching weapon
  //#when checking causal logic
  //#then no errors are returned
  it("returns no error when lore matches inventory", () => {
    const graph = graphWith({
      inventory: [
        { agent: "[CHARACTER_NAME_KAEL]", item: "Frostblade", acquiredAt: "e1", status: "held" },
      ],
    });
    const context: HarnessContext = {
      loreDb: { [CHARACTER_NAME_KAEL]: { weapon: "Frostblade" } },
      previousBeats: [],
      targetAudience: "general",
    };
    const results = checkCausal(graph, context);
    const contradictions = results.filter(r => r.rule === "lore_contradiction");
    expect(contradictions).toEqual([]);
  });

  //#given an empty loreDb
  //#when checking causal logic
  //#then no errors are returned
  it("returns no errors when loreDb is empty", () => {
    const graph = graphWith({
      inventory: [
        { agent: "[CHARACTER_NAME_KAEL]", item: "Flamebrand", acquiredAt: "e1", status: "held" },
      ],
    });
    const results = checkCausal(graph, emptyContext());
    const contradictions = results.filter(r => r.rule === "lore_contradiction");
    expect(contradictions).toEqual([]);
  });
});
