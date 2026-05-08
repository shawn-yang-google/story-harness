import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { NeedsResearchOutput, ResearchItem } from "./needs-research";

// Sequence of mock LLM responses, one per autoResearchItem call. Tests can
// reset and refill this array in beforeEach.
let mockResponses: Array<{ text: string; sources: Array<{ title?: string; uri?: string }> }> = [];
let mockCallCount = 0;

mock.module("../llm", () => ({
  MODELS: {
    REFINER: "gemini-2.5-flash",
    CRITIC: "gemini-2.5-pro",
    GENERATOR: "gemini-3.1-pro-preview",
    EVALUATOR: "gemini-3.1-flash-lite-preview",
  },
  generateGroundedContent: mock(async () => {
    const next = mockResponses.shift();
    if (!next) throw new Error("Test: ran out of mock LLM responses");
    mockCallCount++;
    return next;
  }),
}));

import { autoResearch } from "./auto-research";

function makeItem(overrides: Partial<ResearchItem> = {}): ResearchItem {
  return {
    id: "ref1",
    category: "historical",
    priority: "medium",
    claim: "The Cultural Revolution began in 1966.",
    excerpt: "...started in 1966...",
    location: "paragraph 1",
    reason: "Verify date.",
    modelAssessment: "May 16 Notification 1966.",
    suggestedSources: [],
    resolution: null,
    ...overrides,
  };
}

function makeOutput(items: ResearchItem[]): NeedsResearchOutput {
  return {
    generatedAt: "2026-05-08T00:00:00Z",
    summary: {
      totalClaims: items.length,
      verifiedClaims: 0,
      needsResearchClaims: items.length,
      inaccurateClaims: 0,
      byCategory: {} as any,
    },
    instructions: "...",
    items,
  };
}

describe("autoResearch", () => {
  beforeEach(() => {
    mockResponses = [];
    mockCallCount = 0;
  });

  //#given an output with two unresolved items + valid LLM JSON answers
  //#when autoResearch is called
  //#then both items get a resolution block populated from the LLM, and the call count matches
  it("populates a resolution for every unresolved item", async () => {
    const items = [
      makeItem({ id: "a", claim: "claim A" }),
      makeItem({ id: "b", claim: "claim B" }),
    ];
    mockResponses = [
      {
        text: JSON.stringify({
          accurate: true,
          verifiedFact: "Verified A.",
          source: "Source A",
          addToLoreDb: true,
        }),
        sources: [{ title: "wiki:A", uri: "https://example.com/a" }],
      },
      {
        text: JSON.stringify({
          accurate: false,
          verifiedFact: "Wrong; correct is B'.",
          source: "Source B",
          addToLoreDb: true,
        }),
        sources: [{ title: "wiki:B", uri: "https://example.com/b" }],
      },
    ];

    const result = await autoResearch(makeOutput(items));

    expect(mockCallCount).toBe(2);
    expect(result.items.length).toBe(2);
    expect(result.items[0].resolution).not.toBeNull();
    expect(result.items[0].resolution!.verifiedFact).toBe("Verified A.");
    expect(result.items[0].resolution!.source).toContain("Source A");
    expect(result.items[0].resolution!.addToLoreDb).toBe(true);
    expect(result.items[1].resolution!.accurate).toBe(false);
    expect(result.items[1].resolution!.source).toContain("Source B");
  });

  //#given an item that already has a resolution
  //#when autoResearch runs
  //#then it is skipped (LLM not called for that item)
  it("skips items that already have a resolution", async () => {
    const items = [
      makeItem({ id: "done", resolution: { accurate: true, verifiedFact: "x", source: "y", addToLoreDb: false } }),
      makeItem({ id: "todo", claim: "needs work" }),
    ];
    mockResponses = [
      {
        text: JSON.stringify({ accurate: true, verifiedFact: "ok", source: "s", addToLoreDb: true }),
        sources: [],
      },
    ];

    const result = await autoResearch(makeOutput(items));

    expect(mockCallCount).toBe(1);
    // Pre-existing resolution untouched
    expect(result.items[0].resolution!.verifiedFact).toBe("x");
    // New resolution populated
    expect(result.items[1].resolution!.verifiedFact).toBe("ok");
  });

  //#given the LLM returns malformed JSON
  //#when autoResearch runs on that item
  //#then the item gets a fallback resolution (addToLoreDb=false, source notes the parse failure)
  it("falls back gracefully when the LLM returns invalid JSON", async () => {
    const items = [makeItem({ id: "bad" })];
    mockResponses = [{ text: "this is not JSON, just prose", sources: [] }];

    const result = await autoResearch(makeOutput(items));

    expect(result.items[0].resolution).not.toBeNull();
    expect(result.items[0].resolution!.addToLoreDb).toBe(false);
    expect(result.items[0].resolution!.source.toLowerCase()).toContain("parse");
  });

  //#given grounding sources are returned alongside the answer
  //#when autoResearch runs
  //#then those URLs are appended to the resolution.source field for provenance
  it("appends grounding URLs to the source field for provenance", async () => {
    const items = [makeItem({ id: "g" })];
    mockResponses = [
      {
        text: JSON.stringify({ accurate: true, verifiedFact: "ok", source: "primary src", addToLoreDb: true }),
        sources: [
          { title: "Wikipedia: Cultural Revolution", uri: "https://en.wikipedia.org/wiki/Cultural_Revolution" },
          { uri: "https://example.org/citation" },
        ],
      },
    ];

    const result = await autoResearch(makeOutput(items));

    const src = result.items[0].resolution!.source;
    expect(src).toContain("primary src");
    expect(src).toContain("https://en.wikipedia.org/wiki/Cultural_Revolution");
    expect(src).toContain("https://example.org/citation");
  });

  //#given LLM JSON wrapped in markdown code fences
  //#when autoResearch parses it
  //#then the fences are stripped and parsing succeeds
  it("strips markdown code fences from the LLM response", async () => {
    const items = [makeItem({ id: "f" })];
    mockResponses = [
      {
        text: "```json\n" +
          '{"accurate": true, "verifiedFact": "fenced", "source": "s", "addToLoreDb": true}\n' +
          "```",
        sources: [],
      },
    ];

    const result = await autoResearch(makeOutput(items));

    expect(result.items[0].resolution!.verifiedFact).toBe("fenced");
  });
});
