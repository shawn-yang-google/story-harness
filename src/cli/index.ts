import { parseArgs } from "util";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import { HarnessSynthesizer } from "../synthesizer";
import { RejectionSamplingRunner } from "../runner";
import { loadTrajectories } from "../environment/trajectory";

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
  generate <prompt>           Generate a story using the trained harnesses
  watch [session-dir]         Watch a running generation session (default: latest)

Options (train/generate):
  --mode <code|prompt>    Synthesis mode (default: code)
  --auto                  Run training to convergence automatically
  --interactive           Run training with human-in-the-loop approval
  --ts-weight <number>    Thompson Sampling weight parameter (default: 1.0)
  --max-retries <number>  Max generation rounds (default: 5)
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
      const prompt = positionals[3];
      if (!prompt) {
        console.error("Error: Must specify a prompt to generate from.");
        process.exit(1);
      }
      console.log(`Generating story from prompt: "${prompt}"`);
      
      let loreDb = {};
      try {
        const loreRaw = await readFile("datasets/lore.json", "utf-8");
        loreDb = JSON.parse(loreRaw);
      } catch (e) {
        console.warn("Could not load datasets/lore.json. Continuing with empty lore.");
      }

      const maxRetries = parseInt(values["max-retries"] as string) || 5;
      const runner = new RejectionSamplingRunner({
        harnessDirectory: "harnesses",
        maxRetries,
        loreDb,
        targetAudience: "general",
      });

      try {
        const story = await runner.generateScene(prompt);
        console.log("\n=== FINAL GENERATED STORY ===\n");
        console.log(story);
      } catch (e: any) {
        console.error(`\nGeneration failed: ${e.message}`);
        process.exit(1);
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
