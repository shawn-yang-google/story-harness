import { expect, test, describe, mock, beforeEach, afterAll } from "bun:test";
import { RejectionSamplingRunner } from "./index";
import * as llm from "../llm";
import * as sandbox from "../environment/sandbox";
import * as llmHarness from "../environment/llm-harness";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("RejectionSamplingRunner (Comprehensive Gating)", () => {
  const testHarnessDir = "test-harnesses-gating";
  const tmpLogDir = join(tmpdir(), "storyharness-twophase-logs-" + process.pid);

  afterAll(async () => {
    await rm(tmpLogDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    mock.restore();
    try {
      await rm(testHarnessDir, { recursive: true, force: true });
    } catch (e) {}
    await mkdir(testHarnessDir);
  });

  test("should run all gates even if Gate 1 fails (comprehensive feedback)", async () => {
    //#given
    await writeFile(join(testHarnessDir, "fail.js"), "async function evaluate() { return { valid: false, feedback: ['Code fail'] }; }");
    await writeFile(join(testHarnessDir, "test.prompt.txt"), "Prompt content");

    let promptHarnessCalled = false;
    mock.module("../llm", () => ({
      ...llm,
      generateContent: async (model: any, prompt: string) => {
        if (prompt.includes("expert story generator")) {
          return "Draft text";
        }
        if (prompt.includes("Harness Evaluation Prompt")) {
          promptHarnessCalled = true;
          return JSON.stringify({ valid: true, feedback: [] });
        }
        // Patch prompt — return NO_CHANGE
        return "NO_CHANGE";
      },
    }));

    const runner = new RejectionSamplingRunner({
      harnessDirectory: testHarnessDir,
      maxRetries: 1,
      loreDb: {},
      targetAudience: "general",
      logDirectory: tmpLogDir,
    });

    //#when
    try {
      await runner.generateScene("Scene prompt");
    } catch (e) {}

    //#then — prompt harness runs even though code harness failed
    expect(promptHarnessCalled).toBe(true);
  });

  test("should accept when all gates pass", async () => {
    //#given
    await writeFile(join(testHarnessDir, "pass.js"), "async function evaluate() { return { valid: true, feedback: [] }; }");
    await writeFile(join(testHarnessDir, "test.prompt.txt"), "Prompt content");

    let promptHarnessCalled = false;
    mock.module("../llm", () => ({
      ...llm,
      generateContent: async (model: any, prompt: string) => {
        if (prompt.includes("expert story generator")) {
          return "Draft text";
        }
        if (prompt.includes("Harness Evaluation Prompt")) {
          promptHarnessCalled = true;
          return JSON.stringify({ valid: true, feedback: [] });
        }
        return "";
      },
    }));

    const runner = new RejectionSamplingRunner({
      harnessDirectory: testHarnessDir,
      maxRetries: 1,
      loreDb: {},
      targetAudience: "general",
      logDirectory: tmpLogDir,
    });

    //#when
    await runner.generateScene("Scene prompt");

    //#then
    expect(promptHarnessCalled).toBe(true);
  });
});
