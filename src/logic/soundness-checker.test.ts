import { describe, it, expect } from "bun:test";
import { checkSoundness } from "./soundness-checker";
import { createEmptyLogicGraph } from "../types/logic-graph";
import type { LogicGraph } from "../types/logic-graph";

function graphWith(overrides: Partial<LogicGraph>): LogicGraph {
  return { ...createEmptyLogicGraph(), ...overrides };
}

describe("SoundnessChecker", () => {
  //#given an empty graph
  //#when checking soundness
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkSoundness(createEmptyLogicGraph());
    expect(results).toEqual([]);
  });

  //#given a well-supported conclusion with distinct premises
  //#when checking soundness
  //#then no errors are returned
  it("returns no errors for well-supported conclusions", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The suspect was seen at the crime scene", subject: "suspect", predicate: "at_scene", truth: true, location: "para 1" },
        { id: "p2", text: "The suspect had the victim's wallet", subject: "suspect", predicate: "had_wallet", truth: true, location: "para 2" },
      ],
      conclusions: [
        {
          claim: "The suspect is the murderer",
          premises: ["p1", "p2"],
          inferenceType: "modus_ponens",
          location: "para 3",
        },
      ],
    });
    const results = checkSoundness(graph);
    expect(results).toEqual([]);
  });

  // === Vacuous Deduction ===

  //#given a conclusion whose premise is trivially obvious relative to the conclusion
  //#when checking soundness
  //#then a vacuous_deduction warning is returned
  it("detects vacuous deduction (tautological premise)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The glass with water is wet", subject: "glass", predicate: "wet", truth: true, location: "para 1" },
      ],
      conclusions: [
        {
          claim: "He drank the water from the glass",
          premises: ["p1"],
          inferenceType: "other",
          location: "para 2",
        },
      ],
    });
    const results = checkSoundness(graph);
    const vacuous = results.filter(r => r.rule === "vacuous_deduction");
    expect(vacuous.length).toBe(1);
    expect(vacuous[0].checker).toBe("SoundnessChecker");
    expect(vacuous[0].severity).toBe("warning");
  });

  //#given a conclusion whose premise restates the conclusion itself
  //#when checking soundness
  //#then a circular_reasoning error is returned
  it("detects circular reasoning (premise restates conclusion)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "It was a mystery because they did not know the answer", subject: "mystery", predicate: "unknown", truth: true, location: "para 1" },
      ],
      conclusions: [
        {
          claim: "They did not know the answer because it was a mystery",
          premises: ["p1"],
          inferenceType: "other",
          location: "para 2",
        },
      ],
    });
    const results = checkSoundness(graph);
    const circular = results.filter(r => r.rule === "circular_reasoning");
    expect(circular.length).toBe(1);
    expect(circular[0].checker).toBe("SoundnessChecker");
    expect(circular[0].severity).toBe("error");
  });

  // === Non-Sequitur Reasoning ===

  //#given a conclusion whose premises have almost no keyword overlap with the claim
  //#when checking soundness
  //#then a non_sequitur warning is returned
  it("detects non-sequitur reasoning (premises unrelated to claim)", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "Avocados were on the grocery list", subject: "grocery_list", predicate: "has_avocados", truth: true, location: "para 1" },
      ],
      conclusions: [
        {
          claim: "This meeting was deeply personal and emotional",
          premises: ["p1"],
          inferenceType: "other",
          location: "para 3",
        },
      ],
    });
    const results = checkSoundness(graph);
    const nonSeq = results.filter(r => r.rule === "non_sequitur");
    expect(nonSeq.length).toBe(1);
    expect(nonSeq[0].checker).toBe("SoundnessChecker");
    expect(nonSeq[0].severity).toBe("warning");
  });

  //#given a conclusion with multiple unrelated premises
  //#when checking soundness
  //#then a non_sequitur warning is returned
  it("detects non-sequitur with multiple unrelated premises", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The sky was blue today", subject: "sky", predicate: "blue", truth: true, location: "para 1" },
        { id: "p2", text: "Birds were singing in the trees", subject: "birds", predicate: "singing", truth: true, location: "para 1" },
      ],
      conclusions: [
        {
          claim: "The bridge would collapse under the weight",
          premises: ["p1", "p2"],
          inferenceType: "other",
          location: "para 5",
        },
      ],
    });
    const results = checkSoundness(graph);
    const nonSeq = results.filter(r => r.rule === "non_sequitur");
    expect(nonSeq.length).toBe(1);
  });

  // === Circular Reasoning ===

  //#given a conclusion with a premise that uses nearly identical wording
  //#when checking soundness
  //#then a circular_reasoning error is returned
  it("detects circular reasoning with high word overlap", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "The king was a wise ruler who governed justly", subject: "king", predicate: "wise", truth: true, location: "para 1" },
      ],
      conclusions: [
        {
          claim: "The ruler governed justly because the king was wise",
          premises: ["p1"],
          inferenceType: "other",
          location: "para 2",
        },
      ],
    });
    const results = checkSoundness(graph);
    const circular = results.filter(r => r.rule === "circular_reasoning");
    expect(circular.length).toBe(1);
    expect(circular[0].severity).toBe("error");
  });

  // === Edge Cases ===

  //#given a conclusion with no resolvable premises (premise ids not in propositions)
  //#when checking soundness
  //#then no soundness error (handled by PropositionalChecker as unsupported)
  it("skips conclusions with unresolvable premises", () => {
    const graph = graphWith({
      conclusions: [
        {
          claim: "Therefore the kingdom fell",
          premises: ["p_nonexistent"],
          inferenceType: "other",
          location: "para 1",
        },
      ],
    });
    const results = checkSoundness(graph);
    // SoundnessChecker can't analyze what it can't resolve
    expect(results).toEqual([]);
  });

  //#given conclusions already flagged as unsupported (no premises)
  //#when checking soundness
  //#then no additional soundness errors (already caught by PropositionalChecker)
  it("does not double-flag conclusions with empty premises", () => {
    const graph = graphWith({
      conclusions: [
        {
          claim: "The world was saved",
          premises: [],
          inferenceType: "unsupported",
          location: "para 1",
        },
      ],
    });
    const results = checkSoundness(graph);
    expect(results).toEqual([]);
  });

  //#given a conclusion with multiple strong premises
  //#when checking soundness
  //#then no errors are returned
  it("does not flag conclusions with strong multi-premise support", () => {
    const graph = graphWith({
      propositions: [
        { id: "p1", text: "Blood was found on the suspect's shirt", subject: "suspect", predicate: "blood_on_shirt", truth: true, location: "para 1" },
        { id: "p2", text: "The suspect was at the crime scene that night", subject: "suspect", predicate: "at_scene", truth: true, location: "para 2" },
        { id: "p3", text: "The suspect had motive to commit the crime", subject: "suspect", predicate: "had_motive", truth: true, location: "para 3" },
      ],
      conclusions: [
        {
          claim: "The suspect committed the crime at the scene that night",
          premises: ["p1", "p2", "p3"],
          inferenceType: "modus_ponens",
          location: "para 4",
        },
      ],
    });
    const results = checkSoundness(graph);
    expect(results).toEqual([]);
  });
});
