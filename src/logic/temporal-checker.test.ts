import { describe, it, expect } from "bun:test";
import { checkTemporal } from "./temporal-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

describe("TemporalChecker", () => {
  //#given an empty graph
  //#when checking temporal logic
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkTemporal(createEmptyLogicGraph());
    expect(results).toEqual([]);
  });

  // === Ordering Validation ===

  //#given events with valid temporal ordering matching constraints
  //#when checking temporal logic
  //#then no errors are returned
  it("returns no errors for valid ordering", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Elara finds the map", agent: "Elara", order: 1, location: "forest" },
        { id: "e2", description: "Elara reaches the cave", agent: "Elara", order: 2, location: "cave" },
      ],
      temporalConstraints: [
        { before: "e1", after: "e2", type: "causal", satisfied: true },
      ],
    });
    const results = checkTemporal(graph);
    expect(results).toEqual([]);
  });

  //#given a constraint saying A before B but A.order > B.order
  //#when checking temporal logic
  //#then an ordering_violation error is returned
  it("detects out-of-order events", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Elara reaches the cave", agent: "Elara", order: 3, location: "cave" },
        { id: "e2", description: "Elara finds the map", agent: "Elara", order: 1, location: "forest" },
      ],
      temporalConstraints: [
        { before: "e1", after: "e2", type: "causal", satisfied: true },
      ],
    });
    const results = checkTemporal(graph);
    expect(results.length).toBe(1);
    expect(results[0].checker).toBe("TemporalChecker");
    expect(results[0].rule).toBe("ordering_violation");
    expect(results[0].severity).toBe("error");
    expect(results[0].evidence).toContain("e1");
    expect(results[0].evidence).toContain("e2");
  });

  // === Simultaneity Conflict ===

  //#given an agent at two different locations at the same event order
  //#when checking temporal logic
  //#then a simultaneity_conflict error is returned
  it("detects agent in two places at same order", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Elara fights in the arena", agent: "Elara", order: 2, location: "arena" },
        { id: "e2", description: "Elara shops at the market", agent: "Elara", order: 2, location: "market" },
      ],
      locations: [
        { agent: "Elara", location: "arena", atEvent: "e1" },
        { agent: "Elara", location: "market", atEvent: "e2" },
      ],
    });
    const results = checkTemporal(graph);
    const conflicts = results.filter(r => r.rule === "simultaneity_conflict");
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].checker).toBe("TemporalChecker");
    expect(conflicts[0].severity).toBe("error");
    expect(conflicts[0].evidence).toContain("e1");
    expect(conflicts[0].evidence).toContain("e2");
  });

  // === Temporal Cycle Detection ===

  //#given temporal constraints that form a cycle (A before B, B before C, C before A)
  //#when checking temporal logic
  //#then a temporal_cycle error is returned
  it("detects temporal cycle", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Event A", agent: "Hero", order: 1, location: "loc1" },
        { id: "e2", description: "Event B", agent: "Hero", order: 2, location: "loc2" },
        { id: "e3", description: "Event C", agent: "Hero", order: 3, location: "loc3" },
      ],
      temporalConstraints: [
        { before: "e1", after: "e2", type: "explicit", satisfied: true },
        { before: "e2", after: "e3", type: "explicit", satisfied: true },
        { before: "e3", after: "e1", type: "explicit", satisfied: true },
      ],
    });
    const results = checkTemporal(graph);
    const cycles = results.filter(r => r.rule === "temporal_cycle");
    expect(cycles.length).toBeGreaterThanOrEqual(1);
    expect(cycles[0].checker).toBe("TemporalChecker");
    expect(cycles[0].severity).toBe("error");
  });

  // === State Persistence ===

  //#given state changes that are consistent across events
  //#when checking temporal logic
  //#then no errors are returned
  it("returns no errors for valid state changes", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Door is locked", agent: "Guard", order: 1, location: "gate" },
        { id: "e2", description: "Hero picks the lock", agent: "Hero", order: 2, location: "gate" },
        { id: "e3", description: "Hero opens the door", agent: "Hero", order: 3, location: "gate" },
      ],
      stateChanges: [
        { entity: "door", attribute: "locked", from: false, to: true, atEvent: "e1" },
        { entity: "door", attribute: "locked", from: true, to: false, atEvent: "e2" },
      ],
    });
    const results = checkTemporal(graph);
    const persistence = results.filter(r => r.rule === "state_persistence_violation");
    expect(persistence).toEqual([]);
  });
});
