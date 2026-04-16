# System Architecture

StoryHarness is a two-phase system for generating high-quality narrative text: a **Training Phase** that synthesizes evaluation harnesses, and an **Inference Phase** that uses those harnesses as a gated control loop over an LLM story generator.

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRAINING PHASE                              │
│                                                                     │
│  datasets/*.json        src/synthesizer/         harnesses/         │
│  ┌──────────────┐       ┌─────────────────┐      ┌──────────────┐  │
│  │ Trajectories │──────►│ Tree-Search +   │─────►│ .ts          │  │
│  │ (good/bad)   │       │ Thompson        │      │ .hybrid.json │  │
│  └──────────────┘       │ Sampling        │      │ .prompt.txt  │  │
│                         └────────┬────────┘      └──────────────┘  │
│                                  │                                  │
│                         ┌────────▼────────┐                         │
│                         │ Tier 4 Critic   │                         │
│                         │ (Gemini 2.5 Pro)│                         │
│                         │ Ground-truth    │                         │
│                         └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        INFERENCE PHASE                              │
│                                                                     │
│  Prompt ──► Generator (Gemini 2.5 Pro) ──► Draft                   │
│                                              │                      │
│                                              ▼                      │
│                                   ┌──────────────────┐              │
│                                   │ Gate 1: Code     │ (.ts)       │
│                                   │ Tier 1 harnesses │              │
│                                   └───────┬──────────┘              │
│                                      pass │                         │
│                                           ▼                         │
│                                   ┌──────────────────┐              │
│                                   │ Gate 2: Hybrid   │ (.hybrid)   │
│                                   │ Tier 2 harnesses │              │
│                                   └───────┬──────────┘              │
│                                      pass │                         │
│                                           ▼                         │
│                                   ┌──────────────────┐              │
│                                   │ Gate 3: Prompt   │ (.prompt)   │
│                                   │ Tier 3 harnesses │              │
│                                   └───────┬──────────┘              │
│                                      pass │                         │
│                                           ▼                         │
│                                      Accept Scene                   │
│                                                                     │
│  Rejected drafts get feedback ──► diff-based patches ──► re-gate   │
└─────────────────────────────────────────────────────────────────────┘
```

## Training Scope

A key architectural distinction: Tier 4 does **not** train all tiers.

| Tier | Trained by Tier 4? | How It's Created |
|------|--------------------|-----------------|
| **Tier 1** (`.ts`) | ✅ Yes | **Synthesized** — tree-search + Thompson sampling, scored against Tier 4 labels |
| **Tier 2** (`.hybrid.json`) | ❌ No | **Expert-crafted** — hand-written extraction prompts and deterministic checkers |
| **Tier 3** (`.prompt.txt`) | ✅ Yes | **Synthesized** — prompt text refined by Gemini 2.5 Flash, scored against Tier 4 labels |

The training phase diagram above shows `.hybrid.json` files in the `harnesses/` output for completeness, but these are placed there manually by domain experts — the synthesizer only generates `.ts` and `.prompt.txt` files.

> **See also:** [Design Philosophy](design-philosophy.md) — why harnesses are verifiers (not creativity drivers), the "rejection sampling" terminology, and where creative diversity belongs in the architecture.

## The Gated Pipeline

The inference runner (`src/runner/index.ts`) evaluates every draft through three sequential gates. A draft must pass a gate before advancing to the next one. This ordering is deliberate — cheap, fast, deterministic checks run first.

| Gate | Tier | Harness Type | Speed | Cost | When Run |
|------|------|-------------|-------|------|----------|
| **Gate 1** | [Tier 1](tiers/tier-1-code.md) | `.ts` code harnesses | <5ms | Free | Always first |
| **Gate 2** | [Tier 2](tiers/tier-2-hybrid.md) | `.hybrid.json` harnesses | ~300ms | ~$0.0002 | Only if Gate 1 passes |
| **Gate 3** | [Tier 3](tiers/tier-3-prompt.md) | `.prompt.txt` harnesses | ~500ms | ~$0.0002 | Only if Gates 1–2 pass |

If any gate rejects the draft, the runner collects the feedback and enters the inner patch loop without running subsequent gates.

## The Two-Level Loop

The runner implements a nested loop structure in `RejectionSamplingRunner.generateScene()`:

```
for round = 1..maxRetries                    ← OUTER LOOP (full check rounds)
  │
  ├─ Run ALL gates on current draft
  │
  ├─ If all pass → Accept, save log, return
  │
  └─ If rejected → collect feedback[]
       │
       for patch = 1..maxPatchesPerRound     ← INNER LOOP (targeted fixes)
         │
         ├─ Take next feedback item
         ├─ Send to Generator with diff-patch prompt
         ├─ Apply ORIGINAL/REVISED text replacements
         └─ Log the patch attempt
       │
       (back to outer loop for full re-validation)
```

### Outer Loop — Full Validation Rounds

Each round runs the complete gate pipeline on the current draft. If the draft passes all gates, it is accepted. If rejected, the feedback is passed to the inner loop.

### Inner Loop — Targeted Diff-Based Patches

For each piece of feedback, the runner sends a targeted prompt to the Generator LLM asking for **minimal text replacements** in `ORIGINAL/REVISED` format. This avoids full rewrites — only the specific issue is patched. The `applyDiffPatches()` function handles parsing and applying these replacements, including fuzzy whitespace matching.

After all patches in a round are applied, the outer loop re-validates from scratch.

## Harness Loading

The runner loads harnesses from the `harnesses/` directory at startup. Three file formats are recognized:

| Extension | Tier | Loader | Runtime |
|-----------|------|--------|---------|
| `.ts` | Tier 1 | Bun transpiler → `executeHarnessInSandbox()` | Deterministic sandbox |
| `.hybrid.json` | Tier 2 | JSON parse → `executeHybridHarness()` | LLM extraction + code verification |
| `.prompt.txt` | Tier 3 | Raw text → `executeLlmHarness()` | LLM evaluation |

Files matching `*.test.ts` are excluded. The `.hybrid.json` format contains three fields:

```json
{
  "domain": "logic" | "dialogue" | "character" | "narrative",
  "extractionPromptAddendum": "",
  "verificationCode": ""
}
```

The `domain` field selects which extraction prompt and checker pipeline to use. If absent, the domain is inferred from the filename (e.g., `DialogueCraftHarness.hybrid.json` → `"dialogue"`).

## Log Structure

Every `generateScene()` call writes a structured log directory under `logs/`:

```
logs/
└── generate-2025-01-15T10-30-00-000Z/
    ├── prompt.md                         # Original user prompt
    ├── summary.json                      # Machine-readable full log
    ├── final-draft.md                    # Accepted draft (if successful)
    ├── round-1/
    │   ├── draft.md                      # Draft at start of round
    │   ├── feedback.md                   # Gate feedback (ACCEPTED/REJECTED)
    │   ├── patch-1-feedback.md           # What issue patch 1 fixed
    │   ├── patch-1-diff.md               # ORIGINAL/REVISED replacements
    │   └── patch-1-draft.md              # Draft after patch 1
    ├── round-2/
    │   ├── draft.md
    │   ├── feedback.md
    │   └── ...
    └── ...
```

Each round gets its own subdirectory. Full-check results are saved as `draft.md` and `feedback.md`. Patches within a round are saved with the `patch-N-` prefix.

## LLM Model Strategy

| Role | Model | Where Used | Rationale |
|------|-------|------------|-----------|
| **Refiner** | `gemini-2.5-flash` | `src/synthesizer/` — harness synthesis | Speed & cost for many training iterations |
| **Critic** | `gemini-2.5-pro` | `src/environment/critic.ts` — Tier 4 Judge | Maximum accuracy for ground-truth labels |
| **Generator** | `gemini-2.5-pro` | `src/runner/` — story drafting & patching | High-quality narrative output |
| **Evaluator** | `gemini-3.1-flash-lite-preview` | `src/environment/llm-harness.ts` — Tier 3 eval | Cheap & fast for runtime evaluation |

Model constants are defined in `src/llm/index.ts`. All LLM calls go through `generateContent()` which handles retries with exponential backoff for transient API errors (429, 503).

## Source Layout

```
src/
├── cli/              # CLI entrypoints (train, generate)
├── environment/      # Sandbox, critics, hybrid/LLM harness executors
├── llm/              # Gemini API client & model constants
├── runner/           # Rejection sampling inference loop (gated pipeline)
├── synthesizer/      # Tree-search + Thompson sampling for harness training
├── types/            # Core interfaces: LogicGraph, DialogueGraph, etc.
├── logic/            # 6 deterministic logic checker modules
├── dialogue/         # Dialogue checker + extraction prompt
├── character/        # Character checker + extraction prompt
└── narrative/        # Narrative checker + extraction prompt
```

See also:
- [Design Philosophy](design-philosophy.md)
- [Tier 1 — Code Harnesses](tiers/tier-1-code.md)
- [Tier 2 — Hybrid Harnesses](tiers/tier-2-hybrid.md)
- [Tier 3 — Prompt Harnesses](tiers/tier-3-prompt.md)
- [Tier 4 — LLM-as-Judge](tiers/tier-4-judge.md)
- [Logic Domain](domains/logic.md)
- [Dialogue Domain](domains/dialogue.md)
- [Character Domain](domains/character.md)
- [Narrative Domain](domains/narrative.md)
