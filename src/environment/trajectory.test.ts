import { describe, it, expect } from "bun:test";
import { loadTrajectories } from "./trajectory";
import { writeFile, unlink } from "fs/promises";

describe("Trajectory Loader", () => {
  const testFile = "test_trajectories.json";

  it("should load and parse valid trajectories", async () => {
    const data = [
      { text: "good story", label: "good" },
      { text: "bad story", label: "bad", flaws: ["boring"] }
    ];
    await writeFile(testFile, JSON.stringify(data));

    const trajectories = await loadTrajectories(testFile);
    expect(trajectories.length).toBe(2);
    expect(trajectories[0].text).toBe("good story");
    
    await unlink(testFile);
  });

  it("should error on invalid schemas", async () => {
    await writeFile(testFile, JSON.stringify([{ text: "story", label: "neutral" }]));
    
    await expect(loadTrajectories(testFile)).rejects.toThrow("Invalid trajectory at index 0");
    
    await unlink(testFile);
  });
});
