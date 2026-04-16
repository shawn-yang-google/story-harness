import { describe, it, expect } from "bun:test";
import {
  buildValidationPrompt,
  applyGraphPatches,
} from "./graph-validator";
import { createEmptyLogicGraph, type LogicGraph } from "../types/logic-graph";

describe("GraphValidator", () => {
  describe("buildValidationPrompt", () => {
    //#given a draft and an extracted graph
    //#when building the validation prompt
    //#then it includes both the draft text and the graph JSON
    it("includes draft and graph in prompt", () => {
      const draft = "Elara dove into the lake.";
      const graph = createEmptyLogicGraph();
      graph.propositions.push({
        id: "p1",
        text: "Elara dove into the lake",
        subject: "Elara",
        predicate: "dove_into_lake",
        truth: true,
        location: "sentence 1",
      });

      const prompt = buildValidationPrompt(draft, graph);
      expect(prompt).toContain("Elara dove into the lake.");
      expect(prompt).toContain('"p1"');
      expect(prompt).toContain("dove_into_lake");
    });

    //#given any draft and graph
    //#when building the validation prompt
    //#then it instructs the validator to check for missing propositions and state changes
    it("includes validation instructions", () => {
      const prompt = buildValidationPrompt("test", createEmptyLogicGraph());
      expect(prompt).toContain("missing");
      expect(prompt).toContain("propositions");
      expect(prompt).toContain("state");
    });

    //#given any draft and graph
    //#when building the validation prompt
    //#then it asks for JSON patch output
    it("requests JSON patch format", () => {
      const prompt = buildValidationPrompt("test", createEmptyLogicGraph());
      expect(prompt).toContain("JSON");
      expect(prompt).toContain("addPropositions");
    });
  });

  describe("applyGraphPatches", () => {
    //#given an empty patch response (no corrections needed)
    //#when applying patches
    //#then the graph is returned unchanged
    it("returns graph unchanged for empty patches", () => {
      const graph = createEmptyLogicGraph();
      graph.propositions.push({
        id: "p1",
        text: "test",
        subject: "a",
        predicate: "b",
        truth: true,
        location: "l",
      });

      const result = applyGraphPatches(graph, "{}");
      expect(result.propositions.length).toBe(1);
      expect(result.propositions[0].id).toBe("p1");
    });

    //#given a patch that adds new propositions
    //#when applying patches
    //#then the new propositions are appended to the graph
    it("adds new propositions from patch", () => {
      const graph = createEmptyLogicGraph();
      graph.propositions.push({
        id: "p1",
        text: "existing",
        subject: "a",
        predicate: "b",
        truth: true,
        location: "l",
      });

      const patch = JSON.stringify({
        addPropositions: [
          {
            id: "p2",
            text: "rain stopped instantly",
            subject: "weather",
            predicate: "rain_stopped",
            truth: true,
            location: "paragraph 1",
          },
        ],
      });

      const result = applyGraphPatches(graph, patch);
      expect(result.propositions.length).toBe(2);
      expect(result.propositions[1].id).toBe("p2");
      expect(result.propositions[1].text).toBe("rain stopped instantly");
    });

    //#given a patch that adds new state changes
    //#when applying patches
    //#then the new state changes are appended
    it("adds new state changes from patch", () => {
      const graph = createEmptyLogicGraph();

      const patch = JSON.stringify({
        addStateChanges: [
          {
            entity: "weather",
            attribute: "precipitation",
            from: "heavy rain",
            to: "sunny",
            atEvent: "e1",
          },
        ],
      });

      const result = applyGraphPatches(graph, patch);
      expect(result.stateChanges.length).toBe(1);
      expect(result.stateChanges[0].entity).toBe("weather");
      expect(result.stateChanges[0].from).toBe("heavy rain");
    });

    //#given a patch that adds new events
    //#when applying patches
    //#then the new events are appended
    it("adds new events from patch", () => {
      const graph = createEmptyLogicGraph();

      const patch = JSON.stringify({
        addEvents: [
          {
            id: "e5",
            description: "weather changed instantly",
            agent: "environment",
            order: 1,
            location: "paragraph 1",
          },
        ],
      });

      const result = applyGraphPatches(graph, patch);
      expect(result.events.length).toBe(1);
      expect(result.events[0].id).toBe("e5");
    });

    //#given a patch that reclassifies a conclusion's inference type
    //#when applying patches
    //#then the conclusion's inferenceType is updated
    it("reclassifies conclusion inference types", () => {
      const graph = createEmptyLogicGraph();
      graph.conclusions.push({
        claim: "he drank recently",
        premises: ["p1"],
        inferenceType: "modus_ponens",
        location: "paragraph 5",
      });

      const patch = JSON.stringify({
        reclassifyConclusions: [
          {
            claim: "he drank recently",
            newInferenceType: "affirming_consequent",
          },
        ],
      });

      const result = applyGraphPatches(graph, patch);
      expect(result.conclusions[0].inferenceType).toBe("affirming_consequent");
    });

    //#given a patch that adds world rules
    //#when applying patches
    //#then the new world rules are appended
    it("adds new world rules from patch", () => {
      const graph = createEmptyLogicGraph();

      const patch = JSON.stringify({
        addWorldRules: [
          {
            rule: "Weather cannot change instantly without a magical or environmental cause",
            type: "necessary",
            source: "common_sense_physics",
          },
        ],
      });

      const result = applyGraphPatches(graph, patch);
      expect(result.worldRules.length).toBe(1);
      expect(result.worldRules[0].source).toBe("common_sense_physics");
    });

    //#given an unparseable patch response
    //#when applying patches
    //#then the graph is returned unchanged
    it("returns graph unchanged for unparseable response", () => {
      const graph = createEmptyLogicGraph();
      graph.propositions.push({
        id: "p1",
        text: "test",
        subject: "a",
        predicate: "b",
        truth: true,
        location: "l",
      });

      const result = applyGraphPatches(graph, "not json at all");
      expect(result.propositions.length).toBe(1);
    });

    //#given a "NO_CHANGES" response
    //#when applying patches
    //#then the graph is returned unchanged
    it("handles NO_CHANGES response", () => {
      const graph = createEmptyLogicGraph();
      const result = applyGraphPatches(graph, "NO_CHANGES");
      expect(result).toEqual(graph);
    });

    //#given a patch with multiple additions across categories
    //#when applying patches
    //#then all categories are updated
    it("applies patches across multiple categories", () => {
      const graph = createEmptyLogicGraph();

      const patch = JSON.stringify({
        addPropositions: [
          { id: "p1", text: "rain stopped", subject: "weather", predicate: "rain", truth: false, location: "s1" },
        ],
        addStateChanges: [
          { entity: "weather", attribute: "rain", from: "raining", to: "clear", atEvent: "e1" },
        ],
        addWorldRules: [
          { rule: "Rain requires time to stop", type: "necessary", source: "physics" },
        ],
      });

      const result = applyGraphPatches(graph, patch);
      expect(result.propositions.length).toBe(1);
      expect(result.stateChanges.length).toBe(1);
      expect(result.worldRules.length).toBe(1);
    });
  });
});
