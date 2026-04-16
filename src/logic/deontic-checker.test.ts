import { describe, it, expect } from "bun:test";
import { checkDeontic } from "./deontic-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

describe("DeonticChecker", () => {
  //#given an empty graph
  //#when checking deontic logic
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkDeontic(createEmptyLogicGraph());
    expect(results).toEqual([]);
  });

  // === Obligation Checks ===

  //#given an obligation that was fulfilled
  //#when checking deontic logic
  //#then no error is returned
  it("returns no error for a fulfilled obligation", () => {
    const graph = graphWith({
      obligations: [
        { agent: "Elara", must: "protect the village", source: "sworn oath in paragraph 1", fulfilled: true },
      ],
    });
    const results = checkDeontic(graph);
    expect(results).toEqual([]);
  });

  //#given an obligation that was broken (fulfilled === false)
  //#when checking deontic logic
  //#then a broken_obligation error is returned
  it("detects broken obligation (fulfilled === false)", () => {
    const graph = graphWith({
      obligations: [
        { agent: "[CHARACTER_NAME_KAEL]", must: "return the artifact", source: "promise in paragraph 3", fulfilled: false },
      ],
    });
    const results = checkDeontic(graph);
    expect(results.length).toBe(1);
    expect(results[0].checker).toBe("DeonticChecker");
    expect(results[0].rule).toBe("broken_obligation");
    expect(results[0].severity).toBe("error");
    expect(results[0].message).toContain("[CHARACTER_NAME_KAEL]");
    expect(results[0].message).toContain("return the artifact");
    expect(results[0].evidence).toContain("[CHARACTER_NAME_KAEL]");
  });

  //#given an obligation not yet resolved (fulfilled === null)
  //#when checking deontic logic
  //#then no error is returned (pending resolution)
  it("returns no error for a null obligation (not yet resolved)", () => {
    const graph = graphWith({
      obligations: [
        { agent: "Elara", must: "find the lost key", source: "quest in paragraph 2", fulfilled: null },
      ],
    });
    const results = checkDeontic(graph);
    expect(results).toEqual([]);
  });

  // === Prohibition Checks ===

  //#given a prohibition that was violated without consequence acknowledged
  //#when checking deontic logic
  //#then a prohibition_violated error is returned
  it("detects prohibition violated without consequence", () => {
    const graph = graphWith({
      prohibitions: [
        {
          agent: "[CHARACTER_NAME_KAEL]",
          mustNot: "enter the forbidden chamber",
          source: "decree in paragraph 1",
          violated: true,
          consequenceAcknowledged: false,
        },
      ],
    });
    const results = checkDeontic(graph);
    expect(results.length).toBe(1);
    expect(results[0].checker).toBe("DeonticChecker");
    expect(results[0].rule).toBe("prohibition_violated");
    expect(results[0].severity).toBe("error");
    expect(results[0].message).toContain("[CHARACTER_NAME_KAEL]");
    expect(results[0].message).toContain("enter the forbidden chamber");
    expect(results[0].evidence).toContain("[CHARACTER_NAME_KAEL]");
  });

  //#given a prohibition that was violated but consequence was acknowledged
  //#when checking deontic logic
  //#then no error is returned
  it("returns no error when prohibition violated but consequence acknowledged", () => {
    const graph = graphWith({
      prohibitions: [
        {
          agent: "[CHARACTER_NAME_KAEL]",
          mustNot: "enter the forbidden chamber",
          source: "decree in paragraph 1",
          violated: true,
          consequenceAcknowledged: true,
        },
      ],
    });
    const results = checkDeontic(graph);
    expect(results).toEqual([]);
  });

  // === Ought-Implies-Can ===

  //#given an obligation for an action the agent cannot perform (established: "never")
  //#when checking deontic logic
  //#then an ought_implies_can warning is returned
  it("detects obligation for impossible action (ought-implies-can)", () => {
    const graph = graphWith({
      obligations: [
        { agent: "Elara", must: "fly across the chasm", source: "command in paragraph 5", fulfilled: null },
      ],
      abilities: [
        { agent: "Elara", can: "fly across the chasm", established: "never" },
      ],
    });
    const results = checkDeontic(graph);
    expect(results.length).toBe(1);
    expect(results[0].checker).toBe("DeonticChecker");
    expect(results[0].rule).toBe("ought_implies_can");
    expect(results[0].severity).toBe("warning");
    expect(results[0].message).toContain("Elara");
    expect(results[0].message).toContain("fly across the chasm");
    expect(results[0].evidence).toContain("Elara");
  });
});
