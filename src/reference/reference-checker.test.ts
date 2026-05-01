import { describe, it, expect } from "bun:test";
import { checkReferences, collectAllClaims } from "./reference-checker";
import type { ReferenceGraph } from "../types/reference-graph";
import { createEmptyReferenceGraph } from "../types/reference-graph";
import type { HarnessContext } from "../types";

function makeContext(loreDb: Record<string, any> = {}): HarnessContext {
  return {
    loreDb,
    previousBeats: [],
    targetAudience: "adult",
  };
}

describe("ReferenceChecker", () => {
  //#given an empty reference graph
  //#when we run all checks
  //#then it should return no results
  it("should return no results for an empty graph", () => {
    const graph = createEmptyReferenceGraph();
    const results = checkReferences(graph, makeContext());
    expect(results).toEqual([]);
  });

  describe("anachronism detection", () => {
    //#given a graph with an anachronism (smartphone = tech)
    //#when we check it
    //#then AnachronismChecker should return an error
    it("should flag anachronisms as errors", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        anachronisms: [
          {
            id: "anach1",
            element: "smartphone",
            storyTimePeriod: "1960s",
            actualTimePeriod: "2007+",
            description: "Smartphones did not exist in the 1960s",
            excerpt: "She pulled out her smartphone and checked the time",
            location: "paragraph 4",
            confidence: "high",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const anachronismErrors = results.filter(
        (r) => r.checker === "AnachronismChecker" && r.severity === "error"
      );

      expect(anachronismErrors.length).toBe(1);
      expect(anachronismErrors[0].message).toContain("smartphone");
      expect(anachronismErrors[0].message).toContain("1960s");
    });

    //#given multiple anachronisms
    //#then each should produce its own error
    it("should flag each anachronism separately", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        anachronisms: [
          {
            id: "anach1",
            element: "smartphone",
            storyTimePeriod: "1960s",
            actualTimePeriod: "2007+",
            description: "Smartphones did not exist",
            excerpt: "checked her smartphone",
            location: "paragraph 1",
            confidence: "high",
          },
          {
            id: "anach2",
            element: "internet slang LOL",
            storyTimePeriod: "1960s",
            actualTimePeriod: "1990s+",
            description: "Internet slang did not exist",
            excerpt: "he said LOL",
            location: "paragraph 3",
            confidence: "high",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const anachronismErrors = results.filter(
        (r) => r.checker === "AnachronismChecker" && r.severity === "error"
      );
      expect(anachronismErrors.length).toBe(2);
    });
  });

  describe("historical claims", () => {
    //#given a claim marked as inaccurate with high confidence
    //#then HistoricalChecker should flag it as an error
    it("should flag high-confidence inaccurate historical claims as errors", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        historical: [
          {
            id: "hist1",
            subject: "Cultural Revolution",
            timePeriod: "1958",
            claim: "The Cultural Revolution began in 1958",
            excerpt: "The Cultural Revolution began in 1958",
            location: "paragraph 1",
            confidence: "high",
            verdict: "inaccurate",
            correction: "The Cultural Revolution began in 1966, not 1958",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const errors = results.filter(
        (r) => r.checker === "HistoricalChecker" && r.rule === "inaccurate_date"
      );

      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe("error");
      expect(errors[0].message).toContain("1966");
    });

    //#given a partially accurate historical claim
    //#then it should be a warning
    it("should flag partially accurate historical claims as warnings", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        historical: [
          {
            id: "hist1",
            subject: "Napoleon",
            timePeriod: "early 19th century",
            claim: "Napoleon personally led every battle",
            excerpt: "Napoleon led every battle",
            location: "paragraph 3",
            confidence: "medium",
            verdict: "partially_accurate",
            correction: "Napoleon led many but delegated some to his marshals",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const warnings = results.filter(
        (r) => r.checker === "HistoricalChecker" && r.rule === "inaccurate_figure"
      );

      expect(warnings.length).toBe(1);
      expect(warnings[0].severity).toBe("warning");
    });
  });

  describe("scientific claims", () => {
    //#given a partially accurate scientific claim
    //#then ScientificChecker should flag it
    it("should flag partially accurate scientific claims as warnings", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        scientific: [
          {
            id: "sci1",
            domain: "astronomy",
            claim: "Proxima Centauri b is habitable",
            assertedAsFact: true,
            excerpt: "the habitable world of Proxima Centauri b",
            location: "paragraph 5",
            confidence: "medium",
            verdict: "partially_accurate",
            correction: "It orbits in the habitable zone but stellar flares likely make it inhospitable",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const outdated = results.filter(
        (r) => r.checker === "ScientificChecker" && r.rule === "outdated_science"
      );

      expect(outdated.length).toBe(1);
      expect(outdated[0].severity).toBe("warning");
      expect(outdated[0].message).toContain("stellar flares");
    });
  });

  describe("cross-reference consistency", () => {
    //#given conflicting claims in the graph
    //#then ConsistencyChecker should flag the inconsistency
    it("should detect internal inconsistencies", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        crossReferences: [
          {
            id: "xref1",
            claimIds: ["hist1", "hist2"],
            inconsistency:
              "Draft says the event happened in 1958 but also says it was during the Cultural Revolution which started in 1966",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const xrefs = results.filter(
        (r) => r.checker === "ConsistencyChecker" && r.rule === "cross_reference_conflict"
      );

      expect(xrefs.length).toBe(1);
      expect(xrefs[0].severity).toBe("error");
      expect(xrefs[0].evidence).toEqual(["hist1", "hist2"]);
    });
  });

  describe("source/loreDb consistency", () => {
    //#given a loreDb with reference facts
    //#when a claim contradicts a loreDb entry
    //#then SourceChecker should flag as a contradiction
    it("should detect contradictions with loreDb", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        claims: [
          {
            id: "ref1",
            category: "historical",
            excerpt: "The revolution started in the capital",
            claim: "The cultural revolution started in the capital",
            location: "paragraph 1",
            confidence: "high",
            reasoning: "Incorrect location",
            verdict: "inaccurate",
            correction: "It started in Beijing but was not confined to the capital",
          },
        ],
      };

      const context = makeContext({
        references: {
          "cultural revolution": "nationwide political movement 1966-1976",
        },
      });

      const results = checkReferences(graph, context);
      const loreConflicts = results.filter(
        (r) => r.checker === "SourceChecker" && r.rule === "contradicts_lore"
      );

      expect(loreConflicts.length).toBe(1);
      expect(loreConflicts[0].severity).toBe("error");
    });

    //#given an empty loreDb
    //#then no loreDb checks should fire
    it("should skip loreDb checks when loreDb is empty", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        claims: [
          {
            id: "ref1",
            category: "historical",
            excerpt: "some claim",
            claim: "some claim",
            location: "paragraph 1",
            confidence: "high",
            reasoning: "",
            verdict: "inaccurate",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const loreConflicts = results.filter(
        (r) => r.rule === "contradicts_lore"
      );
      expect(loreConflicts.length).toBe(0);
    });
  });

  describe("research needed", () => {
    //#given claims that need research
    //#then SourceChecker should produce a warning listing them
    it("should flag needs_research claims as warning", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        claims: [
          {
            id: "ref1",
            category: "cultural",
            excerpt: "The villagers performed the rain dance at midnight",
            claim: "Rain dances are performed at midnight in this region",
            location: "paragraph 2",
            confidence: "unverifiable",
            reasoning: "Very specific regional custom, cannot verify",
            verdict: "needs_research",
          },
          {
            id: "ref2",
            category: "linguistic",
            excerpt: "He spoke with the thick Sichuan drawl",
            claim: "Sichuan dialect has a distinctive drawl quality",
            location: "paragraph 5",
            confidence: "low",
            reasoning: "Limited knowledge of Sichuan dialect specifics",
            verdict: "needs_research",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const research = results.filter(
        (r) => r.checker === "SourceChecker" && r.rule === "research_needed"
      );

      expect(research.length).toBe(1);
      expect(research[0].severity).toBe("warning");
      expect(research[0].message).toContain("2 factual claim(s)");
      expect(research[0].evidence).toEqual(["ref1", "ref2"]);
    });
  });

  describe("cultural stereotyping", () => {
    //#given cultural claims with universalizing language
    //#then CulturalChecker should flag stereotyping
    it("should detect cultural stereotyping", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        cultural: [
          {
            id: "cul1",
            subject: "Japanese people",
            type: "custom",
            claim: "All Japanese people always bow when greeting",
            regionAndEra: "Japan, modern",
            excerpt: "All Japanese people always bowed deeply",
            location: "paragraph 3",
            confidence: "high",
            verdict: "accurate",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const stereotyping = results.filter(
        (r) => r.checker === "CulturalChecker" && r.rule === "stereotyping"
      );

      expect(stereotyping.length).toBe(1);
      expect(stereotyping[0].severity).toBe("warning");
      expect(stereotyping[0].message).toContain("universalizing");
    });
  });

  describe("collectAllClaims", () => {
    //#given claims spread across typed arrays
    //#then collectAllClaims should merge them into a flat list
    it("should collect claims from all typed arrays", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        claims: [
          {
            id: "ref1",
            category: "historical",
            excerpt: "x",
            claim: "claim1",
            location: "p1",
            confidence: "high",
            reasoning: "",
            verdict: "accurate",
          },
        ],
        historical: [
          {
            id: "hist1",
            subject: "WWII",
            timePeriod: "1939-1945",
            claim: "WWII lasted from 1939 to 1945",
            excerpt: "y",
            location: "p2",
            confidence: "high",
            verdict: "accurate",
          },
        ],
        geographic: [
          {
            id: "geo1",
            subject: "Alps",
            type: "terrain",
            claim: "The Alps span central Europe",
            excerpt: "z",
            location: "p3",
            confidence: "high",
            verdict: "accurate",
          },
        ],
      };

      const allClaims = collectAllClaims(graph);
      expect(allClaims.length).toBe(3);
      expect(allClaims.map((c) => c.id).sort()).toEqual(["geo1", "hist1", "ref1"]);
    });

    //#given duplicate IDs between claims and typed arrays
    //#then it should not duplicate them
    it("should not duplicate claims with same ID", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        claims: [
          {
            id: "ref1",
            category: "historical",
            excerpt: "x",
            claim: "claim1",
            location: "p1",
            confidence: "high",
            reasoning: "",
            verdict: "accurate",
          },
        ],
        historical: [
          {
            id: "ref1",
            subject: "same",
            timePeriod: "same",
            claim: "claim1",
            excerpt: "x",
            location: "p1",
            confidence: "high",
            verdict: "accurate",
          },
        ],
      };

      const allClaims = collectAllClaims(graph);
      expect(allClaims.length).toBe(1);
    });
  });

  describe("accurate claims", () => {
    //#given all claims are accurate
    //#then the checker should produce no errors
    it("should produce no errors for fully accurate graph", () => {
      const graph: ReferenceGraph = {
        ...createEmptyReferenceGraph(),
        claims: [
          {
            id: "ref1",
            category: "historical",
            excerpt: "The Cultural Revolution began in 1966",
            claim: "The Cultural Revolution began in 1966",
            location: "paragraph 1",
            confidence: "high",
            reasoning: "Well-known historical fact",
            verdict: "accurate",
          },
        ],
        scientific: [
          {
            id: "sci1",
            domain: "astronomy",
            claim: "Proxima Centauri is a red dwarf star",
            assertedAsFact: true,
            excerpt: "the red dwarf Proxima Centauri",
            location: "paragraph 3",
            confidence: "high",
            verdict: "accurate",
          },
        ],
      };

      const results = checkReferences(graph, makeContext());
      const errors = results.filter((r) => r.severity === "error");
      expect(errors.length).toBe(0);
    });
  });
});
