import { describe, it, expect } from "bun:test";
import { checkPropositional } from "./propositional-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

describe("PropositionalChecker", () => {
  //#given an empty graph
  //#when checking propositional logic
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkPropositional(createEmptyLogicGraph());
    expect(results).toEqual([]);
  });

  //#given propositions with no conflicts
  //#when checking propositional logic
  //#then no errors are returned
  it("returns no errors when propositions are consistent", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "Elara is brave", subject: "Elara", predicate: "brave", truth: true, location: "para 1" },
        { id: "p2", text: "[CHARACTER_NAME_KAEL] is tall", subject: "[CHARACTER_NAME_KAEL]", predicate: "tall", truth: true, location: "para 1" },
      ],
    });
    const results = checkPropositional(graph);
    expect(results).toEqual([]);
  });

  // === Contradiction Detection (P ∧ ¬P) ===

  //#given two propositions with same subject+predicate but opposite truth
  //#when checking propositional logic
  //#then a contradiction error is returned
  it("detects direct contradiction (P ∧ ¬P) at the same location", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "Elara is afraid of the dark", subject: "Elara", predicate: "afraid_of_dark", truth: true, location: "paragraph 1" },
        { id: "p2", text: "Elara is not afraid of the dark", subject: "Elara", predicate: "afraid_of_dark", truth: false, location: "paragraph 1" },
      ],
    });
    const results = checkPropositional(graph);
    expect(results.length).toBe(1);
    expect(results[0].checker).toBe("PropositionalChecker");
    expect(results[0].rule).toBe("contradiction");
    expect(results[0].severity).toBe("error");
    expect(results[0].evidence).toContain("p1");
    expect(results[0].evidence).toContain("p2");
  });

  //#given opposite propositions at different paragraphs
  //#when checking propositional logic
  //#then no error (state change over time, not a contradiction)
  it("does not flag state changes across different paragraphs", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "He was alone", subject: "Arthur", predicate: "alone", truth: true, location: "paragraph 7" },
        { id: "p2", text: "He was no longer alone", subject: "Arthur", predicate: "alone", truth: false, location: "paragraph 9" },
      ],
    });
    const results = checkPropositional(graph);
    expect(results).toEqual([]);
  });

  //#given contradictions for different subjects
  //#when checking propositional logic
  //#then no error (different subjects are independent)
  it("does not flag contradictions across different subjects", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "Elara is brave", subject: "Elara", predicate: "brave", truth: true, location: "para 1" },
        { id: "p2", text: "[CHARACTER_NAME_KAEL] is not brave", subject: "[CHARACTER_NAME_KAEL]", predicate: "brave", truth: false, location: "para 2" },
      ],
    });
    const results = checkPropositional(graph);
    expect(results).toEqual([]);
  });

  //#given multiple contradictions
  //#when checking propositional logic
  //#then all contradictions are reported
  it("detects multiple contradictions", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "Elara is brave", subject: "Elara", predicate: "brave", truth: true, location: "paragraph 1" },
        { id: "p2", text: "Elara is not brave", subject: "Elara", predicate: "brave", truth: false, location: "paragraph 1" },
        { id: "p3", text: "The door is locked", subject: "door", predicate: "locked", truth: true, location: "paragraph 2" },
        { id: "p4", text: "The door is unlocked", subject: "door", predicate: "locked", truth: false, location: "paragraph 2" },
      ],
    });
    const results = checkPropositional(graph);
    const contradictions = results.filter(r => r.rule === "contradiction");
    expect(contradictions.length).toBe(2);
  });

  // === Modus Ponens (P→Q, P ⊢ Q) ===

  //#given a rule P→Q where P is true and Q is true
  //#when checking propositional logic
  //#then no error (valid modus ponens)
  it("validates correct modus ponens (P→Q, P true, Q true)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "He was bitten", subject: "hero", predicate: "bitten", truth: true, location: "para 1" },
        { id: "p2", text: "He turned into a werewolf", subject: "hero", predicate: "werewolf", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkPropositional(graph);
    expect(results).toEqual([]);
  });

  //#given a rule P→Q where P is true but Q is false
  //#when checking propositional logic
  //#then a modus_ponens_violation error is returned
  it("detects modus ponens violation (P→Q, P true, Q false)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "He was bitten", subject: "hero", predicate: "bitten", truth: true, location: "para 1" },
        { id: "p2", text: "He did not turn", subject: "hero", predicate: "werewolf", truth: false, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkPropositional(graph);
    // Single broken_conditional (MP and MT are the same violation, deduplicated)
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("broken_conditional");
  });

  //#given a rule P→Q where P is false
  //#when checking propositional logic
  //#then no error (antecedent not triggered)
  it("does not flag modus ponens when antecedent is false", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "He was not bitten", subject: "hero", predicate: "bitten", truth: false, location: "para 1" },
        { id: "p2", text: "He is human", subject: "hero", predicate: "werewolf", truth: false, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkPropositional(graph);
    expect(results).toEqual([]);
  });

  // === Modus Tollens (P→Q, ¬Q ⊢ ¬P) ===

  //#given a rule P→Q where Q is false but P is true
  //#when checking propositional logic
  //#then a modus_tollens_violation is returned
  it("detects modus tollens violation (P→Q, Q false, P true)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "She drank the poison", subject: "queen", predicate: "drank_poison", truth: true, location: "para 1" },
        { id: "p2", text: "She is alive and healthy", subject: "queen", predicate: "sick", truth: false, location: "para 3" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkPropositional(graph);
    // This is the same condition (P true, Q false) — reported as broken_conditional
    const violations = results.filter(r => r.rule === "broken_conditional");
    expect(violations.length).toBe(1);
  });

  // === Affirming the Consequent (Fallacy: P→Q, Q ⊬ P) ===

  //#given a conclusion that affirms the consequent
  //#when checking propositional logic
  //#then a fallacy warning is returned
  it("flags affirming the consequent fallacy", () => {
    const graph = graphWith({
      conclusions: [
        {
          claim: "He must have been bitten",
          premises: ["p2"],
          inferenceType: "affirming_consequent",
          location: "para 4",
        },
      ],
    });
    const results = checkPropositional(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("affirming_consequent");
    expect(results[0].severity).toBe("warning"); // Downgraded: abductive reasoning is valid in narratives
  });

  // === Denying the Antecedent (Fallacy: P→Q, ¬P ⊬ ¬Q) ===

  //#given a conclusion that denies the antecedent
  //#when checking propositional logic
  //#then a fallacy warning is returned
  it("flags denying the antecedent fallacy", () => {
    const graph = graphWith({
      conclusions: [
        {
          claim: "He won't turn because he wasn't bitten",
          premises: ["p1"],
          inferenceType: "denying_antecedent",
          location: "para 5",
        },
      ],
    });
    const results = checkPropositional(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("denying_antecedent");
    expect(results[0].severity).toBe("error");
  });

  // === Unsupported Conclusions ===

  //#given a conclusion with no premises
  //#when checking propositional logic
  //#then an unsupported_conclusion error is returned
  it("flags conclusions with no premises", () => {
    const graph = graphWith({
      conclusions: [
        {
          claim: "Therefore the kingdom was saved",
          premises: [],
          inferenceType: "unsupported",
          location: "para 6",
        },
      ],
    });
    const results = checkPropositional(graph);
    expect(results.length).toBe(1);
    expect(results[0].rule).toBe("unsupported_conclusion");
    expect(results[0].severity).toBe("error");
  });

  //#given a conclusion with valid premises and valid inference type
  //#when checking propositional logic
  //#then no error
  it("does not flag well-supported conclusions", () => {
    const graph = graphWith({
      conclusions: [
        {
          claim: "He turned into a werewolf",
          premises: ["p1", "r1"],
          inferenceType: "modus_ponens",
          location: "para 3",
        },
      ],
    });
    const results = checkPropositional(graph);
    expect(results).toEqual([]);
  });

  // === Biconditional Rules (P↔Q) ===

  //#given a biconditional P↔Q where P is true but Q is false
  //#when checking propositional logic
  //#then violation is detected in both directions
  it("detects biconditional violation (P↔Q, P true, Q false)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The seal is broken", subject: "seal", predicate: "broken", truth: true, location: "para 1" },
        { id: "p2", text: "The demon is not released", subject: "demon", predicate: "released", truth: false, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "biconditional", source: "lore", location: "lore" },
      ],
    });
    const results = checkPropositional(graph);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // At minimum, forward direction (P→Q violated) should be caught
    expect(results.some(r => r.rule === "broken_conditional")).toBe(true);
  });

  //#given a biconditional P↔Q where Q is true but P is false
  //#when checking propositional logic
  //#then the reverse direction violation is detected
  it("detects biconditional reverse violation (P↔Q, Q true, P false)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The seal is intact", subject: "seal", predicate: "broken", truth: false, location: "para 1" },
        { id: "p2", text: "The demon is released", subject: "demon", predicate: "released", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "biconditional", source: "lore", location: "lore" },
      ],
    });
    const results = checkPropositional(graph);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
