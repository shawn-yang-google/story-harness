import { readFile } from "fs/promises";
import type { Trajectory } from "../types";

/**
 * Loads a dataset of trajectories from a JSON file.
 * Expected format: array of Trajectory objects.
 */
export async function loadTrajectories(filePath: string): Promise<Trajectory[]> {
  try {
    const data = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      throw new Error("Dataset file must contain a JSON array of trajectories.");
    }

    // Basic runtime validation
    for (let i = 0; i < parsed.length; i++) {
      const t = parsed[i];
      if (typeof t.text !== "string" || !["good", "bad"].includes(t.label)) {
        throw new Error(`Invalid trajectory at index ${i}: must have 'text' string and 'label' ("good" | "bad").`);
      }
    }

    return parsed as Trajectory[];
  } catch (error: any) {
    throw new Error(`Failed to load trajectories from ${filePath}: ${error.message}`);
  }
}
