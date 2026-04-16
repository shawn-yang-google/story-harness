import { randomBytes } from "crypto";
import type { FailedExample } from "../types";

export interface TreeNode {
  id: string;
  parentId: string | null;
  children: string[];
  code: string;
  visits: number;       // total trajectories evaluated
  totalScore: number;   // correct evaluations
  heuristicValue: number; // H = totalScore / visits
  failedExamples: FailedExample[]; // Examples where the code failed
}

export class TreeManager {
  private nodes: Map<string, TreeNode>;
  private rootId: string;

  constructor() {
    this.nodes = new Map();
    this.rootId = "root";
    this.nodes.set(this.rootId, {
      id: this.rootId,
      parentId: null,
      children: [],
      code: "",
      visits: 0,
      totalScore: 0,
      heuristicValue: 0,
      failedExamples: [],
    });
  }

  getRoot(): TreeNode {
    return this.nodes.get(this.rootId)!;
  }

  getNode(id: string): TreeNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): TreeNode[] {
    return Array.from(this.nodes.values());
  }

  addNode(parentId: string, code: string): string {
    const id = `node_${randomBytes(4).toString("hex")}`;
    const parent = this.nodes.get(parentId);
    if (!parent) {
      throw new Error(`Parent node ${parentId} not found`);
    }

    const newNode: TreeNode = {
      id,
      parentId,
      children: [],
      code,
      visits: 0,
      totalScore: 0,
      heuristicValue: 0,
      failedExamples: [],
    };

    this.nodes.set(id, newNode);
    parent.children.push(id);

    return id;
  }

  updateScore(id: string, correct: number, total: number, failedExamples: FailedExample[] = [], penalty: number = 0) {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node ${id} not found`);
    }

    node.visits += total;
    node.totalScore += correct;
    node.heuristicValue = (node.visits > 0 ? node.totalScore / node.visits : 0) - penalty;
    node.failedExamples = failedExamples;
  }

  /**
   * Selects a leaf node to expand using Thompson Sampling.
   * Assumes Beta(alpha, beta) distribution where:
   * alpha = 1 + successes
   * beta = 1 + failures
   * 
   * A higher tsWeight can be used to scale the beta distribution or just sample standardly.
   * We sample a value for each leaf and pick the maximum.
   */
  selectNodeToExpand(tsWeight: number = 1.0): string {
    const leaves = this.getAllNodes().filter(n => n.children.length === 0);
    
    if (leaves.length === 0) {
      return this.rootId;
    }

    let bestNodeId = leaves[0].id;
    let maxSample = -1;

    for (const leaf of leaves) {
      // In a real Beta distribution, we'd use a proper random generator.
      // Here, we'll approximate sampling from Beta(alpha, beta) using a simple mean + noise heuristic
      // for the MVP, or implement a basic Beta sampler.
      
      // alpha = 1 + totalScore
      // beta = 1 + (visits - totalScore)
      const alpha = 1 + leaf.totalScore;
      const beta = 1 + (leaf.visits - leaf.totalScore);
      
      // A naive approximation of sampling from Beta(alpha, beta):
      // The mean is alpha / (alpha + beta)
      // We'll just use a random value centered around the mean with variance based on visits.
      // Better approach for JS without a stats lib: use standard Math.random() trick for Beta
      
      const sample = this.sampleBeta(alpha, beta);
      // We can apply tsWeight to influence exploration (e.g. by flattening the distribution if weight > 1)
      // but for simplicity we'll just use the raw sample.
      
      if (sample > maxSample) {
        maxSample = sample;
        bestNodeId = leaf.id;
      }
    }

    return bestNodeId;
  }

  // Simple approximation or actual Beta sampler
  // Using the inverse transform or simple rejection sampling is complex in raw JS.
  // We'll use a fast but rough approximation for Thompson sampling:
  // Sample from Gamma(alpha, 1) and Gamma(beta, 1) to get Beta.
  private sampleBeta(alpha: number, beta: number): number {
    const x = this.sampleGamma(alpha);
    const y = this.sampleGamma(beta);
    if (x + y === 0) return 0;
    return x / (x + y);
  }

  // Very basic Gamma sampler (only accurate for integer shape parameters alpha, which we have)
  private sampleGamma(shape: number): number {
    let sum = 0;
    for (let i = 0; i < shape; i++) {
      sum += -Math.log(Math.random());
    }
    return sum;
  }

  serialize(): string {
    const obj = Object.fromEntries(this.nodes);
    return JSON.stringify(obj, null, 2);
  }

  deserialize(json: string) {
    const obj = JSON.parse(json);
    this.nodes = new Map(Object.entries(obj));
    
    // Defensive check: ensure rootId points to an existing node,
    // or fallback to finding the node with no parent.
    if (!this.nodes.has(this.rootId)) {
      const rootNode = Array.from(this.nodes.values()).find(n => n.parentId === null);
      if (rootNode) {
        this.rootId = rootNode.id;
      }
    }
  }
}