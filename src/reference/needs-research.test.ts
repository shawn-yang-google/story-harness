import { describe, it, expect } from "bun:test";
import {
  generateNeedsResearch,
  extractVerifiedFacts,
} from "./needs-research";
import type { NeedsResearchOutput, ResearchResolution } from "./needs-research";
import type { ReferenceGraph } from "../types/reference-graph";
import { createEmptyReferenceGraph } from "../types/reference-graph";

describe("NeedsResearch", () => {
  //#given an empty reference graph
  //#when we generate needs-research output
  //#then it should have zero items
  it("should return empty items for a graph with no uncertain claims", () => {
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
          reasoning: "Well-known fact",
          verdict: "accurate",
        },
      ],
    };

    const output = generateNeedsResearch(graph);
    expect(output.items.length).toBe(0);
    expect(output.summary.totalClaims).toBe(1);
    expect(output.summary.verifiedClaims).toBe(1);
    expect(output.summary.needsResearchClaims).toBe(0);
  });

  //#given claims that need research
  //#when we generate needs-research output
  //#then items should be created with correct priorities
  it("should generate research items with correct priorities", () => {
    const graph: ReferenceGraph = {
      ...createEmptyReferenceGraph(),
      claims: [
        {
          id: "ref1",
          category: "cultural",
          excerpt: "The villagers performed the rain dance",
          claim: "Rain dances are performed at midnight",
          location: "paragraph 2",
          confidence: "unverifiable",
          reasoning: "Cannot verify niche custom",
          verdict: "needs_research",
        },
        {
          id: "ref2",
          category: "historical",
          excerpt: "The battle took place in 1832",
          claim: "The battle took place in 1832",
          location: "paragraph 4",
          confidence: "medium",
          reasoning: "Might be 1831 or 1833",
          verdict: "partially_accurate",
          correction: "The exact year is uncertain",
        },
        {
          id: "ref3",
          category: "linguistic",
          excerpt: "He said 'howdy partner'",
          claim: "Howdy is a Southern US greeting",
          location: "paragraph 6",
          confidence: "low",
          reasoning: "Limited dialect knowledge",
          verdict: "needs_research",
        },
      ],
    };

    const output = generateNeedsResearch(graph);

    expect(output.items.length).toBe(3);
    expect(output.summary.needsResearchClaims).toBe(3);

    // Should be sorted by priority: high first
    expect(output.items[0].priority).toBe("high");
    expect(output.items[0].id).toBe("ref2");

    // Medium priority
    expect(output.items[1].priority).toBe("medium");
    expect(output.items[1].id).toBe("ref3");

    // Low priority (unverifiable)
    expect(output.items[2].priority).toBe("low");
    expect(output.items[2].id).toBe("ref1");
  });

  //#given research items
  //#then suggested sources should be category-appropriate
  it("should provide category-appropriate suggested sources", () => {
    const graph: ReferenceGraph = {
      ...createEmptyReferenceGraph(),
      claims: [
        {
          id: "ref1",
          category: "historical",
          excerpt: "x",
          claim: "historical claim",
          location: "p1",
          confidence: "low",
          reasoning: "",
          verdict: "needs_research",
        },
        {
          id: "ref2",
          category: "scientific",
          excerpt: "y",
          claim: "scientific claim",
          location: "p2",
          confidence: "low",
          reasoning: "",
          verdict: "needs_research",
        },
      ],
    };

    const output = generateNeedsResearch(graph);

    const historicalItem = output.items.find((i) => i.category === "historical")!;
    expect(historicalItem.suggestedSources.some((s) => s.includes("JSTOR"))).toBe(true);

    const scientificItem = output.items.find((i) => i.category === "scientific")!;
    expect(scientificItem.suggestedSources.some((s) => s.includes("arXiv"))).toBe(true);
  });

  //#given the output contains instructions
  //#then instructions should mention the import-research command
  it("should include actionable instructions", () => {
    const graph = createEmptyReferenceGraph();
    const output = generateNeedsResearch(graph);

    expect(output.instructions).toContain("import-research");
    expect(output.instructions).toContain("resolution");
    expect(output.instructions).toContain("addToLoreDb");
  });

  //#given the summary
  //#then byCategory should tally correctly
  it("should produce correct category tallies", () => {
    const graph: ReferenceGraph = {
      ...createEmptyReferenceGraph(),
      claims: [
        {
          id: "ref1",
          category: "cultural",
          excerpt: "x",
          claim: "cultural1",
          location: "p1",
          confidence: "low",
          reasoning: "",
          verdict: "needs_research",
        },
        {
          id: "ref2",
          category: "cultural",
          excerpt: "y",
          claim: "cultural2",
          location: "p2",
          confidence: "unverifiable",
          reasoning: "",
          verdict: "needs_research",
        },
        {
          id: "ref3",
          category: "geographic",
          excerpt: "z",
          claim: "geographic1",
          location: "p3",
          confidence: "low",
          reasoning: "",
          verdict: "needs_research",
        },
      ],
    };

    const output = generateNeedsResearch(graph);
    expect(output.summary.byCategory["cultural"]).toBe(2);
    expect(output.summary.byCategory["geographic"]).toBe(1);
  });

  describe("extractVerifiedFacts", () => {
    //#given a resolved needs-research output with some items resolved
    //#when we extract verified facts
    //#then only resolved items with addToLoreDb should be included
    it("should extract only resolved facts marked for loreDb", () => {
      const output: NeedsResearchOutput = {
        generatedAt: "2024-01-01T00:00:00Z",
        summary: {
          totalClaims: 3,
          verifiedClaims: 1,
          needsResearchClaims: 2,
          inaccurateClaims: 0,
          byCategory: { cultural: 1, linguistic: 1 } as any,
        },
        instructions: "",
        items: [
          {
            id: "ref1",
            category: "cultural",
            priority: "medium",
            claim: "Rain dances are performed at midnight in this region",
            excerpt: "the rain dance at midnight",
            location: "p2",
            reason: "Cannot verify",
            modelAssessment: "Uncertain",
            suggestedSources: [],
            resolution: {
              accurate: true,
              verifiedFact: "The Hopi rain dance is performed at dawn, not midnight",
              source: "Ethnographic study by Smith (2019)",
              addToLoreDb: true,
            },
          },
          {
            id: "ref2",
            category: "linguistic",
            priority: "low",
            claim: "Sichuan dialect has a drawl",
            excerpt: "thick Sichuan drawl",
            location: "p5",
            reason: "Limited knowledge",
            modelAssessment: "Uncertain",
            suggestedSources: [],
            resolution: {
              accurate: false,
              verifiedFact: "Sichuan dialect is characterized by tonal shifts, not a drawl",
              source: "Linguistic atlas of China",
              addToLoreDb: false, // Author chose not to add
            },
          },
        ],
      };

      const facts = extractVerifiedFacts(output);

      // Only ref1 has addToLoreDb: true
      expect(Object.keys(facts).length).toBe(1);
      const key = Object.keys(facts)[0];
      expect(key).toContain("cultural");
      expect(key).toContain("rain_dances");
      expect(facts[key]).toContain("Hopi rain dance");
    });

    //#given no resolved items
    //#then extractVerifiedFacts should return empty
    it("should return empty when no items are resolved", () => {
      const output: NeedsResearchOutput = {
        generatedAt: "2024-01-01T00:00:00Z",
        summary: {
          totalClaims: 1,
          verifiedClaims: 0,
          needsResearchClaims: 1,
          inaccurateClaims: 0,
          byCategory: {} as any,
        },
        instructions: "",
        items: [
          {
            id: "ref1",
            category: "cultural",
            priority: "low",
            claim: "Some claim",
            excerpt: "some excerpt",
            location: "p1",
            reason: "",
            modelAssessment: "",
            suggestedSources: [],
            resolution: null, // Not resolved yet
          },
        ],
      };

      const facts = extractVerifiedFacts(output);
      expect(Object.keys(facts).length).toBe(0);
    });
  });
});
