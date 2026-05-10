import { describe, it, expect } from "bun:test";
import { StructuralCapReachedError } from "./errors";

/**
 * R10-B: typed errors that distinguish failure modes inside the
 * rejection-sampling runner.
 *
 * The runner has two distinct ways to "fail to converge":
 *
 *   1. Generic convergence failure — the patch loop runs out of rounds
 *      while still flagging surgical-only issues. The runner throws a
 *      plain `Error` with the existing message
 *      "Failed to generate a valid scene after N rounds."
 *
 *   2. Structural-cap exhaustion — at least one round wanted to do a
 *      structural rewrite but `structuralRewriteCount` was already at
 *      `STRUCTURAL_REWRITE_CAP`. The runner emitted
 *      `needs-human-rewrite.md` instead and continued; if the round
 *      cap is then exhausted, the failure mode is "structural ceiling
 *      hit, human intervention required" — which is qualitatively
 *      different from "the patch loop just needs more turns".
 *
 * `StructuralCapReachedError` carries the operator-facing context the
 * CLI needs to print a useful error message (the path of
 * `needs-human-rewrite.md`, the staging-gate counters, and the cap
 * itself) without forcing the catcher to re-read `status.json`.
 */

describe("StructuralCapReachedError", () => {
  //#given a StructuralCapReachedError constructed with all fields
  //#when its properties are read
  //#then they round-trip exactly as supplied
  it("carries the session dir, needs-human-rewrite path, and counters", () => {
    const err = new StructuralCapReachedError({
      sessionDir: "/tmp/logs/generate-2026-05-10T05-50-00-000Z",
      needsHumanRewritePath:
        "/tmp/logs/generate-2026-05-10T05-50-00-000Z/needs-human-rewrite.md",
      structuralRewriteCount: 2,
      structuralRewriteCap: 2,
      premiseRejections: 1,
      knowledgeSourceRejections: 4,
      rounds: 5,
    });

    expect(err.sessionDir).toBe(
      "/tmp/logs/generate-2026-05-10T05-50-00-000Z"
    );
    expect(err.needsHumanRewritePath).toBe(
      "/tmp/logs/generate-2026-05-10T05-50-00-000Z/needs-human-rewrite.md"
    );
    expect(err.structuralRewriteCount).toBe(2);
    expect(err.structuralRewriteCap).toBe(2);
    expect(err.premiseRejections).toBe(1);
    expect(err.knowledgeSourceRejections).toBe(4);
    expect(err.rounds).toBe(5);
  });

  //#given any StructuralCapReachedError
  //#when checked with `instanceof Error`
  //#then it is a real Error subclass (so existing `catch (e: any)`
  //  paths in the codebase still work without explicit type checks)
  it("is a real Error subclass", () => {
    const err = new StructuralCapReachedError({
      sessionDir: "x",
      needsHumanRewritePath: "x/needs-human-rewrite.md",
      structuralRewriteCount: 2,
      structuralRewriteCap: 2,
      premiseRejections: 0,
      knowledgeSourceRejections: 0,
      rounds: 5,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StructuralCapReachedError);
    expect(err.name).toBe("StructuralCapReachedError");
  });

  //#given a StructuralCapReachedError
  //#when its `.message` is read
  //#then it surfaces both the count/cap AND the
  //  needs-human-rewrite.md path so logs/error-displays/CLI
  //  prints get the operator-actionable signal even without the
  //  caller pulling fields off the error
  it("includes the cap counters and needs-human-rewrite.md path in the message", () => {
    const err = new StructuralCapReachedError({
      sessionDir: "logs/generate-X",
      needsHumanRewritePath: "logs/generate-X/needs-human-rewrite.md",
      structuralRewriteCount: 2,
      structuralRewriteCap: 2,
      premiseRejections: 1,
      knowledgeSourceRejections: 4,
      rounds: 5,
    });
    expect(err.message).toContain("structural-rewrite cap");
    expect(err.message).toMatch(/2\s*\/\s*2/);
    expect(err.message).toContain("needs-human-rewrite.md");
  });

  //#given two errors with the same fields
  //#when checked with `instanceof` against the generic Error
  //#then the runner-level catcher can still tell them apart with an
  //  `instanceof StructuralCapReachedError` check (this is the entire
  //  point of having a typed error — without it the CLI cannot
  //  distinguish "ran out of rounds" from "hit the structural cap")
  it("can be distinguished from a plain Error via instanceof", () => {
    const capErr = new StructuralCapReachedError({
      sessionDir: "x",
      needsHumanRewritePath: "x/needs-human-rewrite.md",
      structuralRewriteCount: 2,
      structuralRewriteCap: 2,
      premiseRejections: 0,
      knowledgeSourceRejections: 0,
      rounds: 5,
    });
    const plainErr = new Error("Failed to generate a valid scene after 5 rounds.");

    expect(capErr instanceof StructuralCapReachedError).toBe(true);
    expect(plainErr instanceof StructuralCapReachedError).toBe(false);
  });
});
