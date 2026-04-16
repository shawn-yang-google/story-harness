import { describe, it, expect, mock } from "bun:test";
import { HarnessSynthesizer } from "./index";

// Mock LLM
mock.module("../llm", () => ({
  MODELS: {
    REFINER: "gemini-2.5-flash",
  },
  generateContent: mock(async () => {
    return `
      async function evaluate(draft, context) {
        return { valid: draft.includes("hero"), feedback: [] };
      }
    `;
  }),
}));

describe("HarnessSynthesizer", () => {
  it("should initialize and run a training loop (mocked)", async () => {
    const trajectories = [
      { text: "hero wins", label: "good" },
      { text: "villain wins", label: "bad", flaws: ["villain_won"] },
    ] as const;

    const synthesizer = new HarnessSynthesizer("LogicHarness", trajectories, {
      maxIterations: 1, // run just once for the test
      tsWeight: 1.0,
      auto: true,
      logPath: "/dev/null",
      treeStatePath: "/dev/null", // don't write to disk during tests
      mode: "code",
    });

    await synthesizer.run();

    const tree = synthesizer.getTree();
    // Root + 1 child
    expect(tree.getAllNodes().length).toBe(2);
    
    // The child should have been evaluated on 2 trajectories.
    // the mock code checks if draft includes "hero"
    // "hero wins" -> valid: true. Expected label: "good" (MATCH)
    // "villain wins" -> valid: false. Expected label: "bad" (MATCH)
    // Score should be 2/2 = 1.0
    
    const child = tree.getAllNodes().find(n => n.id !== "root");
    expect(child!.visits).toBe(2);
    expect(child!.totalScore).toBe(2);
    expect(child!.heuristicValue).toBe(1.0);
  });
});
