import { describe, it, expect, afterAll } from "bun:test";
import { loadPrompt } from "./prompt-loader";
import { writeFile, rm, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("loadPrompt", () => {
  const tmpDir = join(tmpdir(), "storyharness-prompt-test-" + process.pid);

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  //#given a .md file path
  it("should load content from a .md file", async () => {
    await mkdir(tmpDir, { recursive: true });
    const mdPath = join(tmpDir, "story.md");
    await writeFile(mdPath, "# My Story\n\nA detective investigates a murder.", "utf-8");

    //#when loadPrompt is called with the .md path
    const result = await loadPrompt(mdPath);

    //#then it returns the file content
    expect(result).toContain("A detective investigates a murder.");
    expect(result).toContain("# My Story");
  });

  //#given a .txt file path
  it("should load content from a .txt file", async () => {
    await mkdir(tmpDir, { recursive: true });
    const txtPath = join(tmpDir, "story.txt");
    await writeFile(txtPath, "A short story about a cat.", "utf-8");

    //#when loadPrompt is called with the .txt path
    const result = await loadPrompt(txtPath);

    //#then it returns the file content
    expect(result).toBe("A short story about a cat.");
  });

  //#given a plain string (not a file path)
  it("should return the string as-is when it is not a file path", async () => {
    //#when loadPrompt is called with a plain prompt string
    const result = await loadPrompt("Write a story about a dragon");

    //#then it returns the string unchanged
    expect(result).toBe("Write a story about a dragon");
  });

  //#given a .md file path that does not exist
  it("should throw an error for non-existent files", async () => {
    //#when loadPrompt is called with a non-existent .md path
    //#then it throws
    await expect(loadPrompt("/nonexistent/path/story.md")).rejects.toThrow();
  });

  //#given a file path with .markdown extension
  it("should load content from a .markdown file", async () => {
    await mkdir(tmpDir, { recursive: true });
    const mdPath = join(tmpDir, "story.markdown");
    await writeFile(mdPath, "A markdown story.", "utf-8");

    const result = await loadPrompt(mdPath);
    expect(result).toBe("A markdown story.");
  });
});
