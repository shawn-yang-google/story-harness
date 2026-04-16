import { describe, it, expect } from "bun:test";
import { checkWorldKnowledge } from "./world-knowledge-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

describe("WorldKnowledgeChecker", () => {
  //#given an empty graph
  //#when checking world knowledge
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkWorldKnowledge(createEmptyLogicGraph());
    expect(results).toEqual([]);
  });

  //#given plausible state changes over time
  //#when checking world knowledge
  //#then no errors are returned
  it("returns no errors for plausible state changes", () => {
    const graph = graphWith({
      stateChanges: [
        { entity: "weather", attribute: "condition", from: "cloudy", to: "rainy", atEvent: "e1" },
      ],
      events: [
        { id: "e1", description: "Dark clouds gathered and it began to rain", agent: "environment", order: 1, location: "para 1" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    expect(results).toEqual([]);
  });

  // === Instant State Transitions ===

  //#given an instant weather change with no causal event
  //#when checking world knowledge
  //#then an instant_state_transition error is returned
  it("detects instant weather transitions", () => {
    const graph = graphWith({
      stateChanges: [
        { entity: "weather", attribute: "condition", from: "raining", to: "sunny", atEvent: "e1" },
      ],
      events: [
        { id: "e1", description: "The rain stopped instantly and the sun came out", agent: "environment", order: 1, location: "para 1" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    const instant = results.filter(r => r.rule === "instant_state_transition");
    expect(instant.length).toBe(1);
    expect(instant[0].checker).toBe("WorldKnowledgeChecker");
    expect(instant[0].severity).toBe("warning");
  });

  //#given an instant injury healing
  //#when checking world knowledge
  //#then an instant_state_transition error is returned
  it("detects instant injury healing", () => {
    const graph = graphWith({
      stateChanges: [
        { entity: "hero", attribute: "injury", from: "broken_leg", to: "healthy", atEvent: "e1" },
      ],
      events: [
        { id: "e1", description: "His broken leg healed instantly", agent: "hero", order: 1, location: "para 3" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    const instant = results.filter(r => r.rule === "instant_state_transition");
    expect(instant.length).toBe(1);
  });

  //#given an instant temperature change
  //#when checking world knowledge
  //#then an instant_state_transition error is returned
  it("detects instant temperature transitions", () => {
    const graph = graphWith({
      stateChanges: [
        { entity: "room", attribute: "temperature", from: "freezing", to: "hot", atEvent: "e1" },
      ],
      events: [
        { id: "e1", description: "The room instantly changed from cold to warm", agent: "environment", order: 1, location: "para 2" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    const instant = results.filter(r => r.rule === "instant_state_transition");
    expect(instant.length).toBe(1);
  });

  // === Physical Impossibility ===

  //#given a proposition describing a physically impossible scenario
  //#when checking world knowledge
  //#then a physical_impossibility warning is returned
  it("detects physical impossibility in propositions", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The rain stopped instantly and the sun came out", subject: "weather", predicate: "instant_change", truth: true, location: "para 1" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    const phys = results.filter(r => r.rule === "physical_impossibility");
    expect(phys.length).toBe(1);
    expect(phys[0].checker).toBe("WorldKnowledgeChecker");
    expect(phys[0].severity).toBe("warning");
  });

  //#given an event describing instant healing without magical context
  //#when checking world knowledge
  //#then a physical_impossibility warning is returned
  it("detects physical impossibility in events", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "His wounds healed instantly before their eyes", agent: "hero", order: 1, location: "para 2" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    const phys = results.filter(r => r.rule === "physical_impossibility");
    expect(phys.length).toBe(1);
  });

  // === Missing Causal Mechanism ===

  //#given a state change with no corresponding causal event
  //#when checking world knowledge
  //#then a missing_causal_mechanism warning is returned
  it("detects state changes with no causal event", () => {
    const graph = graphWith({
      stateChanges: [
        { entity: "weather", attribute: "condition", from: "sunny", to: "stormy", atEvent: "e_nonexistent" },
      ],
      events: [],
    });
    const results = checkWorldKnowledge(graph);
    const missing = results.filter(r => r.rule === "missing_causal_mechanism");
    expect(missing.length).toBe(1);
    expect(missing[0].checker).toBe("WorldKnowledgeChecker");
    expect(missing[0].severity).toBe("warning");
  });

  //#given a state change that references a valid event
  //#when checking world knowledge
  //#then no missing_causal_mechanism warning
  it("does not flag state changes with matching events", () => {
    const graph = graphWith({
      stateChanges: [
        { entity: "door", attribute: "state", from: "locked", to: "unlocked", atEvent: "e1" },
      ],
      events: [
        { id: "e1", description: "He unlocked the door with the key", agent: "hero", order: 1, location: "para 1" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    const missing = results.filter(r => r.rule === "missing_causal_mechanism");
    expect(missing).toEqual([]);
  });

  // === Edge Cases ===

  //#given a magical world with instant healing established as a world rule
  //#when checking world knowledge
  //#then no errors (world rule supersedes physical impossibility)
  it("does not flag instant transitions in magical contexts with world rules", () => {
    const graph = graphWith({
      stateChanges: [
        { entity: "hero", attribute: "injury", from: "wounded", to: "healed", atEvent: "e1" },
      ],
      events: [
        { id: "e1", description: "The healing spell instantly mended his wounds", agent: "hero", order: 1, location: "para 1" },
      ],
      worldRules: [
        { rule: "Healing magic can instantly cure wounds", type: "necessary", source: "lore" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    const instant = results.filter(r => r.rule === "instant_state_transition");
    expect(instant).toEqual([]);
  });

  //#given normal non-physical state changes
  //#when checking world knowledge
  //#then no errors are returned
  it("does not flag non-physical attribute changes", () => {
    const graph = graphWith({
      stateChanges: [
        { entity: "hero", attribute: "mood", from: "happy", to: "sad", atEvent: "e1" },
      ],
      events: [
        { id: "e1", description: "He received terrible news", agent: "hero", order: 1, location: "para 1" },
      ],
    });
    const results = checkWorldKnowledge(graph);
    expect(results).toEqual([]);
  });
});
