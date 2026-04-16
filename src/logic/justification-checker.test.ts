import { describe, it, expect } from "bun:test";
import { checkJustification } from "./justification-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

describe("JustificationChecker", () => {
  //#given an empty graph
  //#when checking justifications
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkJustification(createEmptyLogicGraph());
    expect(results).toEqual([]);
  });

  //#given well-justified causal rules
  //#when checking justifications
  //#then no errors are returned
  it("returns no errors for well-justified causal rules", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "He wore gloves to preserve fingerprint evidence", subject: "detective", predicate: "wore_gloves", truth: true, location: "para 1" },
        { id: "p2", text: "The crime scene evidence was preserved", subject: "evidence", predicate: "preserved", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkJustification(graph);
    expect(results).toEqual([]);
  });

  // === Absurd Causal Claims ===

  //#given a rule where the antecedent doesn't logically support the consequent's domain
  //#when checking justifications
  //#then an absurd_causal_claim warning is returned
  it("detects absurd causal claims (domain mismatch)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "His hands were already tough from years of work", subject: "detective", predicate: "tough_hands", truth: true, location: "para 1" },
        { id: "p2", text: "He did not put on gloves at the crime scene", subject: "detective", predicate: "no_gloves", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkJustification(graph);
    const absurd = results.filter(r => r.rule === "absurd_causal_claim");
    expect(absurd.length).toBe(1);
    expect(absurd[0].checker).toBe("JustificationChecker");
    expect(absurd[0].severity).toBe("warning");
  });

  //#given a rule where physical endurance justifies skipping safety equipment
  //#when checking justifications
  //#then an absurd_causal_claim warning is returned
  it("detects absurd causal claims about safety equipment", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "She was strong enough to withstand the heat", subject: "worker", predicate: "heat_resistant", truth: true, location: "para 1" },
        { id: "p2", text: "She did not wear protective gear in the furnace room", subject: "worker", predicate: "no_gear", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkJustification(graph);
    const absurd = results.filter(r => r.rule === "absurd_causal_claim");
    expect(absurd.length).toBe(1);
  });

  // === Tautological Explanations ===

  //#given a rule where the antecedent restates the consequent
  //#when checking justifications
  //#then a tautological_explanation warning is returned
  it("detects tautological explanations", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "It was a mystery because they did not know what happened", subject: "mystery", predicate: "unknown", truth: true, location: "para 1" },
        { id: "p2", text: "They did not know what happened", subject: "investigators", predicate: "ignorant", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkJustification(graph);
    const tautological = results.filter(r => r.rule === "tautological_explanation");
    expect(tautological.length).toBe(1);
    expect(tautological[0].checker).toBe("JustificationChecker");
    expect(tautological[0].severity).toBe("warning");
  });

  //#given a rule where premise and consequent share almost all words
  //#when checking justifications
  //#then a tautological_explanation warning is returned
  it("detects tautological explanations with high word overlap", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The war was inevitable because conflict could not be avoided", subject: "war", predicate: "inevitable", truth: true, location: "para 1" },
        { id: "p2", text: "Conflict could not be avoided", subject: "conflict", predicate: "unavoidable", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkJustification(graph);
    const tautological = results.filter(r => r.rule === "tautological_explanation");
    expect(tautological.length).toBe(1);
  });

  // === Category Errors ===

  //#given a rule where the justification confuses the purpose of an action
  //#when checking justifications
  //#then a category_error warning is returned
  it("detects category errors in justifications", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The bridge was beautiful and elegant", subject: "bridge", predicate: "beautiful", truth: true, location: "para 1" },
        { id: "p2", text: "The bridge could support heavy truck traffic", subject: "bridge", predicate: "load_bearing", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkJustification(graph);
    const catErr = results.filter(r => r.rule === "category_error");
    expect(catErr.length).toBe(1);
    expect(catErr[0].checker).toBe("JustificationChecker");
    expect(catErr[0].severity).toBe("warning");
  });

  // === Edge Cases ===

  //#given rules with lore or world_rule source
  //#when checking justifications
  //#then no errors (lore rules are accepted as-is)
  it("does not flag rules from lore sources", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The dragon breathed fire", subject: "dragon", predicate: "fire_breathing", truth: true, location: "para 1" },
        { id: "p2", text: "The castle walls melted", subject: "castle", predicate: "melted", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "lore", location: "lore" },
      ],
    });
    const results = checkJustification(graph);
    expect(results).toEqual([]);
  });

  //#given rules where both propositions can't be resolved
  //#when checking justifications
  //#then no errors (can't analyze unresolvable rules)
  it("skips rules with unresolvable propositions", () => {
    const graph = graphWith({
      rules: [
        { id: "r1", antecedent: "p_missing1", consequent: "p_missing2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkJustification(graph);
    expect(results).toEqual([]);
  });

  //#given a rule with reasonable domain alignment
  //#when checking justifications
  //#then no errors are returned
  it("does not flag rules with reasonable domain alignment", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The lock was old and rusty", subject: "lock", predicate: "old_rusty", truth: true, location: "para 1" },
        { id: "p2", text: "The lock broke easily under force", subject: "lock", predicate: "broke_easily", truth: true, location: "para 2" },
      ],
      rules: [
        { id: "r1", antecedent: "p1", consequent: "p2", type: "conditional", source: "narrative", location: "para 1" },
      ],
    });
    const results = checkJustification(graph);
    expect(results).toEqual([]);
  });
});
