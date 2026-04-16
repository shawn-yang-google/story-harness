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
