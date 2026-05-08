import { parseArgs } from "util";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { HarnessSynthesizer } from "../synthesizer";
import { RejectionSamplingRunner } from "../runner";
import { MultiSectionRunner } from "../runner/multi-section";
import { loadTrajectories } from "../environment/trajectory";
import { loadPrompt } from "./prompt-loader";
import {
  type WriterPersona,
  createPersona,
  GENRES,
  TONES,
  STYLES,
  AUDIENCE_AGES,
  EMPHASES,
} from "../persona";
import { getEnabledHarnesses } from "../persona/harness-map";
import { buildGenerationPrompt } from "../persona/prompt-builder";

const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    auto: {
      type: "boolean",
    },
    interactive: {
      type: "boolean",
    },
    mode: {
      type: "string",
      default: "code",
    },
    "ts-weight": {
      type: "string",
      default: "1.0",
    },
    "max-iterations": {
      type: "string",
      default: "10",
    },
    "max-retries": {
      type: "string",
      default: "5",
    },
    "multi-section": {
      type: "boolean",
    },
    "max-words-per-section": {
      type: "string",
      default: "1200",
    },
    persona: {
      type: "string",
    },
    plan: {
      type: "string",
    },
    harness: {
      type: "string",
    },
    lore: {
      type: "string",
    },
    merge: {
      type: "boolean",
    },
    continue: {
      type: "boolean",
    },
    out: {
      type: "string",
    },
  },
  strict: true,
  allowPositionals: true,
});

const command = positionals[2];

