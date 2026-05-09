import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import { mkdir, writeFile, rm, readFile, readdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { RejectionSamplingRunner } from "./index";

/**
 * R8-A integration test (TODO.md → "TDD with a fake checker that toggles
 * between two violations on alternate calls; assert the guard catches the
 * re-introduction.").
 *
 * Two fake checkers form a stable oscillation: any draft contains EXACTLY
 * one of two markers (TOKEN_A / TOKEN_B), and:
 *   - CheckerA fires when TOKEN_A is present.
 *   - CheckerB fires when TOKEN_B is present.
 * The mock LLM swaps A↔B on every patch, so each round produces the
 * fingerprint that the previous round just suppressed. By round 3 both
 * `FakeCheckerA/has_a` and `FakeCheckerB/has_b` have fired in non-
 * consecutive rounds — the canonical R8-A oscillation pattern.
 */

const NL = String.fromCharCode(10);

// Capture every prompt sent to the mocked LLM so we can assert the
// oscillation warning was injected on the second-round patch.
const promptsSeen: string[] = [];
let callCount = 0;

mock.module("../llm", () => ({
  MODELS: {
    GENERATOR: "fake-generator",
    EVALUATOR: "fake-evaluator",
  },
  generateContent: mock(async (_model: string, prompt: string) => {
    callCount++;
    promptsSeen.push(prompt);

    // Call 1: initial-draft generation. Start with TOKEN_A so CheckerA
    // fires in round 1.
    if (callCount === 1) {
      return "Once upon a time. TOKEN_A happened. The end.";
    }

    // Patch calls: swap whichever token is currently in the draft.
    // The patch prompt embeds the current draft in a "## Current Draft"
    // section, so we can read it back to decide what to do.
    const draft = prompt.includes("TOKEN_A")
      ? "TOKEN_A"
      : prompt.includes("TOKEN_B")
        ? "TOKEN_B"
        : "";
    if (draft === "TOKEN_A") {
      // Patch removes TOKEN_A but reintroduces TOKEN_B → CheckerB will fire.
      return [
        "ORIGINAL:",
        "TOKEN_A happened.",
        "REVISED:",
        "TOKEN_B happened.",
      ].join(NL);
    }
    if (draft === "TOKEN_B") {
      return [
        "ORIGINAL:",
        "TOKEN_B happened.",
        "REVISED:",
        "TOKEN_A happened.",
      ].join(NL);
    }
    return "NO_CHANGE";
  }),
}));

describe("R8-A oscillation guard end-to-end", () => {
  const harnessDir = join(tmpdir(), `storyharness-osc-harnesses-${process.pid}`);
  const logDir = join(tmpdir(), `storyharness-osc-logs-${process.pid}`);

  beforeAll(async () => {
    await mkdir(harnessDir, { recursive: true });
    // Two code (Tier 1) harnesses, each emitting the canonical
    // "[Checker/rule] message" feedback string the OscillationGuard
    // fingerprints on. Tier 1 feedback flows through the runner unmodified,
    // so the bracket prefix survives.
    await writeFile(
      join(harnessDir, "FakeCheckerA.ts"),
      `
        async function evaluate(draft, context) {
          if (draft.includes("TOKEN_A")) {
            return {
              valid: false,
              feedback: ["[FakeCheckerA/has_a] TOKEN_A appears in draft"],
            };
          }
          return { valid: true, feedback: [] };
        }
      `
    );
    await writeFile(
      join(harnessDir, "FakeCheckerB.ts"),
      `
        async function evaluate(draft, context) {
          if (draft.includes("TOKEN_B")) {
            return {
              valid: false,
              feedback: ["[FakeCheckerB/has_b] TOKEN_B appears in draft"],
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

  it("warns the patch LLM and records the fingerprint when a rule fires across rounds", async () => {
    //#given a runner whose patch LLM swaps TOKEN_A ↔ TOKEN_B on every patch
    callCount = 0;
    promptsSeen.length = 0;
    const runner = new RejectionSamplingRunner({
      harnessDirectory: harnessDir,
      maxRetries: 3,
      loreDb: {},
      targetAudience: "general",
      logDirectory: logDir,
    });

    //#when generateScene runs
    let threw = false;
    try {
      await runner.generateScene("Tell a story.");
    } catch (err: any) {
      threw = true;
      // The session is expected to fail-converge — that is the whole point
      // of the oscillation scenario.
      expect(String(err.message)).toContain("Failed to generate a valid scene");
    }
    expect(threw).toBe(true);

    //#then a status.json was written that records the oscillation
    const sessions = await readdir(logDir);
    expect(sessions.length).toBeGreaterThan(0);
    // Use the most recently created session (sorted by name, which is a
    // timestamp).
    sessions.sort();
    const latest = sessions.at(-1);
    if (!latest) throw new Error("expected at least one session directory");
    const sessionDir = join(logDir, latest);
    const statusRaw = await readFile(join(sessionDir, "status.json"), "utf-8");
    const status = JSON.parse(statusRaw);

    expect(status.state).toBe("failed");
    expect(Array.isArray(status.oscillations)).toBe(true);

    // At least one of the two fingerprints must show recurrence (fired in
    // 2+ distinct rounds). With maxRetries=3 and a strict swap, BOTH should
    // recur, but allow either as a minimum.
    const fingerprints = status.oscillations.map((o: any) => o.fingerprint);
    const recurredA = fingerprints.includes("FakeCheckerA/has_a");
    const recurredB = fingerprints.includes("FakeCheckerB/has_b");
    expect(recurredA || recurredB).toBe(true);

    //#and the recurrence was surfaced to the LLM in one of two ways:
    //  (a) the oscillation-warning block was injected into a patch prompt
    //      (this happens when R8-B's escalation has NOT yet promoted the
    //      surgical rule to structural — i.e. the first re-fire), OR
    //  (b) the recurring fingerprint appeared in a structural-rewrite
    //      prompt (R8-B auto-escalates on re-fire under threshold 1).
    const patchPrompts = promptsSeen.filter((p) =>
      p.includes("## Issue to Fix")
    );
    const rewritePrompts = promptsSeen.filter((p) =>
      p.includes("## Structural Issues to Address")
    );
    const sawWarningInPatch = patchPrompts.some((p) =>
      p.includes("Oscillation Warning") &&
      (p.includes("FakeCheckerA/has_a") || p.includes("FakeCheckerB/has_b"))
    );
    const sawRecurringInRewrite = rewritePrompts.some((p) =>
      p.includes("FakeCheckerA/has_a") || p.includes("FakeCheckerB/has_b")
    );
    expect(sawWarningInPatch || sawRecurringInRewrite).toBe(true);
  });
});
