# Design Philosophy

Core architectural principles behind StoryHarness — why the system is designed the way it is, and where different concerns belong.

## Harnesses Are Verifiers, Not Creativity Drivers

The fundamental role of a harness in StoryHarness is **verification**: answering "is this draft valid?" — not "how should this draft be creative?"

```
Generator (creative)  ──►  Draft  ──►  Harness (analytical)  ──►  Pass/Fail + Evidence
```

This separation is deliberate and mirrors the compiler pipeline analogy used throughout the system:

| Compiler Role | StoryHarness Role | Responsibility |
|--------------|-------------------|----------------|
| Programmer | Generator LLM | Creative decisions, novel ideas |
| Type checker | Harness (Tier 1–3) | Rule enforcement, error detection |
| Error messages | `CheckResult[]` / `feedback[]` | Precise, actionable diagnostics |

Embedding creative guidance into harness feedback would blur this separation and undermine the precision that makes Tier 2's "LLM Extracts, Code Verifies" pipeline effective (88% accuracy vs. 53% for pure LLM evaluation).

## The Convergence Loop

The current inference loop is a **convergence loop** — it narrows toward a rule-compliant draft:

```
Generate draft → Harness finds violations → Feedback tells LLM what's wrong → LLM patches → Repeat
```

The feedback is **corrective**: "you violated rule X, fix it." The LLM's creative space is bounded: preserve the plot, preserve the characters, fix the listed issues. This is a **constrained refinement** process, not an open-ended creative exploration.

## Where Creative Diversity Belongs

If you want the system to encourage "out of the box" thinking or creative risk-taking, the lever is in the **generation phase**, not the verification phase:

| Layer | Role | Can Add Creativity? |
|-------|------|:-------------------:|
| **Generator prompt** | "Write a story about X" | ✅ — Add creative constraints ("use an unreliable narrator", "subvert the genre") |
| **Structural Rewrite prompt** | "Fix these issues while preserving plot" | ⚠️ — Could relax preservation constraints, but risks regression |
| **Harness feedback** | "Rule X violated with evidence Y" | ❌ — Wrong layer; verifiers verify |
| **Tier 4 Critic** | "Good/bad with reasoning" | ⚠️ — Could reward novelty, but changes the training signal |

### The Fundamental Tension

"Think out of the box" and "pass all 48 deterministic checks" are somewhat at odds. A truly creative choice (e.g., an unreliable narrator who *intentionally* contradicts themselves) would trigger `PropositionalChecker.contradiction`. The harness cannot distinguish "intentional artistic rule-breaking" from "plot hole."

### Potential Extensions (Not Currently Implemented)

If creative diversity becomes a goal, these approaches would work within the existing architecture:

1. **Pre-generation diversity** — Generate N diverse drafts (different narrative strategies) in parallel, then run all through the harness. This explores the creative space *before* convergence — "beam search" rather than "greedy fix."

2. **Intentional-annotation mechanism** — Add an `"intentional": true` field to graph nodes during extraction (Phase A). The LLM signals creative intent, and the checker respects it. This lets the author/LLM mark deliberate rule-breaking.

3. **Two-stage generation** — An "architect" LLM plans the narrative strategy (structure, twists, techniques) first. Then the generator writes to that plan. The harness only verifies execution quality, not the strategy itself.

## Training Scope: What Tier 4 Trains

A common source of confusion: Tier 4 (LLM-as-Judge) does **not** train all tiers.

| Tier | Trained by Tier 4? | How It's Created |
|------|--------------------|-----------------|
| **Tier 1** (`.ts` code) | ✅ Yes | Tree-search + Thompson sampling; Tier 4 provides ground-truth labels for scoring candidate harnesses |
| **Tier 2** (`.hybrid.json`) | ❌ No | **Expert-crafted** — extraction prompts and 48 deterministic checkers are hand-written by domain experts |
| **Tier 3** (`.prompt.txt`) | ✅ Yes | Prompt text refined by the Refiner model (Gemini 2.5 Flash), scored against Tier 4 labels |

Tier 2 is the most accurate tier (88%) precisely *because* it is hand-crafted by domain experts who formalize narrative principles (McKee's story/dialogue/character theory, formal logic) into deterministic checker code.

## "Rejection Sampling" — Terminology Note

The project uses the term "rejection sampling" loosely throughout its documentation. Strictly speaking:

- **Training phase**: Uses **tree-search optimization with Thompson sampling** — candidate harnesses that disagree with Tier 4 are discarded. This is analogous to rejection sampling (discard samples that don't meet criteria) but is technically an evolutionary/bandit optimization process.
- **Inference phase**: Uses a **gated refinement loop** — drafts that fail verification are patched and re-evaluated. This is closer to iterative refinement than statistical rejection sampling.

The term is retained because it conveys the core intuition: generate candidates, reject bad ones, keep good ones.

## See Also

- [System Architecture](architecture.md)
- [Tier 2 — Hybrid Harnesses](tiers/tier-2-hybrid.md)
- [Tier 4 — LLM-as-Judge](tiers/tier-4-judge.md)
