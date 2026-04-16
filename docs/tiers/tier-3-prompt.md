# Tier 3 — Prompt Harnesses

Pure LLM evaluation using an optimized prompt. A cheap, fast model (Flash-Lite) reads the draft and returns a structured pass/fail judgment.

## What

Tier 3 harnesses are `.prompt.txt` files containing a carefully crafted evaluation prompt. At inference time, the prompt is combined with the story draft and sent to Gemini 3.1 Flash Lite via `executeLlmHarness()` (`src/environment/llm-harness.ts`).

The LLM responds with a JSON object:

```json
{
  "valid": true,
  "feedback": ["Minor pacing issue in paragraph 3"]
}
```

There is no deterministic verification — the LLM's judgment is the final answer.

## File Format

Plain text files in `harnesses/` with the `.prompt.txt` extension:

```
harnesses/
└── <HarnessName>.prompt.txt
```

The file content is the raw evaluation prompt. It is concatenated with the draft and context at runtime:

```
Harness Evaluation Prompt:
<contents of .prompt.txt>

Draft to evaluate:
---
<draft>
---

Context:
Lore: <loreDb JSON>
Previous Beats: <previous beats>
Target Audience: <audience>

Respond ONLY with a JSON object in the following format:
{ "valid": boolean, "feedback": string[] }
```

## When to Use

Tier 3 is appropriate **only for subjective domains** where formal structure extraction is impractical:

| Domain | Tier 3? | Reason |
|--------|:-------:|--------|
| **Style** | ✅ | "Show, Don't Tell" quality is subjective |
| **Emotion** | ✅ | Emotional resonance resists formalization |
| **Tension** | ✅ | Pacing "feel" is hard to decompose into a graph |
| **Logic** | ❌ | Use [Tier 2](tier-2-hybrid.md) — 88% vs 53% accuracy |
| **Dialogue** | ❌ | Use [Tier 2](tier-2-hybrid.md) — McKee rules are formalizable |
| **Character** | ❌ | Use [Tier 2](tier-2-hybrid.md) — structural checks outperform |
| **Narrative** | ❌ | Use [Tier 2](tier-2-hybrid.md) — turning values, stakes are formal |

## Why Tier 2 Replaces It for Structured Domains

Benchmark data on the same trajectory datasets:

| Metric | Tier 3 (Prompt) | Tier 2 (Hybrid) | Delta |
|--------|:---:|:---:|:---:|
| **Accuracy** | 53% | **88%** | **+35pp** |
| **False positives** | High | Low | Tier 2 only flags what checkers find |
| **False negatives** | High | Low | Tier 2 checkers are exhaustive |
| **Debuggability** | ❌ LLM prose | ✅ Rule + evidence | Tier 2 is actionable |
| **Determinism** | ❌ Varies per call | ✅ Same graph → same result | Tier 2 is reproducible |

The core problem: asking an LLM to simultaneously **understand** narrative structure **and** evaluate it produces unreliable results. Tier 2 separates these concerns — the LLM only extracts structure (what it's good at), and deterministic code evaluates rules (what code is good at).

## How It Works

```
executeLlmHarness(prompt, draft, context)
  │
  ├─ Build full prompt (evaluation prompt + draft + context)
  ├─ generateContent(MODELS.EVALUATOR, fullPrompt, undefined, temperature=0)
  ├─ Parse JSON response (lenient: handles code blocks, raw JSON, mixed text)
  └─ Return HarnessResult { valid, feedback }
```

The model used is `MODELS.EVALUATOR` (`gemini-3.1-flash-lite-preview`) — chosen for cost and speed since this runs at inference time. Temperature is set to 0 for consistency.

Timeout: 30 seconds. On JSON parse failure, one retry is attempted.

## Training

Tier 3 prompt harnesses are trained using `--mode prompt`:

```bash
bun run src/cli/index.ts train StyleHarness --mode prompt --auto
```

The synthesizer generates and refines the prompt text using the Refiner model (Gemini 2.5 Flash), evaluated against the trajectory dataset using the Tier 4 Critic.

## See Also

- [Architecture — Gated Pipeline](../architecture.md#the-gated-pipeline)
- [Tier 1 — Code Harnesses](tier-1-code.md)
- [Tier 2 — Hybrid Harnesses](tier-2-hybrid.md)
- [Tier 4 — LLM-as-Judge](tier-4-judge.md)
