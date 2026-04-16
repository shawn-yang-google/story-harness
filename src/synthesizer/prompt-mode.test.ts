import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import { HarnessSynthesizer } from "./index";
import * as llm from "../llm";
import * as llmHarness from "../environment/llm-harness";
import type { Trajectory } from "../types";

describe("HarnessSynthesizer (Prompt Mode)", () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  test("should refine prompts and evaluate using executeLlmHarness", async () => {
    //#given
    const trajectories: Trajectory[] = [
      { text: "A scary story.", label: "good" },
      { text: "A boring story.", label: "bad" },
    ];
    
    const options = {
      maxIterations: 1,
      tsWeight: 1.0,
      auto: true,
      treeStatePath: "/dev/null",
      logPath: "/dev/null",
      mode: "prompt" as const,
    };

    const synthesizer = new HarnessSynthesizer("ScaryHarness", trajectories, options);

    // Mock LLM refinement and evaluation
    mock.module("../llm", () => ({
      ...llm,
      generateContent: async (model: any, prompt: string) => {
        // If it's the refinement prompt
        if (prompt.includes("expert prompt engineer")) {
          return "Refined prompt content";
        }
        // If it's the evaluation prompt (from executeLlmHarness)
        if (prompt.includes("Harness Evaluation Prompt")) {
          if (prompt.includes("A scary story.")) {
            return JSON.stringify({ valid: true, feedback: [] });
          }
          return JSON.stringify({ valid: false, feedback: ["Not scary enough"] });
        }
        return "";
      },
    }));

    //#when
    await synthesizer.run();

    //#then
    const tree = synthesizer.getTree();
    const nodes = tree.getAllNodes();
    expect(nodes.length).toBe(2); // Root + 1 iteration
    const childNode = nodes.find(n => n.parentId === "root")!;
    expect(childNode.code).toBe("Refined prompt content");
    expect(childNode.heuristicValue).toBe(1.0); // Both trajectories were correctly classified
  });
});
