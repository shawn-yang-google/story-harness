#!/usr/bin/env bun
/**
 * Q1 LLM-judge: takes a session directory and a prompt file, builds the
 * judge prompt described in q1-judge-prompt.md, sends it to the evaluator
 * model via the project's existing LLM module, and prints the JSON
 * verdict to stdout.
 *
 * Usage:
 *   bun run scripts/q1-judge.ts <session_dir> <prompt_file> [judge_template]
 *
 * The judge_template defaults to the q1-judge-prompt.md in the project
 * temp directory.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { MODELS, generateContent } from "../src/llm";

async function main(): Promise<number> {
  const [, , sessionDir, promptFile, templateArg] = process.argv;
  if (!sessionDir || !promptFile) {
    console.error(
      "Usage: bun run scripts/q1-judge.ts <session_dir> <prompt_file> [judge_template]"
    );
    return 2;
  }

  const template =
    templateArg ??
    "/usr/local/google/home/xiaolongyang/.gemini/tmp/storyharness/q1-judge-prompt.md";

  const draftPath = join(sessionDir, "best-draft.md");
  if (!existsSync(draftPath)) {
    console.error(`ERROR: ${draftPath} does not exist.`);
    return 1;
  }

  const prompt = readFileSync(promptFile, "utf-8");
  const draft = readFileSync(draftPath, "utf-8");
  const tplRaw = readFileSync(template, "utf-8");
  // The template embeds the rubric BELOW a horizontal rule; only the
  // "below the ---" portion is the actual prompt to send to the model.
  const tpl = tplRaw.split(/^---\s*$/m).slice(1).join("---");
  if (!tpl.trim()) {
    console.error(`ERROR: judge template ${template} has no body below ---`);
    return 1;
  }

  const filled = tpl
    .replace("{{PROMPT}}", prompt)
    .replace("{{DRAFT}}", draft);

  const response = await generateContent(MODELS.EVALUATOR, filled, undefined, 0);
  process.stdout.write(response);
  return 0;
}

main().then((code) => process.exit(code));
