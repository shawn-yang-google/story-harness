import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import { mkdir, writeFile, rm, readFile, readdir, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { RejectionSamplingRunner } from "./index";

/**
 * End-to-end coverage for R8-B (structural-rewrite cap +
 * needs-human-rewrite.md emission) and R8-C (premise-staging gate).
 *
 * Two scenarios:
 *
 *   1. R8-B cap: a fake harness emits a structural Tier-2 rule
 *      (`CharacterChecker/cement_block_character`) every round. The patch
 *      LLM's "rewrite" doesn't actually fix anything (it returns mostly
 *      the same draft), so the runner exhausts its STRUCTURAL_REWRITE_CAP
 *      and writes `needs-human-rewrite.md`.
 *
 *   2. R8-C gate: a fake harness emits
 *      `PropositionalChecker/unsupported_conclusion` whenever the draft
 *      contains the literal "BAD_CONCLUSION". The patch LLM tries to
 *      rewrite the conclusion sentence in place WITHOUT inserting a
 *      premise (a single short ORIGINAL/REVISED block). The R8-C gate
 *      should reject that patch — currentDraft must NOT change after the
 *      patch attempt, and `status.json.premiseRejections` must be ≥ 1.
 */

const NL = String.fromCharCode(10);

describe("R8-B structural-rewrite cap", () => {
  const harnessDir = join(tmpdir(), `storyharness-r8b-harnesses-${process.pid}`);
  const logDir = join(tmpdir(), `storyharness-r8b-logs-${process.pid}`);

  let promptsSeen: string[] = [];
  let callCount = 0;

  beforeAll(async () => {
    mock.module("../llm", () => ({
      MODELS: {
        GENERATOR: "fake-generator",
        EVALUATOR: "fake-evaluator",
      },
      generateContent: mock(async (_model: string, prompt: string) => {
        callCount++;
        promptsSeen.push(prompt);
        if (callCount === 1) {
          // Initial draft — long enough that the > 100 char "rewrite
          // succeeded" gate passes.
          return (
            "Once upon a time, the protagonist did one single thing without ever changing. " +
            "She did the thing. She did the thing again. The end. PROBLEM_TOKEN persists."
          );
        }
        // Every subsequent call (whether structural-rewrite or surgical
        // patch prompt) returns a draft that STILL contains PROBLEM_TOKEN
        // so the structural rule keeps firing.
        if (prompt.includes("## Structural Issues to Address")) {
          // Pretend to rewrite, but keep the failing token.
          return (
            "The protagonist did the same single thing again, in a slightly different paragraph. " +
            "She did the thing. The end. PROBLEM_TOKEN persists."
          );
        }
        // Surgical patch prompt path — never reached for structural-only
        // tests but return NO_CHANGE defensively.
        return "NO_CHANGE";
      }),
    }));

    await mkdir(harnessDir, { recursive: true });
    await writeFile(
      join(harnessDir, "FakeStructuralChecker.ts"),
      `
        async function evaluate(draft, context) {
          if (draft.includes("PROBLEM_TOKEN")) {
            return {
              valid: false,
              feedback: ["[CharacterChecker/cement_block_character] persistent issue"],
            };
          }
          return { valid: true, feedback: [] };
        }
      `
    );
  });

  afterAll(async () => {
    await rm(harnessDir, { recursive: true, force: true });
    await rm(logDir, { recursive: true, force: true });
  });

  it("emits needs-human-rewrite.md after STRUCTURAL_REWRITE_CAP rewrites", async () => {
    //#given a runner with maxRetries=4 (3 chances to rewrite, then cap kicks in)
    callCount = 0;
    promptsSeen = [];
    const runner = new RejectionSamplingRunner({
      harnessDirectory: harnessDir,
      maxRetries: 4,
      loreDb: {},
      targetAudience: "general",
      logDirectory: logDir,
    });

    //#when generateScene runs
    let threw = false;
    try {
      await runner.generateScene("Tell a story.");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);

    //#then a needs-human-rewrite.md exists in the session dir
    const sessions = (await readdir(logDir)).sort();
    const latest = sessions.at(-1);
    if (!latest) throw new Error("expected at least one session");
    const sessionDir = join(logDir, latest);

    const nhrPath = join(sessionDir, "needs-human-rewrite.md");
    const nhrStat = await stat(nhrPath);
    expect(nhrStat.isFile()).toBe(true);

    const nhr = await readFile(nhrPath, "utf-8");
    expect(nhr).toContain("Needs Human Rewrite");
    expect(nhr).toContain("cement_block_character");

    //#and status.json reports structuralRewriteCount === STRUCTURAL_REWRITE_CAP
    const status = JSON.parse(
      await readFile(join(sessionDir, "status.json"), "utf-8")
    );
    expect(status.state).toBe("failed");
    expect(status.structuralRewriteCount).toBe(status.structuralRewriteCap);
    expect(status.structuralRewriteCap).toBe(2);

    //#and the structural-rewrite prompt was used at most CAP times
    const rewritePrompts = promptsSeen.filter((p) =>
      p.includes("## Structural Issues to Address")
    );
    expect(rewritePrompts.length).toBeLessThanOrEqual(status.structuralRewriteCap);
  });
});

describe("R8-C premise-staging gate", () => {
  const harnessDir = join(tmpdir(), `storyharness-r8c-harnesses-${process.pid}`);
  const logDir = join(tmpdir(), `storyharness-r8c-logs-${process.pid}`);

  let callCount = 0;
  let promptsSeen: string[] = [];

  beforeAll(async () => {
    mock.module("../llm", () => ({
      MODELS: {
        GENERATOR: "fake-generator",
        EVALUATOR: "fake-evaluator",
      },
      generateContent: mock(async (_model: string, prompt: string) => {
        callCount++;
        promptsSeen.push(prompt);
        if (callCount === 1) {
          // Initial draft: contains BAD_CONCLUSION as a flat assertion.
          return (
            "She walked into the room. The trial was rigged. BAD_CONCLUSION marker. The end."
          );
        }
        // Patch prompt: return a single-line conclusion-only edit (no
        // premise insertion), mirroring the failure mode R8-C exists to
        // catch.
        if (prompt.includes("## Issue to Fix")) {
          return [
            "ORIGINAL:",
            "BAD_CONCLUSION marker.",
            "REVISED:",
            "BAD_CONCLUSION fixed.",
          ].join(NL);
        }
        return "NO_CHANGE";
      }),
    }));

    await mkdir(harnessDir, { recursive: true });
    // Fires the unsupported_conclusion rule whenever BAD_CONCLUSION is
    // present in the draft. Surgical (line-level), so it goes through the
    // patch loop, not the structural rewrite path.
    await writeFile(
      join(harnessDir, "FakePremiseChecker.ts"),
      `
        async function evaluate(draft, context) {
          if (draft.includes("BAD_CONCLUSION")) {
            return {
              valid: false,
              feedback: ["[PropositionalChecker/unsupported_conclusion] premise missing"],
            };
          }
          return { valid: true, feedback: [] };
        }
      `
    );
  });

  afterAll(async () => {
    await rm(harnessDir, { recursive: true, force: true });
    await rm(logDir, { recursive: true, force: true });
  });

  it("rejects single-line patches for unsupported_conclusion and reports premiseRejections", async () => {
    //#given a runner whose patch LLM only ever returns single-line rewrites
    callCount = 0;
    promptsSeen = [];
    const runner = new RejectionSamplingRunner({
      harnessDirectory: harnessDir,
      maxRetries: 2,
      loreDb: {},
      targetAudience: "general",
      logDirectory: logDir,
    });

    //#when generateScene runs (it must fail-converge — the gate keeps
    //#  rejecting the patch so BAD_CONCLUSION is never removed)
    let threw = false;
    try {
      await runner.generateScene("Tell a story.");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);

    //#then the patch prompt for the issue contained the premise-staging block
    const patchPrompts = promptsSeen.filter((p) =>
      p.includes("## Issue to Fix")
    );
    expect(patchPrompts.length).toBeGreaterThanOrEqual(1);
    const sawPremiseInstruction = patchPrompts.some((p) =>
      p.includes("Premise-Staging Constraint")
    );
    expect(sawPremiseInstruction).toBe(true);

    //#and status.json.premiseRejections > 0
    const sessions = (await readdir(logDir)).sort();
    const latest = sessions.at(-1);
    if (!latest) throw new Error("expected at least one session");
    const sessionDir = join(logDir, latest);
    const status = JSON.parse(
      await readFile(join(sessionDir, "status.json"), "utf-8")
    );
    expect(status.state).toBe("failed");
    expect(status.premiseRejections).toBeGreaterThanOrEqual(1);

    //#and the best draft STILL contains BAD_CONCLUSION (the gate refused
    //# every single-line conclusion-only patch, so the draft was never
    //# mutated by them).
    const best = await readFile(join(sessionDir, "best-draft.md"), "utf-8");
    expect(best).toContain("BAD_CONCLUSION");
  });
});
