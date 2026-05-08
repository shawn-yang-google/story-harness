import { describe, it, expect } from "bun:test";
import { applyReferenceLevel } from "./reference-checker";
import type { CheckResult } from "../logic/types";

function makeResult(overrides: Partial<CheckResult>): CheckResult {
  return {
    checker: "SourceChecker",
    rule: "some_rule",
    message: "Some issue",
    severity: "warning",
    ...overrides,
  };
}

describe("applyReferenceLevel", () => {
  //#given a mix of errors and warnings
  //#when level is 1
  //#then only errors are returned
  it("level 1 filters out all warnings, keeps only errors", () => {
    const results: CheckResult[] = [
      makeResult({ rule: "inaccurate_date", severity: "error" }),
      makeResult({ rule: "vague_history", severity: "warning" }),
      makeResult({ rule: "unsourced_critical", severity: "warning" }),
    ];

    const filtered = applyReferenceLevel(results, 1);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].severity).toBe("error");
    expect(filtered[0].rule).toBe("inaccurate_date");
  });

  //#given a mix of results
  //#when level is 2
  //#then all results are returned unchanged
  it("level 2 returns results unchanged", () => {
    const results: CheckResult[] = [
      makeResult({ rule: "inaccurate_date", severity: "error" }),
      makeResult({ rule: "vague_history", severity: "warning" }),
      makeResult({ rule: "unsourced_critical", severity: "warning" }),
    ];

    const filtered = applyReferenceLevel(results, 2);

    expect(filtered).toHaveLength(3);
    expect(filtered[0].severity).toBe("error");
    expect(filtered[1].severity).toBe("warning");
    expect(filtered[2].severity).toBe("warning");
  });

  //#given results with unsourced_critical warning
  //#when level is 3
  //#then unsourced_critical is promoted to error
  it("level 3 promotes unsourced_critical warning to error", () => {
    const results: CheckResult[] = [
      makeResult({ rule: "unsourced_critical", severity: "warning" }),
      makeResult({ rule: "vague_history", severity: "warning" }),
    ];

    const filtered = applyReferenceLevel(results, 3);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].rule).toBe("unsourced_critical");
    expect(filtered[0].severity).toBe("error");
  });

  //#given results without unsourced_critical
  //#when level is 3
  //#then other warnings are not promoted
  it("level 3 does not promote other warnings to error", () => {
    const results: CheckResult[] = [
      makeResult({ rule: "vague_history", severity: "warning" }),
      makeResult({ rule: "lore_coverage", severity: "warning" }),
    ];

    const filtered = applyReferenceLevel(results, 3);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].severity).toBe("warning");
    expect(filtered[1].severity).toBe("warning");
  });

  //#given results with vague_history warning
  //#when level is 4
  //#then vague_history is promoted to error
  it("level 4 promotes vague_history to error", () => {
    const results: CheckResult[] = [
      makeResult({ rule: "vague_history", severity: "warning" }),
      makeResult({ rule: "some_other", severity: "warning" }),
    ];

    const filtered = applyReferenceLevel(results, 4);

    expect(filtered[0].rule).toBe("vague_history");
    expect(filtered[0].severity).toBe("error");
    expect(filtered[1].severity).toBe("warning");
  });

  //#given results with lore_coverage warning
  //#when level is 4
  //#then lore_coverage stays a warning (author-side, not generator-fixable)
  it("level 4 does NOT promote lore_coverage to error", () => {
    const results: CheckResult[] = [
      makeResult({ rule: "lore_coverage", severity: "warning" }),
    ];

    const filtered = applyReferenceLevel(results, 4);

    expect(filtered[0].severity).toBe("warning");
  });

  //#given results with promotable warnings
  //#when level is 5
  //#then unsourced_critical + vague_history are promoted, lore_coverage is not
  it("level 5 promotes unsourced_critical and vague_history but NOT lore_coverage", () => {
    const results: CheckResult[] = [
      makeResult({ rule: "unsourced_critical", severity: "warning" }),
      makeResult({ rule: "vague_history", severity: "warning" }),
      makeResult({ rule: "lore_coverage", severity: "warning" }),
      makeResult({ rule: "other_rule", severity: "warning" }),
    ];

    const filtered = applyReferenceLevel(results, 5);

    expect(filtered[0].severity).toBe("error"); // unsourced_critical
    expect(filtered[1].severity).toBe("error"); // vague_history
    expect(filtered[2].severity).toBe("warning"); // lore_coverage stays
    expect(filtered[3].severity).toBe("warning"); // other_rule stays
  });
});
