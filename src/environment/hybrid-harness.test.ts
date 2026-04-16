import { describe, it, expect } from "bun:test";
import { parseLogicGraphResponse } from "./hybrid-harness";

describe("HybridHarness", () => {
  describe("parseLogicGraphResponse", () => {
    //#given a valid JSON string
    //#when parsing
    //#then it returns a LogicGraph
    it("parses valid JSON directly", () => {
      const json = JSON.stringify({
        propositions: [
          { id: "p1", text: "test", subject: "a", predicate: "b", truth: true, location: "l" },
        ],
        rules: [],
        conclusions: [],
        events: [],
        temporalConstraints: [],
        stateChanges: [],
        knowledge: [],
        abilities: [],
        obligations: [],
        prohibitions: [],
        worldRules: [],
        inventory: [],
        locations: [],
        statuses: [],
      });

      const result = parseLogicGraphResponse(json);
      expect(result.propositions.length).toBe(1);
      expect(result.propositions[0].id).toBe("p1");
    });

    //#given a JSON wrapped in markdown code block
    //#when parsing
    //#then it extracts and parses the JSON
    it("extracts JSON from markdown code block", () => {
      const inner = '{"propositions": [{"id": "p1", "text": "test", "subject": "a", "predicate": "b", "truth": true, "location": "l"}], "rules": [], "conclusions": [], "events": [], "temporalConstraints": [], "stateChanges": [], "knowledge": [], "abilities": [], "obligations": [], "prohibitions": [], "worldRules": [], "inventory": [], "locations": [], "statuses": []}';
      const response = "```json\n" + inner + "\n```";

      const result = parseLogicGraphResponse(response);
      expect(result.propositions.length).toBe(1);
    });

    //#given a response with text before and after JSON
    //#when parsing
    //#then it finds and parses the JSON object
    it("finds JSON within surrounding text", () => {
      const inner = '{"propositions": [], "rules": [], "conclusions": [], "events": [], "temporalConstraints": [], "stateChanges": [], "knowledge": [], "abilities": [], "obligations": [], "prohibitions": [], "worldRules": [], "inventory": [], "locations": [], "statuses": []}';
      const response = "Here is the analysis:\n" + inner + "\nDone.";

      const result = parseLogicGraphResponse(response);
      expect(result.propositions).toEqual([]);
      expect(result.events).toEqual([]);
    });

    //#given a partial JSON response missing some arrays
    //#when parsing
    //#then it fills in missing arrays with defaults
    it("fills missing arrays with defaults", () => {
      const json = JSON.stringify({
        propositions: [
          { id: "p1", text: "test", subject: "a", predicate: "b", truth: true, location: "l" },
        ],
      });

      const result = parseLogicGraphResponse(json);
      expect(result.propositions.length).toBe(1);
      expect(result.rules).toEqual([]);
      expect(result.events).toEqual([]);
      expect(result.knowledge).toEqual([]);
      expect(result.obligations).toEqual([]);
      expect(result.inventory).toEqual([]);
      expect(result.statuses).toEqual([]);
    });

    //#given a completely unparseable response
    //#when parsing
    //#then it returns an empty graph
    it("returns empty graph on total parse failure", () => {
      const result = parseLogicGraphResponse("This is not JSON at all.");
      expect(result.propositions).toEqual([]);
      expect(result.events).toEqual([]);
      expect(result.rules).toEqual([]);
    });

    //#given an empty string
    //#when parsing
    //#then it returns an empty graph
    it("handles empty string", () => {
      const result = parseLogicGraphResponse("");
      expect(result.propositions).toEqual([]);
    });
  });
});
