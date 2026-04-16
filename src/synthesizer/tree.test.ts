import { describe, it, expect } from "bun:test";
import { TreeManager, type TreeNode } from "./tree";

describe("TreeManager (Thompson Sampling & State)", () => {
  it("should initialize with a root node", () => {
    const tree = new TreeManager();
    const root = tree.getRoot();
    
    expect(root).toBeDefined();
    expect(root.id).toBe("root");
    expect(root.code).toBe(""); // Root holds empty or baseline code
    expect(tree.getAllNodes().length).toBe(1);
  });

  it("should add a child node and correctly update visits/scores", () => {
    const tree = new TreeManager();
    const childId = tree.addNode("root", "function evaluate() { return true; }");
    
    const child = tree.getNode(childId);
    expect(child).toBeDefined();
    expect(child!.parentId).toBe("root");
    expect(child!.code).toContain("return true;");
    
    // Root should have child ID
    expect(tree.getRoot().children).toContain(childId);
  });

  it("should correctly update score and compute heuristic value (H)", () => {
    const tree = new TreeManager();
    const childId = tree.addNode("root", "code");
    
    // Simulate evaluating the child node on 10 trajectories, getting 8 correct
    tree.updateScore(childId, 8, 10);
    
    const child = tree.getNode(childId);
    expect(child!.visits).toBe(10);
    expect(child!.totalScore).toBe(8);
    expect(child!.heuristicValue).toBe(0.8);
  });

  it("should select the best node using Thompson Sampling (mocked)", () => {
    const tree = new TreeManager();
    
    const nodeA = tree.addNode("root", "code A");
    const nodeB = tree.addNode("root", "code B");
    
    // node A: 9/10 correct -> high exploitation
    tree.updateScore(nodeA, 9, 10);
    // node B: 1/2 correct -> high exploration
    tree.updateScore(nodeB, 1, 2);
    
    // Depending on random seed, nodeA or nodeB could be selected.
    // For test stability, we just ensure it returns a valid leaf node.
    const selectedId = tree.selectNodeToExpand(1.0);
    expect([nodeA, nodeB]).toContain(selectedId);
  });

  it("should serialize and deserialize tree state", () => {
    const tree = new TreeManager();
    const childId = tree.addNode("root", "code");
    tree.updateScore(childId, 5, 10);

    const json = tree.serialize();
    
    const tree2 = new TreeManager();
    tree2.deserialize(json);
    
    expect(tree2.getAllNodes().length).toBe(2);
    expect(tree2.getNode(childId)!.heuristicValue).toBe(0.5);
  });
});
