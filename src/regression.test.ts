/**
 * Regression test: family-history failed-converge case.
 *
 * Captures the state of a real generation run that previously failed to
 * converge under L4 reference enforcement. Replays the pure
 * checkReferences → applyReferenceLevel(4) pipeline against a saved
 * reference graph + lore snapshot (no LLM calls) and asserts the error
 * budget is below threshold.
 *
 * See tests/fixtures/regression/family-history-failed/README.md for the
 * fixture's history and update procedure.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { checkReferences, applyReferenceLevel } from "./reference/reference-checker";
import type { ReferenceGraph } from "./types/reference-graph";
import { createEmptyReferenceGraph } from "./types/reference-graph";
import type { HarnessContext } from "./types";

const FIXTURE_DIR = join(__dirname, "..", "tests", "fixtures", "regression", "family-history-failed");

function loadFixtureGraph(): ReferenceGraph {
  const raw = readFileSync(join(FIXTURE_DIR, "reference-graph.json"), "utf-8");
  const parsed = JSON.parse(raw);
  // The captured graph stores only the populated fields; merge with an empty
  // graph so optional arrays like `anachronisms` exist.
  return { ...createEmptyReferenceGraph(), ...parsed };
}

function loadFixtureLore(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, "lore-snapshot.json"), "utf-8"));
}

function makeContext(loreDb: Record<string, unknown>): HarnessContext {
  return {
    loreDb,
    previousBeats: [],
    targetAudience: "adult",
  };
}

describe("Regression: family-history failed-converge case", () => {
  //#given the captured reference graph + lore snapshot from the historic
  //       failed run
  //#when we apply L4 reference enforcement
  //#then the result has fewer than 5 errors
  //       (before Round 2 fixes this exceeded the budget because
  //        lore_coverage was promoted to error and contradiction
  //        false-positives fired on contested-truth propositions)
  it("emits fewer than 5 errors at reference level 4", () => {
    const graph = loadFixtureGraph();
    const context = makeContext(loadFixtureLore());

    const rawResults = checkReferences(graph, context);
    const promoted = applyReferenceLevel(rawResults, 4);
    const errors = promoted.filter((r) => r.severity === "error");

    if (errors.length >= 5) {
      // Print diagnostic so a future failure is debuggable.
      // eslint-disable-next-line no-console
      console.error(
        "Regression error budget exceeded. Errors:\n" +
          errors.map((e) => `  - [${e.checker}/${e.rule}] ${e.message}`).join("\n"),
      );
    }
    expect(errors.length).toBeLessThan(5);
  });

  //#given the same captured graph
  //#when we apply L5 (the strictest level)
  //#then the result is still bounded — strict mode promotes more rules
  //       but should not explode without a regression
  it("emits a bounded number of errors at reference level 5", () => {
    const graph = loadFixtureGraph();
    const context = makeContext(loadFixtureLore());

    const rawResults = checkReferences(graph, context);
    const promoted = applyReferenceLevel(rawResults, 5);
    const errors = promoted.filter((r) => r.severity === "error");

    // L5 promotes additional rules (vague_history) on top of L4, so the
    // budget is slightly higher but should still be small.
    expect(errors.length).toBeLessThan(8);
  });

  //#given the captured graph + lore
  //#when we run the checkers without level-promotion
  //#then lore_coverage and lore_coverage_partial are warnings (not errors)
  //       — confirms the historic source-checker exemptions still hold
  it("keeps lore_coverage and lore_coverage_partial as warnings at every level", () => {
    const graph = loadFixtureGraph();
    const context = makeContext(loadFixtureLore());
    const raw = checkReferences(graph, context);

    for (const level of [1, 2, 3, 4, 5] as const) {
      const promoted = applyReferenceLevel(raw, level);
      const promotedCoverage = promoted.filter(
        (r) =>
          (r.rule === "lore_coverage" || r.rule === "lore_coverage_partial") &&
          r.severity === "error",
      );
      expect(promotedCoverage.length).toBe(0);
    }
  });
});
