import { describe, it, expect } from "bun:test";
import { $ } from "bun";

describe("CLI", () => {
  it("should print help text when called with -h", async () => {
    const result = await $`bun run src/cli/index.ts -h`.quiet().nothrow();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("Usage: storyharness <command> [options]");
  });

  it("should error and exit 1 when called without a command", async () => {
    const result = await $`bun run src/cli/index.ts`.quiet().nothrow();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("Usage: storyharness <command> [options]");
  });

  it("should print an error when train is called without harness_name", async () => {
    const result = await $`bun run src/cli/index.ts train`.quiet().nothrow();
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Error: Must specify a harness name to train");
  });
});
