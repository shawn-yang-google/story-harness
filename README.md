# StoryHarness

A framework that bridges structured AI generation and the nuanced art of human storytelling. StoryHarness automatically synthesizes code harnesses that act as a strict control loop for LLMs, evaluating and guiding narrative generation across critical dimensions — logic, structure, emotion, tension, style, character, and dialogue.

Inspired by [AutoHarness](https://arxiv.org/html/2603.03329v1) (LLM-synthesized code harnesses via tree-search), adapted from game environments to narrative generation.

## How It Works

StoryHarness uses a **four-tier critic system** and a **gated pipeline** to evaluate LLM-generated narrative drafts:

```
Prompt ──► LLM Draft ──► Gate 1 (Code) ──► Gate 2 (Hybrid) ──► Gate 3 (Prompt) ──► Accept
                              ▲                                            │
                              └──── diff-based patches from feedback ──────┘
```

| Tier | What | Speed | Cost | Used | Origin |
|------|------|-------|------|------|--------|
| **Tier 1** | Deterministic TypeScript code | <5ms | Free | Inference | **Synthesized** — tree-search + Thompson sampling, trained against Tier 4 labels |
| **Tier 2** | LLM extract + code verify | ~300ms | ~$0.0002 | Inference | **Expert-crafted** — hand-written extraction prompts and 48 deterministic checkers |
| **Tier 3** | LLM prompt evaluation | ~500ms | ~$0.0002 | Inference (subjective only) | **Synthesized** — prompt text refined by Gemini 2.5 Flash, trained against Tier 4 labels |
| **Tier 4** | Gemini 2.5 Pro LLM-as-Judge | Slow | Expensive | Training only | N/A — the oracle judge itself |

> **Note:** Tier 4 trains **only** Tier 1 and Tier 3. Tier 2 harnesses are hand-crafted — their extraction prompts and checker modules are written by domain experts, not synthesized. The "rejection sampling" terminology in this project is used loosely: the training phase is technically a **tree-search optimization with Thompson sampling**, where candidate harnesses that disagree with Tier 4 are discarded (analogous to rejection sampling in spirit, not the strict statistical sense).

Rejected drafts receive targeted feedback and are refined through minimal diff-based patches before re-evaluation.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- A `GEMINI_API_KEY` environment variable

### Install

```bash
bun install
```

### Train a Harness

```bash
# Train a Tier 1 code harness (generates TypeScript)
bun run src/cli/index.ts train LogicHarness --auto

# Train a Tier 3 prompt harness (generates .prompt.txt)
bun run src/cli/index.ts train LogicHarness --mode prompt --auto
```

| Flag | Default | Description |
|------|---------|-------------|
| `--auto` | off | Run to convergence (H ≥ 0.95 for 3 consecutive iterations) |
| `--interactive` | off | Pause for human approval each iteration |
| `--mode code\|prompt` | `code` | Tier 1 (TypeScript) or Tier 3 (LLM prompt) |
| `--ts-weight <n>` | `1.0` | Thompson Sampling exploration weight |
| `--max-iterations <n>` | `10` | Upper bound on training iterations |

### Generate a Story

```bash
bun run src/cli/index.ts generate "A detective arrives at a crime scene"
```

### Run Tests

```bash
bun test
```

## Documentation

Detailed documentation lives in the [`docs/`](docs/) directory:

### Architecture
- **[System Architecture](docs/architecture.md)** — Training/inference phases, gated pipeline, two-level loop, harness loading, log structure, LLM model strategy

### Evaluation Tiers
- **[Tier 1 — Code Harnesses](docs/tiers/tier-1-code.md)** — Deterministic TypeScript harnesses, tree-search + Thompson sampling
- **[Tier 2 — Hybrid Harnesses](docs/tiers/tier-2-hybrid.md)** — "LLM Extracts, Code Verifies", 48 checks across 4 domains
- **[Tier 3 — Prompt Harnesses](docs/tiers/tier-3-prompt.md)** — Pure LLM evaluation for subjective domains
- **[Tier 4 — LLM-as-Judge](docs/tiers/tier-4-judge.md)** — Gemini 2.5 Pro critic for training ground-truth

### Design Philosophy
- **[Design Philosophy](docs/design-philosophy.md)** — Why harnesses are verifiers, not creativity drivers

### Domain Guides
- **[Logic](docs/domains/logic.md)** — 27 checks: propositional, temporal, epistemic, deontic, entity, causal
- **[Dialogue](docs/domains/dialogue.md)** — 8 checks: subtext, exposition, conflict, voices, clichés
- **[Character](docs/domains/character.md)** — 6 checks: mask vs truth, pressure choice, dimensions, desire
- **[Narrative](docs/domains/narrative.md)** — 7 checks: turning values, stakes, goals, theme, conflict

## Project Structure

```
storyharness/
├── src/
│   ├── cli/              # CLI entrypoints (train, generate)
│   ├── environment/      # Trajectory loader, sandbox, critics, LLM harness
│   ├── llm/              # Gemini API client & model configuration
│   ├── runner/           # Rejection sampling inference loop
│   ├── synthesizer/      # Tree-search, Thompson sampling, code/prompt synthesis
│   ├── types/            # Core interfaces (LogicGraph, DialogueGraph, etc.)
│   ├── logic/            # 6 logic checker modules (27 checks)
│   ├── dialogue/         # Dialogue checker (8 checks)
│   ├── character/        # Character checker (6 checks)
│   └── narrative/        # Narrative checker (7 checks)
├── harnesses/            # Generated harnesses (.ts, .hybrid.json, .prompt.txt)
├── datasets/             # Training trajectories (.json)
├── docs/                 # Documentation (architecture, tiers, domains)
└── arxiv.md              # AutoHarness paper reference
```

## License

This project is licensed under the [MIT License](LICENSE).

The skill files in `character/`, `dialogue/`, and `story/` contain AI-generated
summaries of narrative craft principles from Robert McKee's books. See
[NOTICE.md](NOTICE.md) for full attribution and fair use rationale.

## References

- [AutoHarness: Improving LLM Agents by Automatically Synthesizing a Code Harness](https://arxiv.org/html/2603.03329v1)
- McKee, R. — *Story* (1997), *Dialogue* (2016), *Character* (2021)
