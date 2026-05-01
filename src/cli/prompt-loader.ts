import { readFile, access } from "fs/promises";
import { extname } from "path";

/** File extensions recognized as loadable prompt files. */
const LOADABLE_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);

/**
 * Loads a prompt from a file path or returns the string as-is.
 *
 * If the input looks like a file path (has a recognized extension like .md,
 * .markdown, or .txt), it reads the file content and returns it.
 * Otherwise, it returns the input string unchanged.
 *
 * @param input - A file path or a plain prompt string.
 * @returns The prompt text content.
 * @throws If the input is a recognized file path but the file doesn't exist.
 */
export async function loadPrompt(input: string): Promise<string> {
  const ext = extname(input).toLowerCase();

  if (!LOADABLE_EXTENSIONS.has(ext)) {
    return input;
  }

  // It looks like a file path — verify it exists, then read it.
  await access(input); // throws ENOENT if missing
  const content = await readFile(input, "utf-8");
  return content;
}
