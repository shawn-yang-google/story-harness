# StoryHarness: Implementation Plan

## 1. Executive Summary
StoryHarness is a standalone Bun/TypeScript CLI application that adapts the "AutoHarness" methodology (LLM-synthesized code harnesses via tree-search) from game environments to narrative generation. It uses a rejection-sampling loop where an LLM drafts story text, and an ensemble of programmatically synthesized sub-harnesses rigorously verifies and rejects invalid drafts until a high-quality narrative is produced.

## 2. Core Architecture

The system consists of three distinct layers:

### A. The Surrogate Environment (The "Game" Rulebook)
Unlike chess where legal moves are hardcoded in an engine, narrative rules are subjective. We simulate the game environment using a **Four-Tier Evaluation System**:
*   **Tier 1 (Code Harness):** Fast, deterministic, **synthesized** TypeScript functions that evaluate text (e.g., regex for clichés, length constraints, entity tracking). Trained by Tier 4.
*   **Tier 2 (Hybrid Harness):** "LLM Extracts, Code Verifies" — **expert-crafted** extraction prompts and 48 deterministic checker modules across 4 domains (logic, dialogue, character, narrative). NOT trained by Tier 4.
*   **Tier 3 (Prompt Harness):** Pure LLM evaluation prompts for subjective domains (style, emotion, tension). **Synthesized** prompt text, trained by Tier 4.
*   **Tier 4 (LLM-as-Judge):** A strict, prompt-engineered LLM (Gemini 2.5 Pro) that evaluates narrative trajectories to provide ground-truth labels for training Tier 1 and Tier 3 only. Never used at inference time.

> **Terminology note:** This document uses "rejection-sampling loop" loosely. The training phase is technically **tree-search optimization with Thompson sampling**; the inference phase is a **gated refinement loop with diff-based patching**. The term conveys the core intuition — generate candidates, reject bad ones — but is not used in the strict statistical sense.

### B. The Harness Synthesizer (Training Phase)
An offline process that automatically generates the Tier 1 code harnesses.
*   **Algorithm:** Tree-search guided by Thompson Sampling.
*   **Scoring Function (Heuristic Value $H$):** $H = \frac{\text{correct\_rejections} + \text{correct\_acceptances}}{\text{total\_trajectories}}$
    * A "correct" verdict means the Tier 1 harness matches the ground-truth label of the trajectory (or the Tier 4 LLM-as-Judge verdict).
*   **Process:** 
    1.  The base LLM acts as a code *Refiner*, proposing TypeScript implementations of a specific harness.
    2.  The code is executed against a dataset of narrative trajectories in a secure sandbox.
    3.  The score $H$ is calculated.
    4.  The Refiner iterates based on error feedback until convergence. When refining, the prompt will include at most **5 failed trajectory evaluations** to prevent context window bloat.
*   **Termination/Convergence Criteria:** Training stops when $H \ge 0.95$ for 3 consecutive iterations, or after a maximum of 50 iterations.
*   **Modes:** Supports both `--auto` (runs to convergence) and `--interactive` (prompts human for approval before expanding a node).

### C. The Rejection Sampling Runner (Inference Phase)
The runtime engine used by authors.
*   **Process:** 
    1.  **Drafting:** The generator LLM writes a scene.
    2.  **Verification:** The draft is passed through the ensemble of generated TS sub-harnesses.
    3.  **Feedback Loop:** If any harness returns `valid: false`, the draft is rejected. The specific `feedback` strings from the failed harnesses are appended to the prompt, and the generator tries again (up to a max retry limit).

## 3. Sub-Harness Ensemble (MVP Scope)

Each harness is a dynamically generated TypeScript module adhering to a strict interface:
```typescript
interface HarnessContext {
  loreDb: Record<string, any>;
  previousBeats: string[];
  targetAudience: string;
}

interface HarnessResult {
  valid: boolean;
  feedback: string[];
}

type NarrativeHarness = (draft: string, context: HarnessContext) => Promise<HarnessResult>;
```

1.  **LogicHarness:** 
    *   *Focus:* Lore consistency, tracking character states, preventing plot holes.
