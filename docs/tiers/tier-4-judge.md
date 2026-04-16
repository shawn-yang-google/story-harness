# Tier 4 — LLM-as-Judge

Gemini 2.5 Pro acting as a high-accuracy critic for training ground-truth. Used **only** during the training phase — never at inference time.

## What

Tier 4 is a powerful LLM (Gemini 2.5 Pro) used as an oracle judge to evaluate whether a story trajectory is "good" or "bad". It provides the ground-truth labels that train **Tier 1 code harnesses** and **Tier 3 prompt harnesses** only.

> **Important:** Tier 4 does **not** train Tier 2 hybrid harnesses. Tier 2's extraction prompts and 48 deterministic checkers are expert-crafted by domain experts — they formalize narrative theory (McKee, formal logic) into hand-written code. This is why Tier 2 achieves 88% accuracy: human expertise in the checker design, combined with LLM extraction capability.

```
┌──────────────┐     ┌────────────────────┐     ┌──────────────┐
│ Trajectory   │────►│ Tier 4 Critic      │────►│ CriticResult │
│ (story text) │     │ (Gemini 2.5 Pro)   │     │ label, score │
│              │     │ System: JSON-only  │     │ reasoning    │
└──────────────┘     └────────────────────┘     │ flaws        │
                                                └──────────────┘
```

## Used ONLY During Training

Tier 4 is **never** called at inference time. It is too slow and too expensive for the gated pipeline:

| Property | Tier 4 | Tier 1–3 |
|----------|--------|----------|
| **When used** | Training only | Inference |
| **Speed** | Seconds | <5ms–500ms |
| **Cost** | Expensive | Free–$0.0002 |
| **Purpose** | Ground-truth labels | Real-time evaluation |

The training loop uses Tier 4 to score candidate harnesses: a harness that agrees with the Critic on more trajectories has a higher fitness score.

## How It Scores

The Critic evaluates each trajectory with a structured prompt and returns:

```typescript
interface CriticResult {
  label: "good" | "bad";      // Binary quality judgment
  score: number;               // 0.0–1.0 confidence/quality score
  reasoning: string;           // Explanation of the judgment
  flaws: string[];             // Specific issues found (empty if "good")
}
```

The system instruction forces JSON-only output. The evaluation prompt includes:
- The harness type being evaluated (e.g., "StyleHarness")
- The target audience
- The story excerpt to evaluate

Implementation: `src/environment/critic.ts` → `evaluateNarrative()`

## Domain-Specific Critics

In addition to the general-purpose `evaluateNarrative()` critic, there are specialized critics for domains that require deeper analysis:

| Critic | Source | Focus |
|--------|--------|-------|
| **Logic Critic** | `src/environment/logic-critic.ts` | Logical consistency, contradictions, temporal violations |
| **Story Critic** | `src/environment/story-critic.ts` | Narrative structure, tension, pacing, character arcs |
| **Character Critic** | `src/environment/character-critic.ts` | McKee character principles, mask vs truth, pressure choices |
| **Dialogue Critic** | `src/environment/dialogue-critic.ts` | McKee dialogue principles, subtext, exposition, conflict |

Each specialized critic uses the same `MODELS.CRITIC` (Gemini 2.5 Pro) but with domain-specific prompts and evaluation criteria.

## Training Flow

```
Trajectory Dataset ──► Synthesizer generates candidate harness
                          │
                          ├─ Run candidate harness on all trajectories
                          ├─ Run Tier 4 Critic on all trajectories
                          ├─ Compare harness predictions vs Critic labels
                          ├─ Compute accuracy score
                          └─ Update tree-search (Thompson sampling)
                               │
                               ▼
                          Best harness saved to harnesses/
```

## See Also

- [Architecture — Training Phase](../architecture.md#overview)
- [Design Philosophy](../design-philosophy.md)
- [Tier 1 — Code Harnesses (trained by Tier 4)](tier-1-code.md)
- [Tier 2 — Hybrid Harnesses (NOT trained by Tier 4)](tier-2-hybrid.md)
- [Tier 3 — Prompt Harnesses (trained by Tier 4)](tier-3-prompt.md)
