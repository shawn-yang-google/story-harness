import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import { mkdir, writeFile, rm, readFile, readdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { RejectionSamplingRunner } from "./index";

/**
 * End-to-end coverage for R10-A (knowledge-source-staging gate).
 *
 * Mirrors the R8-C scenario in `r8b-r8c-integration.test.ts` but for
 * the EpistemicChecker/psychic_knowledge rule. A fake harness emits
 * `psychic_knowledge` whenever the draft contains the literal
 * `PSYCHIC_KNOWLEDGE_MARKER`. The patch LLM tries to paraphrase the
 * knowledge sentence in place WITHOUT staging a source — a single
 * short ORIGINAL/REVISED block where the revised text is shorter or
 * comparable to the original. The R10-A gate must reject that patch:
 *
 *   - currentDraft must NOT change after the patch attempt (the marker
 *     is still in best-draft.md).
 *   - status.json.knowledgeSourceRejections must be ≥ 1.
 *   - The patch prompt must contain the
 *     "Knowledge-Source Staging Constraint" block (proves the
 *     buildKnowledgeSourceStagingInstruction wiring is reaching the
 *     LLM call).
 */

const NL = String.fromCharCode(10);

describe("R10-A knowledge-source-staging gate", () => {
  const harnessDir = join(tmpdir(), `storyharness-r10a-harnesses-${process.pid}`);
  const logDir = join(tmpdir(), `storyharness-r10a-logs-${process.pid}`);

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
          //#given an initial draft that contains a flat psychic-knowledge
          //  claim with no narrative source. Long enough that the
          //  rewrite-success length gate (>100 chars) doesn't accidentally
          //  trip and divert into the structural rewrite path.
          return (
            "Ying walked into the kitchen. PSYCHIC_KNOWLEDGE_MARKER. The light was off. " +
            "The kettle was cold. She put on her coat. The morning was bright. The end."
          );
        }
        //#and the patch LLM only ever returns single-line in-place rewrites
        //  (no source staged) — exactly the failure mode R10-A exists to
        //  catch.
        if (prompt.includes("## Issue to Fix")) {
          return [
            "ORIGINAL:",
            "PSYCHIC_KNOWLEDGE_MARKER.",
            "REVISED:",
            "PSYCHIC_KNOWLEDGE_MARKER fixed.",
          ].join(NL);
        }
        return "NO_CHANGE";
      }),
    }));

    await mkdir(harnessDir, { recursive: true });
    //#and a fake harness that fires psychic_knowledge whenever the marker
    //  is present. Surgical (line-level), so it goes through the patch
    //  loop, NOT the structural rewrite path.
    await writeFile(
      join(harnessDir, "FakeEpistemicChecker.ts"),
      `
        async function evaluate(draft, context) {
          if (draft.includes("PSYCHIC_KNOWLEDGE_MARKER")) {
            return {
              valid: false,
              feedback: ['[EpistemicChecker/psychic_knowledge] "Ying" knows X but the source is unexplained.'],
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

  it("rejects single-line patches for psychic_knowledge and reports knowledgeSourceRejections", async () => {
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
    //#  rejecting the patch so the marker is never removed)
    let threw = false;
    try {
      await runner.generateScene("Tell a story.");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);

    //#then the patch prompt for the issue contained the R10-A
    //  staging-instruction block, proving the prompt-augmentation
    //  wiring is in place
    const patchPrompts = promptsSeen.filter((p) =>
      p.includes("## Issue to Fix")
    );
    expect(patchPrompts.length).toBeGreaterThanOrEqual(1);
    const sawStagingInstruction = patchPrompts.some((p) =>
      p.includes("Knowledge-Source Staging Constraint")
    );
    expect(sawStagingInstruction).toBe(true);

    //#and status.json.knowledgeSourceRejections > 0 (the gate fired)
    const sessions = (await readdir(logDir)).sort();
    const latest = sessions.at(-1);
    if (!latest) throw new Error("expected at least one session");
    const sessionDir = join(logDir, latest);
    const status = JSON.parse(
      await readFile(join(sessionDir, "status.json"), "utf-8")
    );
    expect(status.state).toBe("failed");
    expect(status.knowledgeSourceRejections).toBeGreaterThanOrEqual(1);

    //#and the R10-A gate must not double-count as a premise rejection
    //  (the two gates partition the rule space)
    expect(status.premiseRejections).toBe(0);

    //#and the best draft STILL contains the marker (the gate refused
    //  every single-line in-place patch, so the draft was never mutated)
    const best = await readFile(join(sessionDir, "best-draft.md"), "utf-8");
    expect(best).toContain("PSYCHIC_KNOWLEDGE_MARKER");
  });
});
