import { describe, it, expect } from "bun:test";
import { checkEntity } from "./entity-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

describe("EntityChecker", () => {
  // === Empty Graph ===

  //#given an empty graph
  //#when checking entity consistency
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkEntity(createEmptyLogicGraph());
    expect(results).toEqual([]);
  });

  // === Inventory: Used After Consumed ===

  //#given an item that is held and used at a single event
  //#when checking entity consistency
  //#then no error is returned
  it("returns no error for item held and used normally", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Elara picks up the sword", agent: "Elara", order: 1, location: "para 1" },
        { id: "e2", description: "Elara uses the sword", agent: "Elara", order: 2, location: "para 2" },
      ],
      inventory: [
        { agent: "Elara", item: "sword", acquiredAt: "e1", usedAt: "e2", status: "used" },
      ],
    });
    const results = checkEntity(graph);
    expect(results).toEqual([]);
  });

  //#given an item that was lost but appears in a later event
  //#when checking entity consistency
  //#then an error "item_already_consumed" is returned
  it("detects item used after being lost", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Elara picks up the amulet", agent: "Elara", order: 1, location: "para 1" },
        { id: "e2", description: "Elara loses the amulet in the river", agent: "Elara", order: 2, location: "para 2" },
        { id: "e3", description: "Elara uses the amulet to open the gate", agent: "Elara", order: 3, location: "para 3" },
      ],
      inventory: [
        { agent: "Elara", item: "amulet", acquiredAt: "e1", usedAt: "e2", status: "lost" },
        { agent: "Elara", item: "amulet", acquiredAt: "e1", usedAt: "e3", status: "used" },
      ],
    });
    const results = checkEntity(graph);
    const consumed = results.filter(r => r.rule === "item_already_consumed");
    expect(consumed.length).toBe(1);
    expect(consumed[0].checker).toBe("EntityChecker");
    expect(consumed[0].severity).toBe("error");
    expect(consumed[0].evidence).toContain("e2");
    expect(consumed[0].evidence).toContain("e3");
  });

  // === Location Teleportation ===

  //#given an agent at the same location across consecutive events
  //#when checking entity consistency
  //#then no error is returned
  it("returns no error when agent stays at the same location", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "[CHARACTER_NAME_KAEL] enters the tavern", agent: "[CHARACTER_NAME_KAEL]", order: 1, location: "para 1" },
        { id: "e2", description: "[CHARACTER_NAME_KAEL] orders a drink", agent: "[CHARACTER_NAME_KAEL]", order: 2, location: "para 2" },
      ],
      locations: [
        { agent: "[CHARACTER_NAME_KAEL]", location: "tavern", atEvent: "e1" },
        { agent: "[CHARACTER_NAME_KAEL]", location: "tavern", atEvent: "e2" },
      ],
    });
    const results = checkEntity(graph);
    expect(results).toEqual([]);
  });

  //#given an agent at different locations in consecutive events with no travel event
  //#when checking entity consistency
  //#then a warning "location_teleport" is returned
  it("detects agent teleporting between locations", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "[CHARACTER_NAME_KAEL] is in the tavern", agent: "[CHARACTER_NAME_KAEL]", order: 1, location: "para 1" },
        { id: "e2", description: "[CHARACTER_NAME_KAEL] is in the castle", agent: "[CHARACTER_NAME_KAEL]", order: 2, location: "para 2" },
      ],
      locations: [
        { agent: "[CHARACTER_NAME_KAEL]", location: "tavern", atEvent: "e1" },
        { agent: "[CHARACTER_NAME_KAEL]", location: "castle", atEvent: "e2" },
      ],
    });
    const results = checkEntity(graph);
    const teleports = results.filter(r => r.rule === "location_teleport");
    expect(teleports.length).toBe(1);
    expect(teleports[0].checker).toBe("EntityChecker");
    expect(teleports[0].severity).toBe("warning");
    expect(teleports[0].evidence).toContain("e1");
    expect(teleports[0].evidence).toContain("e2");
  });

  // === Status Violation ===

  //#given a dead agent that performs an action after death
  //#when checking entity consistency
  //#then an error "status_violation" is returned
  it("detects dead agent performing action", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Ren dies in battle", agent: "Ren", order: 1, location: "para 1" },
        { id: "e2", description: "Ren picks up a shield", agent: "Ren", order: 2, location: "para 2" },
      ],
      statuses: [
        { agent: "Ren", state: "dead", since: "e1" },
      ],
    });
    const results = checkEntity(graph);
    const violations = results.filter(r => r.rule === "status_violation");
    expect(violations.length).toBe(1);
    expect(violations[0].checker).toBe("EntityChecker");
    expect(violations[0].severity).toBe("error");
    expect(violations[0].evidence).toContain("e1");
    expect(violations[0].evidence).toContain("e2");
  });

  //#given an unconscious agent that has events after losing consciousness
  //#when checking entity consistency
  //#then an error "status_violation" is returned
  it("detects unconscious agent performing action", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "[CHARACTER_NAME_MIRA] faints", agent: "[CHARACTER_NAME_MIRA]", order: 1, location: "para 1" },
        { id: "e2", description: "[CHARACTER_NAME_MIRA] swings her sword", agent: "[CHARACTER_NAME_MIRA]", order: 2, location: "para 2" },
      ],
      statuses: [
        { agent: "[CHARACTER_NAME_MIRA]", state: "unconscious", since: "e1" },
      ],
    });
    const results = checkEntity(graph);
    const violations = results.filter(r => r.rule === "status_violation");
    expect(violations.length).toBe(1);
    expect(violations[0].checker).toBe("EntityChecker");
    expect(violations[0].severity).toBe("error");
    expect(violations[0].evidence).toContain("e1");
    expect(violations[0].evidence).toContain("e2");
  });

  //#given an alive agent that performs actions
  //#when checking entity consistency
  //#then no error is returned
  it("returns no error for alive agent performing actions", () => {
    const graph = graphWith({
      events: [
        { id: "e1", description: "Elara wakes up", agent: "Elara", order: 1, location: "para 1" },
        { id: "e2", description: "Elara explores the cave", agent: "Elara", order: 2, location: "para 2" },
      ],
      statuses: [
        { agent: "Elara", state: "alive", since: "e1" },
      ],
    });
    const results = checkEntity(graph);
    expect(results).toEqual([]);
  });
});
