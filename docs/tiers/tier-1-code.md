# Tier 1 — Code Harnesses

Deterministic TypeScript harnesses that run in a sandboxed environment. They are the fastest, cheapest, and most debuggable evaluation tier.

## What

Tier 1 harnesses are standalone `.ts` files that evaluate a story draft using pure code — pattern matching, structural analysis, and rule-based checks. They contain no LLM calls and execute entirely in-process.

Each harness exports a function conforming to the `NarrativeHarness` signature:

```typescript
type NarrativeHarness = (
  draft: string,
  context: HarnessContext
) => Promise<HarnessResult>;
```

At inference time, the runner transpiles each `.ts` file with Bun's transpiler and executes it inside `executeHarnessInSandbox()` (`src/environment/sandbox.ts`).

## How They're Generated

Tier 1 harnesses are synthesized during the **Training Phase** using tree-search with Thompson sampling (`src/synthesizer/`):

1. **Input**: A trajectory dataset (`datasets/<HarnessName>.json`) containing labeled `good` and `bad` story excerpts.
2. **Tree-Search**: The synthesizer explores a tree of candidate harness programs. Each node represents a code variant.
3. **Thompson Sampling**: Exploration vs. exploitation is balanced using Thompson sampling — nodes that correctly classify more trajectories are exploited, while uncertain branches are explored.
4. **Evaluation**: Each candidate harness is tested against the trajectory dataset. The Tier 4 Critic (Gemini 2.5 Pro) provides ground-truth labels.
5. **Convergence**: Training stops when accuracy (H) ≥ 0.95 for 3 consecutive iterations (with `--auto`), or when `--max-iterations` is reached.

The trained harness is saved to `harnesses/<HarnessName>.ts`.

## File Format

Plain TypeScript files in `harnesses/`. Each file is self-contained:

```
harnesses/
├── StyleHarness.ts
├── StructureHarness.ts
├── TensionHarness.ts
├── EmotionHarness.ts
├── LogicHarness.ts
├── DialogueCraftHarness.ts
└── CharacterCraftHarness.ts
```

Test files (`*.test.ts`) in the same directory are excluded from harness loading.

## Strengths

| Property | Detail |
|----------|--------|
| **Speed** | <5ms per evaluation — pure code, no I/O |
| **Cost** | Free — no LLM API calls |
| **Determinism** | Same input always produces the same result |
| **Debuggable** | Standard TypeScript — set breakpoints, read stack traces |
| **Offline** | Works without network access |

## Limitations

| Limitation | Detail |
|------------|--------|
| **No semantic understanding** | Cannot understand meaning, only patterns |
| **Surface-level** | Relies on lexical/structural heuristics |
| **Training-dependent** | Quality depends on trajectory dataset coverage |
| **Brittle for nuance** | Struggles with subjective qualities (emotion, style) |

For domains where semantic understanding matters (logic, dialogue craft, character craft, narrative), [Tier 2 hybrid harnesses](tier-2-hybrid.md) provide substantially better accuracy (88% vs. Tier 3's 53%) while keeping verification deterministic.

## Active Harnesses

| Harness | Focus | Source |
|---------|-------|--------|
| **StyleHarness** | "Show, Don't Tell", cliché detection, passive voice | `harnesses/StyleHarness.ts` |
| **StructureHarness** | Narrative arcs, the 5 Cs, story beats | `harnesses/StructureHarness.ts` |
| **TensionHarness** | Pacing, stakes escalation, "Start Late, Exit Early" | `harnesses/TensionHarness.ts` |
| **EmotionHarness** | Character arcs, emotional resonance, earned payoffs | `harnesses/EmotionHarness.ts` |
| **LogicHarness** | Basic lore consistency checks | `harnesses/LogicHarness.ts` |
| **DialogueCraftHarness** | Word-level dialogue quality (clichés, voice patterns) | `harnesses/DialogueCraftHarness.ts` |
| **CharacterCraftHarness** | Subtext detection, character trait patterns | `harnesses/CharacterCraftHarness.ts` |

Note: DialogueCraftHarness and CharacterCraftHarness exist as both Tier 1 (`.ts`) and [Tier 2](tier-2-hybrid.md) (`.hybrid.json`) harnesses. The Tier 1 versions handle word-level pattern matching while the Tier 2 versions perform deeper semantic analysis.

## See Also

- [Architecture — Gated Pipeline](../architecture.md#the-gated-pipeline)
- [Tier 2 — Hybrid Harnesses](tier-2-hybrid.md)
- [Tier 4 — LLM-as-Judge (training)](tier-4-judge.md)
