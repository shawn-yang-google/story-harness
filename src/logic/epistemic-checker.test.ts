import { describe, it, expect } from "bun:test";
import { checkEpistemic } from "./epistemic-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

describe("EpistemicChecker", () => {
  //#given an empty graph
  //#when checking epistemic logic
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkEpistemic(createEmptyLogicGraph());
    expect(results).toEqual([]);
  });

  // === Psychic Knowledge ===

  //#given a knowledge entry with how: "witnessed"
  //#when checking epistemic logic
  //#then no error is returned
  it("returns no error for knowledge with how: 'witnessed'", () => {
    const graph = graphWith({
      knowledge: [
        { agent: "Elara", knows: "the bridge collapsed", since: "e1", how: "witnessed" },
      ],
      events: [
        { id: "e1", description: "Elara sees the bridge collapse", agent: "Elara", order: 1, location: "para 1" },
      ],
    });
    const results = checkEpistemic(graph);
    expect(results).toEqual([]);
  });

  //#given a knowledge entry with how: "unexplained"
  //#when checking epistemic logic
  //#then an error with rule "psychic_knowledge" is returned
  it("flags knowledge with how: 'unexplained' as psychic_knowledge", () => {
    const graph = graphWith({
      knowledge: [
        { agent: "[CHARACTER_NAME_KAEL]", knows: "the villain's plan", since: "e1", how: "unexplained" },
      ],
      events: [
        { id: "e1", description: "[CHARACTER_NAME_KAEL] reveals the plan", agent: "[CHARACTER_NAME_KAEL]", order: 1, location: "para 3" },
      ],
    });
    const results = checkEpistemic(graph);
    expect(results.length).toBe(1);
    expect(results[0].checker).toBe("EpistemicChecker");
    expect(results[0].rule).toBe("psychic_knowledge");
    expect(results[0].severity).toBe("error");
    expect(results[0].message).toContain("[CHARACTER_NAME_KAEL]");
    expect(results[0].message).toContain("the villain's plan");
  });

  // === Unestablished Ability ===

  //#given an ability with established: "backstory"
  //#when checking epistemic logic
  //#then no error is returned
  it("returns no error for ability with established: 'backstory'", () => {
    const graph = graphWith({
      abilities: [
        { agent: "Elara", can: "swim", established: "backstory" },
      ],
      events: [
        { id: "e1", description: "Elara swims across the river", agent: "Elara", order: 1, location: "para 2" },
      ],
    });
    const results = checkEpistemic(graph);
    expect(results).toEqual([]);
  });

  //#given an ability with established: "never" and the agent uses it in an event
  //#when checking epistemic logic
  //#then an error with rule "unestablished_ability" is returned
  it("flags ability with established: 'never' as unestablished_ability", () => {
    const graph = graphWith({
      abilities: [
        { agent: "[CHARACTER_NAME_KAEL]", can: "cast fire magic", established: "never" },
      ],
      events: [
        { id: "e1", description: "[CHARACTER_NAME_KAEL] decides to cast fire magic at the enemy", agent: "[CHARACTER_NAME_KAEL]", order: 1, location: "para 5" },
      ],
    });
    const results = checkEpistemic(graph);
    expect(results.length).toBe(1);
    expect(results[0].checker).toBe("EpistemicChecker");
    expect(results[0].rule).toBe("unestablished_ability");
    expect(results[0].severity).toBe("error");
    expect(results[0].message).toContain("[CHARACTER_NAME_KAEL]");
    expect(results[0].message).toContain("cast fire magic");
  });

  // === Multiple Psychic Knowledge Entries ===

  //#given multiple knowledge entries with how: "unexplained"
  //#when checking epistemic logic
  //#then all are flagged as errors
  it("flags all psychic knowledge entries", () => {
    const graph = graphWith({
      knowledge: [
        { agent: "[CHARACTER_NAME_KAEL]", knows: "the villain's plan", since: "e1", how: "unexplained" },
        { agent: "Elara", knows: "the hidden treasure location", since: "e2", how: "unexplained" },
        { agent: "[CHARACTER_NAME_KAEL]", knows: "the bridge collapsed", since: "e3", how: "told" },
      ],
      events: [
        { id: "e1", description: "[CHARACTER_NAME_KAEL] reveals the plan", agent: "[CHARACTER_NAME_KAEL]", order: 1, location: "para 1" },
        { id: "e2", description: "Elara finds the treasure", agent: "Elara", order: 2, location: "para 2" },
        { id: "e3", description: "[CHARACTER_NAME_KAEL] is told about the bridge", agent: "[CHARACTER_NAME_KAEL]", order: 3, location: "para 3" },
      ],
    });
    const results = checkEpistemic(graph);
    const psychicErrors = results.filter(r => r.rule === "psychic_knowledge");
    expect(psychicErrors.length).toBe(2);
    expect(psychicErrors.some(r => r.message.includes("[CHARACTER_NAME_KAEL]"))).toBe(true);
    expect(psychicErrors.some(r => r.message.includes("Elara"))).toBe(true);
  });

  // === Knowledge Before Learning ===

  //#given knowledge learned at event e3 (order 3) but used by the agent at event e1 (order 1)
  //#when checking epistemic logic
  //#then an error with rule "knowledge_before_learning" is returned
  it("flags knowledge used before the learning event", () => {
    const graph = graphWith({
      knowledge: [
        { agent: "[CHARACTER_NAME_KAEL]", knows: "the secret passage", since: "e3", how: "told" },
      ],
      events: [
        { id: "e1", description: "[CHARACTER_NAME_KAEL] uses the secret passage to escape", agent: "[CHARACTER_NAME_KAEL]", order: 1, location: "para 1" },
        { id: "e3", description: "[CHARACTER_NAME_KAEL] is told about the secret passage", agent: "[CHARACTER_NAME_KAEL]", order: 3, location: "para 5" },
      ],
    });
    const results = checkEpistemic(graph);
    const timeErrors = results.filter(r => r.rule === "knowledge_before_learning");
    expect(timeErrors.length).toBe(1);
    expect(timeErrors[0].checker).toBe("EpistemicChecker");
    expect(timeErrors[0].severity).toBe("error");
    expect(timeErrors[0].message).toContain("[CHARACTER_NAME_KAEL]");
    expect(timeErrors[0].message).toContain("the secret passage");
    expect(timeErrors[0].evidence).toContain("e1");
    expect(timeErrors[0].evidence).toContain("e3");
  });

  //#given knowledge learned at event e1 (order 1) and used at event e3 (order 3)
  //#when checking epistemic logic
  //#then no error (correct temporal order)
  it("does not flag knowledge used after the learning event", () => {
    const graph = graphWith({
      knowledge: [
        { agent: "[CHARACTER_NAME_KAEL]", knows: "the secret passage", since: "e1", how: "told" },
      ],
      events: [
        { id: "e1", description: "[CHARACTER_NAME_KAEL] is told about the secret passage", agent: "[CHARACTER_NAME_KAEL]", order: 1, location: "para 1" },
        { id: "e3", description: "[CHARACTER_NAME_KAEL] uses the secret passage to escape", agent: "[CHARACTER_NAME_KAEL]", order: 3, location: "para 5" },
      ],
    });
    const results = checkEpistemic(graph);
    expect(results).toEqual([]);
  });

  // === Unestablished Ability — agent doesn't use it ===

  //#given an ability with established: "never" but no events reference the agent using it
  //#when checking epistemic logic
  //#then no error (ability not exercised)
  it("does not flag unestablished ability if agent never uses it in events", () => {
    const graph = graphWith({
      abilities: [
        { agent: "[CHARACTER_NAME_KAEL]", can: "fly", established: "never" },
      ],
      events: [
        { id: "e1", description: "[CHARACTER_NAME_KAEL] walks to the market", agent: "[CHARACTER_NAME_KAEL]", order: 1, location: "para 1" },
      ],
    });
    const results = checkEpistemic(graph);
    expect(results).toEqual([]);
  });
});