async function main() {
  if (values.help || !command) {
    console.log(`
Usage: storyharness <command> [options]

Commands:
  train <harness_name>        Train a specific sub-harness (e.g., LogicHarness)
  generate <prompt|file.md>   Generate a story from a prompt string or .md/.txt file
  split <prompt|file.md>      Split a long prompt into sections for review (saves plan JSON)
  check <draft|file.md>       Run harnesses against a draft and report issues (no correction)
  create-persona [name]       Interactively create a writer persona (saved as JSON)
  list-personas               List available personas in personas/ directory
  watch [session-dir]         Watch a running generation session (default: latest)
  do-research <path>          Auto-fill resolutions in a needs-research.json using an
                              LLM with Google Search grounding. Writes
                              <path>/needs-research-resolved.json (or --out).
                              Add --merge to also merge into the loreDb,
                              --continue to also re-run 'generate' afterward.
  resolve-research <path>     Merge a resolved needs-research.json back into the loreDb
                              <path> may be a session dir OR a direct file path.
                              Use --lore <path> to override the default target.

Options (train/generate):
  --mode <code|prompt>    Synthesis mode (default: code)
  --auto                  Run training to convergence automatically
  --interactive           Run training with human-in-the-loop approval
  --ts-weight <number>    Thompson Sampling weight parameter (default: 1.0)
  --max-retries <number>  Max generation rounds (default: 5)

Options (generate/split/check):
  --persona <path>            Use a writer persona JSON file (enables persona-specific harnesses)
  --multi-section             Split long stories into sections and generate iteratively
  --plan <plan.json>          Generate from a reviewed split plan (from 'split' command)
  --max-words-per-section <n> Max words per section (default: 1200)
  --harness <names>           Run specific harnesses only (comma-separated, e.g. Style,Logic,Character)
  --lore <path>               Path to a loreDb JSON (default: datasets/lore.json).
                              Also used by resolve-research as the merge target.

Options (do-research):
  --merge                     After auto-research, also merge accepted facts into the loreDb.
  --continue                  After --merge, also re-run 'generate' on the original prompt.
  --out <path>                Where to write the resolved file (default: <session>/needs-research-resolved.json).

  --help, -h              Show this help message

Video generation has been moved to the 'videoharness' project.
    `);
    process.exit(0);
  }

  switch (command) {
    case "train": {
      const harnessName = positionals[3];
      if (!harnessName) {
        console.error("Error: Must specify a harness name to train (e.g., LogicHarness)");
        process.exit(1);
      }
      const mode = (values.mode as "code" | "prompt" | "hybrid") || "code";
      console.log(`Starting training for ${harnessName} in ${mode} mode...`);
      console.log(`Optimization: ${values.auto ? "Auto" : values.interactive ? "Interactive" : "Default"}`);
      console.log(`Thompson Sampling Weight: ${values["ts-weight"]}`);
      
      const datasetPath = join("datasets", `${harnessName}.json`);
      const trajectories = await loadTrajectories(datasetPath);

      const synthesizer = new HarnessSynthesizer(harnessName, trajectories, {
        maxIterations: parseInt(values["max-iterations"] as string) || 10,
        tsWeight: parseFloat(values["ts-weight"] as string) || 1.0,
        auto: !!values.auto,
        logPath: join("datasets", `${harnessName}.log`),
        treeStatePath: join("datasets", `${harnessName}_tree.json`),
        mode,
      });

      await synthesizer.run();

      const tree = synthesizer.getTree();
      let bestNode = tree.getRoot();
      for (const node of tree.getAllNodes()) {
        if (node.heuristicValue > bestNode.heuristicValue) {
          bestNode = node;
        }
      }

      if (bestNode.code) {
        const extension = mode === "code" ? ".ts" : mode === "hybrid" ? ".hybrid.json" : ".prompt.txt";
        const harnessPath = join("harnesses", `${harnessName}${extension}`);
        await writeFile(harnessPath, bestNode.code, "utf-8");
        console.log(`Saved best ${mode} harness to ${harnessPath} with H=${bestNode.heuristicValue.toFixed(2)}`);
      } else {
        console.warn("Failed to generate a valid harness.");
      }
      break;
    }
    case "generate": {
      const promptInput = positionals[3];
      const planPath = values.plan as string | undefined;

      if (!promptInput && !planPath) {
        console.error("Error: Must specify a prompt, .md/.txt file, or --plan <plan.json>.");
        process.exit(1);
      }

      let prompt = "";
      if (planPath) {
        console.log("Using plan: " + planPath);
        // prompt is loaded from plan for context; sections drive generation
      }
      if (promptInput) {
        prompt = await loadPrompt(promptInput);
        const isFile = prompt !== promptInput;
        if (isFile) {
          console.log("Loaded prompt from file: " + promptInput + " (" + prompt.length + " chars)");
        } else {
          console.log('Generating story from prompt: "' + prompt + '"');
        }
      }

      // Load persona if specified
      let persona: WriterPersona | undefined;
      let enabledHarnesses: string[] | undefined;
      let systemPrompt: string | undefined;
      let targetAudience = "general";
      let personaConfig: import("../persona/persona-config").PersonaConfig | undefined;

      if (values.persona) {
        try {
          const { resolvePersonaConfig } = await import("../persona/persona-config");
          const personaRaw = await readFile(values.persona, "utf-8");
          persona = JSON.parse(personaRaw) as WriterPersona;
          enabledHarnesses = persona.enabledHarnesses ?? getEnabledHarnesses(persona);
          systemPrompt = buildGenerationPrompt(persona);
          personaConfig = persona.checkerConfig ?? resolvePersonaConfig(persona);
          targetAudience = persona.audienceAge === "children" ? "children"
            : persona.audienceAge === "young-adult" ? "young adult"
            : persona.audienceAge === "adult" ? "adult"
            : "general";
          console.log(`Using persona: "${persona.name}" (${persona.genre}/${persona.tone}/${persona.style})`);
          console.log(`Enabled harnesses: ${enabledHarnesses.join(", ")}`);
          const disabledCheckers = Object.entries(personaConfig.enabledCheckers)
            .filter(([, v]) => !v).map(([k]) => k);
          if (disabledCheckers.length > 0) {
            console.log(`Disabled checkers: ${disabledCheckers.join(", ")}`);
          }
        } catch (e: any) {
          console.error(`Error loading persona from ${values.persona}: ${e.message}`);
          process.exit(1);
        }
      }
      
      const lorePathForGen = (values.lore as string | undefined) || "datasets/lore.json";
      let loreDb = {};
      try {
        const loreRaw = await readFile(lorePathForGen, "utf-8");
        loreDb = JSON.parse(loreRaw);
        console.log(`Loaded loreDb: ${lorePathForGen} (${Object.keys(loreDb).length} top-level keys)`);
      } catch (e) {
        console.warn(`Could not load ${lorePathForGen}. Continuing with empty lore.`);
      }

      const maxRetries = parseInt(values["max-retries"] as string) || 5;

      if (planPath || values["multi-section"]) {
        const maxWordsPerSection = parseInt(values["max-words-per-section"] as string) || 1200;

        if (planPath) {
          // Generate from a pre-reviewed plan file
          const planRaw = await readFile(planPath, "utf-8");
          const plan = JSON.parse(planRaw);
          const sections = plan.sections as Array<{ title: string; prompt: string; estimatedWords: number }>;

          if (!sections || sections.length === 0) {
            console.error("Error: Plan file has no sections.");
            process.exit(1);
          }

          console.log("Generating from plan: " + sections.length + " section(s)");

          const runner = new RejectionSamplingRunner({
            harnessDirectory: "harnesses",
            maxRetries,
            loreDb,
            targetAudience,
            enabledHarnesses,
            systemPrompt,
            personaConfig,
          });

          const generatedSections: Array<{ title: string; content: string }> = [];
          for (let i = 0; i < sections.length; i++) {
            const s = sections[i];
            const divider = "=".repeat(60);
            console.log("\n" + divider + "\nSection " + (i + 1) + "/" + sections.length + ": " + s.title + "\n" + divider);
            try {
              const content = await runner.generateScene(s.prompt);
              generatedSections.push({ title: s.title, content });
            } catch (err: any) {
              console.error("Section \"" + s.title + "\" failed: " + err.message);
              generatedSections.push({ title: s.title, content: "[Generation failed: " + err.message + "]" });
            }
          }

          const combined = generatedSections
            .map((s) => "## " + s.title + "\n\n" + s.content)
            .join("\n\n---\n\n");
          console.log("\n=== FINAL GENERATED STORY ===\n");
          console.log(combined);
          await mkdir("output", { recursive: true });
          const outTs = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const outPath = join("output", "story-" + outTs + ".md");
          await writeFile(outPath, combined, "utf-8");
          console.log("\n=== SUMMARY ===");
          console.log("Generated " + generatedSections.length + " section(s) from plan.");
          console.log("\x1b[32m\u2713\x1b[0m Saved to: \x1b[1m" + outPath + "\x1b[0m");
        } else {
          // Auto-split and generate
          const runner = new MultiSectionRunner({
            harnessDirectory: "harnesses",
            maxRetries,
            loreDb,
            targetAudience,
            maxWordsPerSection,
            enabledHarnesses,
            systemPrompt,
            personaConfig,
          });

          try {
            const result = await runner.generate(prompt);
            console.log("\n=== FINAL GENERATED STORY ===\n");
            console.log(result.combined);
            await mkdir("output", { recursive: true });
            const outTs2 = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const outPath2 = join("output", "story-" + outTs2 + ".md");
            await writeFile(outPath2, result.combined, "utf-8");
            console.log("\n=== SUMMARY ===");
            console.log("Generated " + result.sections.length + " section(s).");
            console.log("\x1b[32m\u2713\x1b[0m Saved to: \x1b[1m" + outPath2 + "\x1b[0m");
          } catch (e: any) {
            console.error("\nGeneration failed: " + e.message);
            process.exit(1);
          }
        }
      } else {
        const runner = new RejectionSamplingRunner({
          harnessDirectory: "harnesses",
          maxRetries,
          loreDb,
          targetAudience,
          enabledHarnesses,
          systemPrompt,
          personaConfig,
        });

        try {
          const story = await runner.generateScene(prompt);
          console.log("\n=== FINAL GENERATED STORY ===\n");
          console.log(story);
          await mkdir("output", { recursive: true });
          const outTs3 = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const outPath3 = join("output", "story-" + outTs3 + ".md");
          await writeFile(outPath3, story, "utf-8");
          console.log("\n\x1b[32m\u2713\x1b[0m Saved to: \x1b[1m" + outPath3 + "\x1b[0m");
        } catch (e: any) {
          console.error(`\nGeneration failed: ${e.message}`);
          process.exit(1);
        }
      }
      break;
    }
    case "check": {
      const draftInput = positionals[3];
      if (!draftInput) {
        console.error("Error: Must specify a draft text or .md/.txt file to check.");
        process.exit(1);
      }

      const draft = await loadPrompt(draftInput);
      const isFile = draft !== draftInput;
      console.log(isFile
        ? "Checking file: " + draftInput + " (" + draft.split(/\s+/).length + " words)"
        : "Checking inline draft (" + draft.split(/\s+/).length + " words)");

      // Load persona config if provided
      let personaConfigForCheck: import("../persona/persona-config").PersonaConfig | undefined;
      let harnessFilter: string[] | undefined;

      if (values.persona) {
        const { resolvePersonaConfig } = await import("../persona/persona-config");
        const personaRaw = await readFile(values.persona as string, "utf-8");
        const persona = JSON.parse(personaRaw) as WriterPersona;
        harnessFilter = persona.enabledHarnesses ?? getEnabledHarnesses(persona);
        personaConfigForCheck = persona.checkerConfig ?? resolvePersonaConfig(persona);
        console.log("Persona: " + persona.name + " (" + harnessFilter.length + " harnesses, " +
          Object.values(personaConfigForCheck.enabledCheckers).filter(Boolean).length + " checkers)");
      }

      // Apply --harness filter (overrides persona if both set)
      if (values.harness) {
        const requested = (values.harness as string).split(",").map(s => s.trim());
        harnessFilter = (harnessFilter ?? (await import("../persona/harness-map")).ALL_HARNESS_FILES.slice())
          .filter(f => requested.some(r => f.toLowerCase().includes(r.toLowerCase())));
        console.log("Harness filter: " + harnessFilter.join(", "));
      }

      // Build context
      const lorePathForCheck = (values.lore as string | undefined) || "datasets/lore.json";
      let loreDb = {};
      try {
        const loreRaw = await readFile(lorePathForCheck, "utf-8");
        loreDb = JSON.parse(loreRaw);
      } catch { /* no lore */ }

      const context: import("../types").HarnessContext = {
        loreDb,
        previousBeats: [],
        targetAudience: "general",
        personaConfig: personaConfigForCheck,
      };

      // Load harnesses
      const { readdir: readdirHarness } = await import("fs/promises");
      const { executeHarnessInSandbox } = await import("../environment/sandbox");
      const { executeHybridHarness } = await import("../environment/hybrid-harness");
      const { executeLlmHarness } = await import("../environment/llm-harness");
      const harnessDir = "harnesses";

      let files: string[] = [];
      try { files = await readdirHarness(harnessDir); } catch { /* no dir */ }

      const transpiler = new Bun.Transpiler({ loader: "ts" });
      let totalIssues = 0;
      let totalPassed = 0;

      console.log("\n\x1b[1;36m=== Running Checks ===\x1b[0m\n");

      // Gate 1: Code harnesses
      for (const file of files) {
        if (!((file.endsWith(".ts") || file.endsWith(".js")) && !file.includes(".test."))) continue;
        if (harnessFilter && !harnessFilter.includes(file)) continue;

        const raw = await readFile(join(harnessDir, file), "utf-8");
        const code = file.endsWith(".ts") ? transpiler.transformSync(raw) : raw;
        try {
          const result = await executeHarnessInSandbox(code, draft, context);
          if (result.valid) {
            console.log("  \x1b[32m\u2713\x1b[0m " + file);
            totalPassed++;
          } else {
            console.log("  \x1b[31m\u2717\x1b[0m " + file);
            for (const f of result.feedback) {
              console.log("    \x1b[31m- " + f + "\x1b[0m");
              totalIssues++;
            }
          }
        } catch (e: any) {
          console.log("  \x1b[33m\u26A0\x1b[0m " + file + " \x1b[2m(error: " + e.message + ")\x1b[0m");
        }
      }

      // Gate 2: Hybrid harnesses
      for (const file of files) {
        if (!file.endsWith(".hybrid.json")) continue;
        if (harnessFilter && !harnessFilter.includes(file)) continue;

        const raw = await readFile(join(harnessDir, file), "utf-8");
        try {
          const parsed = JSON.parse(raw);
          const domain = (parsed.domain || "logic") as import("../environment/hybrid-harness").HybridDomain;
          const result = await executeHybridHarness(
            parsed.extractionPromptAddendum || "",
            parsed.verificationCode || "",
            draft, context, domain
          );
          if (result.valid) {
            console.log("  \x1b[32m\u2713\x1b[0m " + file + " \x1b[2m(" + domain + ")\x1b[0m");
            totalPassed++;
          } else {
            console.log("  \x1b[31m\u2717\x1b[0m " + file + " \x1b[2m(" + domain + ")\x1b[0m");
            for (const f of result.feedback) {
              console.log("    \x1b[31m- " + f + "\x1b[0m");
              totalIssues++;
            }
          }
        } catch (e: any) {
          console.log("  \x1b[33m\u26A0\x1b[0m " + file + " \x1b[2m(error: " + e.message + ")\x1b[0m");
        }
      }

      // Gate 3: Prompt harnesses
      for (const file of files) {
        if (!file.endsWith(".prompt.txt")) continue;
        if (harnessFilter && !harnessFilter.includes(file)) continue;

        const promptText = await readFile(join(harnessDir, file), "utf-8");
        try {
          const result = await executeLlmHarness(promptText, draft, context);
          if (result.valid) {
            console.log("  \x1b[32m\u2713\x1b[0m " + file);
            totalPassed++;
          } else {
            console.log("  \x1b[31m\u2717\x1b[0m " + file);
            for (const f of result.feedback) {
              console.log("    \x1b[31m- " + f + "\x1b[0m");
              totalIssues++;
            }
          }
        } catch (e: any) {
          console.log("  \x1b[33m\u26A0\x1b[0m " + file + " \x1b[2m(error: " + e.message + ")\x1b[0m");
        }
      }

      // Summary
      console.log("\n\x1b[1m=== Summary ===\x1b[0m");
      if (totalIssues === 0) {
        console.log("  \x1b[32mAll checks passed!\x1b[0m (" + totalPassed + " harnesses)");
      } else {
        console.log("  \x1b[31m" + totalIssues + " issue(s) found\x1b[0m across " + totalPassed + " passed + failed harnesses");
      }
      break;
    }
    case "split": {
      const promptInput = positionals[3];
      if (!promptInput) {
        console.error("Error: Must specify a prompt or .md/.txt file path to split.");
        process.exit(1);
      }

      const prompt = await loadPrompt(promptInput);
      const maxWordsPerSection = parseInt(values["max-words-per-section"] as string) || 1200;

      console.log("\x1b[2mSplitting prompt into sections (target: ~" + maxWordsPerSection + " words each)...\x1b[0m");

      const { StorySplitter } = await import("../runner/story-splitter");
      const splitter = new StorySplitter({ maxWordsPerSection });
      const sections = await splitter.split(prompt);

      console.log("\n\x1b[1;36m=== Story Plan (" + sections.length + " sections) ===\x1b[0m\n");
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        console.log("  \x1b[1m" + (i + 1) + ". " + s.title + "\x1b[0m \x1b[2m(~" + s.estimatedWords + " words)\x1b[0m");
        console.log("     \x1b[2m" + s.prompt + "\x1b[0m");
        console.log("");
      }

      // Save plan
      const plansDir = "plans";
      await mkdir(plansDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const planFile = join(plansDir, "plan-" + timestamp + ".json");
      const plan = {
        originalPrompt: prompt,
        maxWordsPerSection,
        createdAt: new Date().toISOString(),
        sections,
      };
      await writeFile(planFile, JSON.stringify(plan, null, 2), "utf-8");

      console.log("\x1b[32m\u2713\x1b[0m Plan saved to: \x1b[1m" + planFile + "\x1b[0m");
      console.log("  Review and edit the plan, then generate:");
      console.log("  \x1b[36mbun run src/cli/index.ts generate --plan " + planFile + " --persona personas/your-persona.json\x1b[0m");
      break;
    }
    case "create-persona": {
      const readline = await import("readline");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ask = (q: string): Promise<string> =>
        new Promise((resolve) => rl.question(q, resolve));

      const selectOption = async (
        label: string,
        options: readonly string[],
        suggested?: string,
        reason?: string,
      ): Promise<string> => {
        console.log("\n" + label + ":");
        options.forEach((opt, i) => {
          const marker = (suggested && opt === suggested) ? " \x1b[32m<-- suggested\x1b[0m" : "";
          console.log("  " + (i + 1) + ". " + opt + marker);
        });
        const customIdx = options.length + 1;
        console.log("  " + customIdx + ". custom [type your own]");
        if (suggested && reason) {
          console.log("  \x1b[2mSuggested: " + suggested + " — " + reason + "\x1b[0m");
        }
        const defaultHint = suggested ? " [Enter = " + suggested + "]" : "";
        const answer = await ask("Choose (number)" + defaultHint + ": ");

        // Enter with no input → accept suggestion
        if (answer.trim() === "" && suggested) {
          return suggested;
        }

        const idx = parseInt(answer) - 1;
        if (idx === options.length) {
          const custom = await ask("Enter custom " + label.toLowerCase() + ": ");
          const value = custom.trim().toLowerCase().replace(/\s+/g, "-");
          if (!value) {
            const fallbackVal = suggested || options[0];
            console.log("Empty input, using: " + fallbackVal);
            return fallbackVal;
          }
          return value;
        }
        if (idx >= 0 && idx < options.length) return options[idx];
        const fallbackVal = suggested || options[0];
        console.log("Invalid choice, using: " + fallbackVal);
        return fallbackVal;
      };

      console.log("\x1b[1;36m=== Create Writer Persona ===\x1b[0m");
      const name = positionals[3] || (await ask("Persona name: "));

      // Ask LLM to suggest defaults based on persona name
      const { suggestPersonaDefaults } = await import("../persona/suggest");
      console.log("\n\x1b[2mAnalyzing persona name...\x1b[0m");
      const suggestions = await suggestPersonaDefaults(name);
      console.log("\x1b[32m✓\x1b[0m LLM suggestions ready.");

      const genre = await selectOption("Genre", GENRES, suggestions.genre, suggestions.reasons.genre);
      const tone = await selectOption("Tone", TONES, suggestions.tone, suggestions.reasons.tone);
      const style = await selectOption("Style", STYLES, suggestions.style, suggestions.reasons.style);
      const audienceAge = await selectOption("Target Audience", AUDIENCE_AGES, suggestions.audienceAge, suggestions.reasons.audienceAge);

      const customPromptAnswer = await ask("\nCustom writing instruction (optional, press Enter to skip): ");

      // Multi-select emphasis menu — sort suggestions to match menu order
      const rawSuggested = suggestions.emphasis || [];
      const suggestedEmphasis = [...rawSuggested].sort(
        (a, b) => (EMPHASES as readonly string[]).indexOf(a) - (EMPHASES as readonly string[]).indexOf(b)
      );
      console.log("\nEmphasis priorities (what matters most for this persona):");
      EMPHASES.forEach((e, i) => {
        const marker = suggestedEmphasis.includes(e) ? " \x1b[32m<-- suggested\x1b[0m" : "";
        console.log("  " + (i + 1) + ". " + e + marker);
      });
      if (suggestedEmphasis.length > 0 && suggestions.reasons.emphasis) {
        console.log("  \x1b[2mSuggested: " + suggestedEmphasis.join(", ") + " — " + suggestions.reasons.emphasis + "\x1b[0m");
      }
      const suggestedNums = suggestedEmphasis
        .map((e) => (EMPHASES as readonly string[]).indexOf(e) + 1)
        .filter((n) => n > 0);
      const defaultLabel = suggestedNums.length > 0
        ? " [Enter = " + suggestedNums.join(",") + "]"
        : "";
      const emphasisAnswer = await ask("Choose numbers (e.g. 1,3,5)" + defaultLabel + ": ");

      let selectedEmphasis: string[] | undefined;
      if (emphasisAnswer.trim() === "") {
        selectedEmphasis = suggestedEmphasis.length > 0 ? suggestedEmphasis : undefined;
      } else {
        const nums = emphasisAnswer.split(/[,\s]+/).map((s) => parseInt(s.trim()) - 1);
        selectedEmphasis = nums
          .filter((n) => n >= 0 && n < EMPHASES.length)
          .map((n) => EMPHASES[n]);
        if (selectedEmphasis.length === 0) selectedEmphasis = undefined;
      }

      // Resolve harnesses and checker config from genre
      const { resolvePersonaConfig: resolveConfig } = await import("../persona/persona-config");
      const { getReferenceLevelConfig } = await import("../reference/reference-level");
      const tempPersona = createPersona({ name, genre, tone, style, audienceAge });
      const enabled = getEnabledHarnesses(tempPersona);
      const checkerConfig = resolveConfig(tempPersona);

      // Reference level selection
      const REFERENCE_LEVELS = [
        { level: 1, name: "scan", desc: "catch obvious errors only" },
        { level: 2, name: "validate", desc: "standard assessment" },
        { level: 3, name: "scrutinize", desc: "skeptical, explicit reasoning" },
        { level: 4, name: "investigate", desc: "implicit claims + enrichment suggestions" },
        { level: 5, name: "research", desc: "full research consultant mode" },
      ] as const;
      // Prefer the LLM's persona-aware suggestion; fall back to genre preset.
      const suggestedLevel = suggestions.referenceLevel ?? checkerConfig.referenceLevel;
      if (suggestions.reasons.referenceLevel) {
        console.log("\n\x1b[2mLLM suggests reference level " + suggestedLevel + " — " + suggestions.reasons.referenceLevel + "\x1b[0m");
      }
      console.log("\nReference checking depth:");
      for (const rl of REFERENCE_LEVELS) {
        const marker = rl.level === suggestedLevel ? " \x1b[32m<-- suggested\x1b[0m" : "";
        console.log("  " + rl.level + ". " + rl.name + " (" + rl.desc + ")" + marker);
      }
      const refLevelAnswer = await ask("Choose (1-5) [Enter = " + suggestedLevel + "]: ");
      const parsedRefLevel = parseInt(refLevelAnswer.trim());
      const selectedRefLevel = (parsedRefLevel >= 1 && parsedRefLevel <= 5) ? parsedRefLevel : suggestedLevel;
      checkerConfig.referenceLevel = selectedRefLevel as import("../reference/reference-level").ReferenceLevel;

      const persona = createPersona({
        name,
        genre,
        tone,
        style,
        audienceAge,
        systemPrompt: customPromptAnswer.trim() || undefined,
        emphasis: selectedEmphasis as any,
        enabledHarnesses: enabled,
        checkerConfig,
      });

      // Show preview
      const { getExcludedHarnesses } = await import("../persona/harness-map");
      const { getExcludedCheckers, countEnabledRules } = await import("../persona/persona-config");
      const excludedHarnesses = getExcludedHarnesses(tempPersona);
      const excludedCheckers = getExcludedCheckers(tempPersona);
      const ruleCounts = countEnabledRules(tempPersona);

      console.log("\n\x1b[1;36m=== Persona Preview ===\x1b[0m");
      console.log("  \x1b[2mName:\x1b[0m     \x1b[1m" + persona.name + "\x1b[0m");
      console.log("  \x1b[2mGenre:\x1b[0m    \x1b[32m" + persona.genre + "\x1b[0m");
      console.log("  \x1b[2mTone:\x1b[0m     \x1b[32m" + persona.tone + "\x1b[0m");
      console.log("  \x1b[2mStyle:\x1b[0m    \x1b[32m" + persona.style + "\x1b[0m");
      console.log("  \x1b[2mAudience:\x1b[0m \x1b[32m" + persona.audienceAge + "\x1b[0m");
      if (persona.systemPrompt) console.log("  \x1b[2mCustom:\x1b[0m   " + persona.systemPrompt);
      if (persona.emphasis) console.log("  \x1b[2mEmphasis:\x1b[0m \x1b[32m" + persona.emphasis.join(", ") + "\x1b[0m");

      const refLevelInfo = getReferenceLevelConfig(checkerConfig.referenceLevel);
      console.log("\n  \x1b[1mValidation Pipeline\x1b[0m");
      console.log("  \x1b[2mHarnesses:\x1b[0m  \x1b[33m" + enabled.length + "/10 enabled\x1b[0m");
      console.log("  \x1b[2mRules:\x1b[0m      \x1b[33m" + ruleCounts.enabled + "/" + ruleCounts.total + " active\x1b[0m");
      console.log("  \x1b[2mRef Level:\x1b[0m  \x1b[33m" + checkerConfig.referenceLevel + "/5 " + refLevelInfo.name + "\x1b[0m");

      if (excludedHarnesses.length > 0) {
        console.log("\n  \x1b[1mExcluded Harnesses\x1b[0m");
        for (const h of excludedHarnesses) {
          console.log("  \x1b[31m  ✗ " + h.file + "\x1b[0m");
          console.log("  \x1b[2m    " + h.description + "\x1b[0m");
          console.log("  \x1b[2m    Why: " + h.reason + "\x1b[0m");
        }
      }

      if (excludedCheckers.length > 0) {
        console.log("\n  \x1b[1mExcluded Checkers\x1b[0m");
        for (const c of excludedCheckers) {
          console.log("  \x1b[31m  ✗ " + c.checker + "\x1b[0m \x1b[2m(" + c.rules + " rules)\x1b[0m");
          console.log("  \x1b[2m    " + c.description + "\x1b[0m");
          console.log("  \x1b[2m    Why: " + c.reason + "\x1b[0m");
        }
      }

      // Save — generate filename that preserves Unicode (CJK, etc.)
      const personasDir = "personas";
      await mkdir(personasDir, { recursive: true });
      let slug = name.replace(/\s+/g, "-").replace(/[/\\:*?"<>|]/g, "");
      if (!slug || slug === "-" || /^-+$/.test(slug)) {
        slug = "persona-" + Date.now();
      }
      const filename = slug + ".json";
      const filepath = join(personasDir, filename);
      await writeFile(filepath, JSON.stringify(persona, null, 2), "utf-8");
      console.log("\n\x1b[32m✓\x1b[0m Saved to: \x1b[1m" + filepath + "\x1b[0m");
      console.log("  Run: \x1b[36mbun run src/cli/index.ts generate \"your prompt\" --persona " + filepath + "\x1b[0m");

      rl.close();
      break;
    }
    case "list-personas": {
      const { readdir: readdirPersonas } = await import("fs/promises");
      const personasDir = "personas";
      try {
        const files = await readdirPersonas(personasDir);
        const jsonFiles = files.filter((f) => f.endsWith(".json"));
        if (jsonFiles.length === 0) {
          console.log("No personas found. Create one with: bun run src/cli/index.ts create-persona");
          break;
        }
        console.log("Available personas:\n");
        for (const file of jsonFiles) {
          try {
            const raw = await readFile(join(personasDir, file), "utf-8");
            const p = JSON.parse(raw) as WriterPersona;
            const enabled = getEnabledHarnesses(p);
            console.log("  " + file);
            console.log("    Name: " + p.name + " | Genre: " + p.genre + " | Tone: " + p.tone + " | Style: " + p.style);
            console.log("    Harnesses: " + enabled.length + " enabled");
            console.log("");
          } catch {
            console.log("  " + file + " (invalid JSON)");
          }
        }
      } catch {
        console.log("No personas/ directory found. Create one with: bun run src/cli/index.ts create-persona");
      }
      break;
    }
    case "watch": {
      const { readdir: readdirSync, readFile: readFileSync, stat } = await import("fs/promises");
      const logRoot = "logs";
      let sessionDir = positionals[3];

      if (!sessionDir) {
        // Find latest session directory
        try {
          const entries = await readdirSync(logRoot);
          const sessions = entries.filter(e => e.startsWith("generate-")).sort();
          if (sessions.length === 0) {
            console.error("No generation sessions found in logs/");
            process.exit(1);
          }
          sessionDir = join(logRoot, sessions[sessions.length - 1]);
        } catch {
          console.error("No logs/ directory found. Run 'generate' first.");
          process.exit(1);
        }
      }

      console.log(`Watching: ${sessionDir}`);
      let lastRound = -1;
      let lastAttempts = 0;

      const poll = async () => {
        try {
          const raw = await readFileSync(join(sessionDir!, "status.json"), "utf-8");
          const status = JSON.parse(raw);

          if (status.totalAttempts > lastAttempts) {
            // New activity — print what's new
            const summaryRaw = await readFileSync(join(sessionDir!, "summary.json"), "utf-8");
            const summary = JSON.parse(summaryRaw);

            for (let i = lastAttempts; i < summary.attempts.length; i++) {
              const a = summary.attempts[i];
              const roundLabel = a.patchInRound !== null
                ? `Round ${a.round} Patch ${a.patchInRound}`
                : `Round ${a.round}`;
              const result = a.valid ? "✓ ACCEPTED" : `✗ ${a.feedback.length} issue(s)`;
              console.log(`[${status.updatedAt}] ${roundLabel}: ${result}`);

              if (!a.valid && a.feedback.length > 0) {
                for (const f of a.feedback.slice(0, 5)) {
                  console.log(`  - ${f.slice(0, 100)}`);
                }
                if (a.feedback.length > 5) {
                  console.log(`  ... and ${a.feedback.length - 5} more`);
                }
              }
            }
            lastAttempts = summary.attempts.length;
            lastRound = status.round;
          }

          if (status.state === "accepted") {
            console.log("\n🎉 Story accepted!");
            process.exit(0);
          } else if (status.state === "failed") {
            console.log("\n❌ Generation failed after all rounds.");
            process.exit(1);
          }
        } catch {
          // status.json not yet written, wait
        }
      };

      // Poll every 2 seconds
      const interval = setInterval(poll, 2000);
      await poll(); // Initial check
      // Keep alive until process exits via poll callbacks
      await new Promise(() => {}); // Block forever (poll exits via process.exit)
      break;
    }
    case "do-research": {
      const inputPath = positionals[3];
      if (!inputPath) {
        console.error("Error: must specify a session directory OR a needs-research.json file path.");
        console.error("  Example: bun run src/cli/index.ts do-research logs/generate-2026-05-08T04-52-40-187Z --merge --continue --persona personas/your.json");
        process.exit(1);
      }

      const { stat } = await import("fs/promises");
      const { dirname } = await import("path");
      const { autoResearch } = await import("../reference/auto-research");
      const { mergeResolvedIntoLore } = await import("../reference/needs-research");

      // Resolve to a needs-research.json file path + carry the surrounding dir.
      let researchFile: string;
      let sessionDir: string;
      try {
        const info = await stat(inputPath);
        if (info.isDirectory()) {
          researchFile = join(inputPath, "needs-research.json");
          sessionDir = inputPath;
        } else {
          researchFile = inputPath;
          sessionDir = dirname(inputPath);
        }
      } catch {
        console.error("Error: path not found: " + inputPath);
        process.exit(1);
      }

      let needsResearch: import("../reference/needs-research").NeedsResearchOutput;
      try {
        const raw = await readFile(researchFile, "utf-8");
        needsResearch = JSON.parse(raw);
      } catch (e: any) {
        console.error("Error reading " + researchFile + ": " + e.message);
        process.exit(1);
      }

      const total = needsResearch.items.length;
      const unresolved = needsResearch.items.filter((it) => !it.resolution).length;
      console.log("\n\x1b[1;36m=== Auto-Research ===\x1b[0m");
      console.log("  Source:     " + researchFile);
      console.log("  Total:      " + total + " item(s)");
      console.log("  To resolve: " + unresolved + " item(s)");
      console.log("");

      const resolved = await autoResearch(needsResearch, {
        onProgress: (item, i, n) => {
          const trunc = item.claim.length > 80 ? item.claim.slice(0, 77) + "..." : item.claim;
          const upcoming = i + 1;
          // Only count unresolved; pre-resolved items are skipped silently.
          console.log("  \x1b[2m[" + upcoming + "/" + n + "]\x1b[0m researching: " + trunc);
        },
      });

      const outPath = (values.out as string | undefined) || join(sessionDir, "needs-research-resolved.json");
      await writeFile(outPath, JSON.stringify(resolved, null, 2) + "\n", "utf-8");

      const acceptedCount = resolved.items.filter((it) => it.resolution?.addToLoreDb === true).length;
      const rejectedCount = resolved.items.filter((it) => it.resolution && !it.resolution.addToLoreDb).length;
      console.log("\n  \x1b[32m✓ Wrote " + outPath + "\x1b[0m");
      console.log("  \x1b[32m  " + acceptedCount + " item(s)\x1b[0m marked addToLoreDb=true");
      if (rejectedCount > 0) {
        console.log("  \x1b[33m  " + rejectedCount + " item(s)\x1b[0m skipped (LLM judged not reusable or parse failed)");
      }

      // --- Optional: --merge step ---
      if (values.merge) {
        const lorePath = (values.lore as string | undefined) || "datasets/lore.json";
        let existingLore: Record<string, any> = {};
        try {
          existingLore = JSON.parse(await readFile(lorePath, "utf-8"));
        } catch {
          console.log("  \x1b[2m(no existing " + lorePath + " — creating new file)\x1b[0m");
        }
        const { updatedLore, addedCount, skippedCount } = mergeResolvedIntoLore(resolved, existingLore);
        await writeFile(lorePath, JSON.stringify(updatedLore, null, 2) + "\n", "utf-8");
        console.log("\n\x1b[1;36m=== Merge ===\x1b[0m");
        console.log("  Target: " + lorePath);
        console.log("  \x1b[32m✓ Added " + addedCount + " fact(s)\x1b[0m to references");
        if (skippedCount > 0) {
          console.log("  \x1b[2m  Skipped " + skippedCount + " (no resolution OR addToLoreDb=false)\x1b[0m");
        }
      }

      // --- Optional: --continue step ---
      if (values.continue) {
        if (!values.merge) {
          console.warn("\n\x1b[33m--continue without --merge: re-running generate without the new facts.\x1b[0m");
        }
        const promptPath = join(sessionDir, "prompt.md");
        try {
          await stat(promptPath);
        } catch {
          console.error("\nError: --continue requires a prompt.md in " + sessionDir + " (none found).");
          process.exit(1);
        }
        if (!values.persona) {
          console.error("\nError: --continue requires --persona <path> so we know how to re-generate.");
          process.exit(1);
        }

        console.log("\n\x1b[1;36m=== Continuing: re-running generate ===\x1b[0m");
        const args = [
          "run", "src/cli/index.ts",
          "generate", promptPath,
          "--persona", values.persona as string,
          "--lore", (values.lore as string | undefined) || "datasets/lore.json",
        ];
        if (values["max-retries"]) {
          args.push("--max-retries", values["max-retries"] as string);
        }
        if (values["multi-section"]) {
          args.push("--multi-section");
        }
        console.log("  $ bun " + args.join(" "));
        const proc = Bun.spawn(["bun", ...args], { stdout: "inherit", stderr: "inherit" });
        const exitCode = await proc.exited;
        if (exitCode !== 0) {
          console.error("\nGenerate exited with code " + exitCode);
          process.exit(exitCode);
        }
      }
      break;
    }
    case "resolve-research": {
      const inputPath = positionals[3];
      if (!inputPath) {
        console.error("Error: must specify a session directory OR a needs-research.json file path.");
        console.error("  Example: bun run src/cli/index.ts resolve-research logs/generate-2026-05-01T06-08-47");
        console.error("           bun run src/cli/index.ts resolve-research path/to/needs-research.json");
        process.exit(1);
      }

      const { stat } = await import("fs/promises");
      const { mergeResolvedIntoLore } = await import("../reference/needs-research");

      // Resolve the path: dir → look for needs-research.json inside; else use as file path.
      let researchFile: string;
      try {
        const info = await stat(inputPath);
        researchFile = info.isDirectory() ? join(inputPath, "needs-research.json") : inputPath;
      } catch {
        console.error("Error: path not found: " + inputPath);
        process.exit(1);
      }

      let resolved: import("../reference/needs-research").NeedsResearchOutput;
      try {
        const raw = await readFile(researchFile, "utf-8");
        resolved = JSON.parse(raw);
      } catch (e: any) {
        console.error("Error reading " + researchFile + ": " + e.message);
        process.exit(1);
      }

      const lorePath = (values.lore as string | undefined) || "datasets/lore.json";
      let existingLore: Record<string, any> = {};
      try {
        const loreRaw = await readFile(lorePath, "utf-8");
        existingLore = JSON.parse(loreRaw);
      } catch {
        console.log("\x1b[2m(no existing " + lorePath + " — creating new file)\x1b[0m");
      }

      const { updatedLore, addedCount, skippedCount } = mergeResolvedIntoLore(resolved, existingLore);

      await writeFile(lorePath, JSON.stringify(updatedLore, null, 2) + "\n", "utf-8");

      console.log("\n\x1b[1;36m=== Resolve Research ===\x1b[0m");
      console.log("  \x1b[2mSource:\x1b[0m " + researchFile);
      console.log("  \x1b[2mTarget:\x1b[0m " + lorePath);
      console.log("  \x1b[32m✓ Added " + addedCount + " verified fact(s)\x1b[0m under `references`");
      if (skippedCount > 0) {
        console.log("  \x1b[33m• Skipped " + skippedCount + " item(s)\x1b[0m (no resolution OR addToLoreDb=false)");
      }
      break;
    }
    default: {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
