import { describe, it, expect } from "bun:test";
import { executeHarnessInSandbox } from "./sandbox";

describe("Sandbox Execution", () => {
  it("should successfully execute valid harness code", async () => {
    const code = `
      async function evaluate(draft, context) {
        return { valid: draft.includes("hero"), feedback: [] };
      }
    `;

    const result = await executeHarnessInSandbox(code, "the hero wins", { loreDb: {}, previousBeats: [], targetAudience: "general" });
    expect(result.valid).toBe(true);
  });

  it("should fail when code lacks evaluate function", async () => {
    const code = `const x = 1;`;
    expect(executeHarnessInSandbox(code, "text", { loreDb: {}, previousBeats: [], targetAudience: "general" }))
      .rejects.toThrow("The synthesized code must define an 'evaluate' function");
  });
});
