import { describe, it, expect, mock, beforeAll, beforeEach, afterAll } from "bun:test";
import { RejectionSamplingRunner } from "./index";
import { mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

let callCount = 0;
// Mock LLM
mock.module("../llm", () => ({
  MODELS: {
    GENERATOR: "gemini-2.5-pro",
  },
  generateContent: mock(async () => {
    callCount++;
    if (callCount === 1) {
      // Initial draft generation
      return "draft with a cliché";
    }
    // Patch call: return ORIGINAL/REVISED diff format
    return "ORIGINAL:\ndraft with a cliché\nREVISED:\na perfectly fine draft";
  }),
}));

describe("RejectionSamplingRunner", () => {
  const tmpDir = "tmp_test_harnesses";
  const tmpLogDir = join(tmpdir(), "storyharness-test-logs-" + process.pid);

  beforeEach(() => {
    callCount = 0;
  });

  beforeAll(async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(`${tmpDir}/StyleHarness.ts`, `
      async function evaluate(draft, context) {
        if (draft.includes("cliché")) {
          return { valid: false, feedback: ["Avoid clichés"] };
        }
        return { valid: true, feedback: [] };
      }
    `);
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await rm(tmpLogDir, { recursive: true, force: true });
  });

  it("should generate a draft, reject it, refine it, and accept it", async () => {
    const runner = new RejectionSamplingRunner({
      harnessDirectory: tmpDir,
      maxRetries: 3,
      loreDb: {},
      targetAudience: "general",
      logDirectory: tmpLogDir,
    });

    const result = await runner.generateScene("Write a scene");
    
    expect(result).toBe("a perfectly fine draft");
    expect(callCount).toBe(2);
    
    // The runner should have appended this to previousBeats
    expect(runner.getPreviousBeats()).toEqual(["a perfectly fine draft"]);
  });

  it("should fail if max retries exceeded", async () => {
    // Reset callCount to simulate persistent failure
    // We'll just write a new harness that ALWAYS fails
    await writeFile(`${tmpDir}/ImpossibleHarness.js`, `
      async function evaluate() { return { valid: false, feedback: ["always fail"] }; }
    `);

    const runner = new RejectionSamplingRunner({
      harnessDirectory: tmpDir,
      maxRetries: 2,
      loreDb: {},
      targetAudience: "general",
      logDirectory: tmpLogDir,
    });

    await expect(runner.generateScene("Write another scene")).rejects.toThrow("Failed to generate a valid scene after 2 rounds.");
  });

  it("should accept rewrittenDraft from a harness", async () => {
    const rewriteDir = "tmp_rewrite_harnesses";
    await mkdir(rewriteDir, { recursive: true });
    await writeFile(`${rewriteDir}/RewriteHarness.ts`, `
      async function evaluate(draft, context) {
        if (draft.includes("cliché")) {
          return { valid: true, feedback: [], rewrittenDraft: draft.replace("cliché", "novelty") };
        }
        return { valid: true, feedback: [] };
      }
    `);

    const runner = new RejectionSamplingRunner({
      harnessDirectory: rewriteDir,
      maxRetries: 3,
      loreDb: {},
      targetAudience: "general",
      logDirectory: tmpLogDir,
    });

    const result = await runner.generateScene("Write a scene");
    // The mock LLM returns "draft with a cliché" on attempt 1.
    // The harness rewrites it and returns valid: true.
    expect(result).toBe("draft with a novelty");
    expect(callCount).toBe(1); // Only 1 attempt needed
    
    await rm(rewriteDir, { recursive: true, force: true });
  });
});