2.  **StructureHarness:** 
    *   *Focus:* The 5 Cs, overarching narrative arcs (e.g., Hero's Journey).
3.  **TensionHarness:** 
    *   *Focus:* Pacing, "Start Late, Exit Early", stakes escalation.
4.  **EmotionHarness:**
    *   *Focus:* Character arcs, emotional resonance, ensuring emotional payoffs feel earned for the target audience.
5.  **StyleHarness:** 
    *   *Focus:* "Show, Don't Tell", cliché checking, passive voice detection.

## 4. Implementation Phases

### Phase 1: Foundation & CLI Framework
*   Initialize Bun project with TypeScript.
*   Setup CLI routing (`storyharness train`, `storyharness generate`).
*   **Model Strategy:**
    | Role | Model | Rationale |
    | :--- | :--- | :--- |
    | **Refiner** (code synthesis) | Gemini 2.5 Flash | Speed, cost-efficiency for many iterations |
    | **Tier 4 Critic** (LLM-as-Judge) | Gemini 2.5 Pro | Accuracy and reasoning depth matter most here |
    | **Generator** (story drafting) | Gemini 2.5 Pro | High-quality narrative output matters |

### Phase 2: The Surrogate Environment & Dataset Loader
*   **Trajectory Schema:**
    ```typescript
    interface Trajectory {
      text: string;
      label: "good" | "bad";
      score?: number; // 0.0-1.0 optional continuous score for future flexibility
      flaws?: string[]; // e.g., ["plot_hole", "passive_voice"]
    }
    ```
*   Implement the JSON-based trajectory loader.
*   **Sandbox Security:** Implement secure execution of LLM-generated code using Bun's isolated execution or the `vm` module. Must enforce:
    *   Timeout: 5 seconds max per evaluation.
    *   Memory cap: e.g., 64MB.
    *   No filesystem (`fs`) or network (`net`/`fetch`) access allowed.

### Phase 3: The Harness Synthesizer (AutoHarness Core)
*   Implement the Tree Data Structure for tracking code hypotheses.
*   Implement **Tree Serialization:** Save tree state to JSON (`tree_state.json`) after each iteration so training can be paused and resumed without losing progress.
*   Implement the Thompson Sampling algorithm. Expose a configurable `--ts-weight` parameter (default 1.0).
*   Implement the scoring function ($H$) and convergence loop ($H \ge 0.95$ or max 50 iterations).
*   **Logging:** Implement structured JSON logging (iteration number, node ID, $H$ value, code diff summary) for observability during long training runs.
*   Implement the Refiner Prompt and `--interactive` mode.

### Phase 4: The Rejection Sampling Runner
*   Build the inference loop: Prompt -> Draft -> Execute Ensemble -> Refine -> Output.
*   Implement `previousBeats` accumulation: The Runner must explicitly maintain a running list of accepted scene summaries to feed into subsequent harness evaluations.
*   Implement dynamic loading of the generated `.ts` harness files.
*   Implement a "giving up" threshold (e.g., max 5 retries) to prevent infinite loops.

### Phase 5: MVP Polish
*   Create sample `loreDb` and trajectory datasets for all 5 MVP harnesses.
*   Run the Synthesizer to generate baseline versions.
*   End-to-end testing of a short story generation.

### Phase 6: Stretch Goal - Harness-as-Policy
*   Adapt the research from §4.3 of the AutoHarness paper.
*   Instead of just verifying and rejecting, synthesize code that directly rewrites or flags passages (e.g., deterministic rule-based line editing) without requiring an LLM at inference time.

## 5. Directory Structure

```text
storyharness/
├── src/
│   ├── cli/                  # CLI entrypoints (train, generate)
│   ├── llm/                  # Gemini API wrappers & Model Strategy
│   ├── runner/               # Rejection sampling loop
│   ├── synthesizer/          # AutoHarness tree-search, Thompson sampling, state persistence
│   ├── environment/          # Trajectory loader, Tier 2 Critic, Secure Sandbox
│   └── types/                # Core interfaces (Trajectory, HarnessResult)
├── harnesses/                # Generated TS harnesses live here
├── datasets/                 # Training trajectories (.json)
├── package.json
└── tsconfig.json
```