# Character Domain

The character domain evaluates character craft based on Robert McKee's principles — ensuring characters have depth, face genuine dilemmas, and earn their emotional moments.

## CharacterGraph Schema

The `CharacterGraph` (`src/types/character-graph.ts`) contains 5 interfaces:

```
CharacterGraph
├── Character                  — Name, mask (public persona), true nature, mask-truth gap
├── PressureChoice             — Dilemma situations revealing true character
├── DimensionalContradiction   — Internal contradictions that create depth
├── EmotionalMoment            — Emotional beats with earned/proportionate flags
└── DesireEntry                — Conscious vs subconscious desires
```

Key interfaces:

```typescript
interface Character {
  name: string;
  mask: string;          // Public persona: "brave warrior"
  trueNature: string;    // Inner reality: "terrified of failure"
  maskMatchesTruth: boolean;  // true = cement-block (bad)
}

interface PressureChoice {
  character: string;
  pressure: string;      // "facing execution"
  choiceA: string;       // "betray friend"
  choiceB: string;       // "face death"
  chosen: string;
  isGenuineDilemma: boolean;   // Both options have real cost
  revealsCharacter: boolean;   // Choice reveals true nature
}

interface DimensionalContradiction {
  character: string;
  dimension: string;     // "courage vs cowardice"
  positive: string;      // "fights for others"
  negative: string;      // "runs from own problems"
  present: boolean;
}
```

## Checks

6 checks in `src/character/character-checker.ts`:

| # | Rule | Severity | What It Catches | Criteria |
|---|------|----------|----------------|----------|
| 1 | `cement_block_character` | error | No gap between mask and true character | `maskMatchesTruth === true` |
| 2 | `no_pressure_choice` | error | No meaningful choice under pressure | No PressureChoice with `isGenuineDilemma === true` |
| 3 | `flat_character` | error | Character lacks dimensional contradiction | No DimensionalContradiction with `present === true` |
| 4 | `unearned_emotion` | error | Emotional moment not set up properly | EmotionalMoment with `earned === false` |
| 5 | `sentimentality` | warning | Disproportionate emotional response | EmotionalMoment with `proportionate === false` |
| 6 | `no_desire` | error | Character lacks conscious desire or goal | DesireEntry with `hasDesire === false` |

## McKee Character Principles Referenced

- **Characterization vs True Character**: "True character is revealed only under pressure" — check `cement_block_character`
- **Choice Under Pressure**: "The choice made under greatest pressure reveals the deepest truth" — check `no_pressure_choice`
- **Dimensional Contradiction**: "A character with contradiction is a character with depth" — check `flat_character`
- **Earned Emotion**: "Emotion must be earned through story structure, not injected" — checks `unearned_emotion`, `sentimentality`
- **Conscious Desire**: "Every protagonist needs a conscious object of desire" — check `no_desire`

## Tier 1 vs Tier 2

CharacterCraftHarness exists in both tiers:

| Check Type | Tier 1 (`.ts`) | Tier 2 (`.hybrid.json`) |
|-----------|:-:|:-:|
| Subtext detection (word patterns) | ✅ | — |
| Character trait pattern matching | ✅ | — |
| Cement-block character detection | — | ✅ |
| Pressure choice analysis | — | ✅ |
| Flat character detection | — | ✅ |
| Unearned emotion detection | — | ✅ |
| Sentimentality detection | — | ✅ |
| Desire/goal analysis | — | ✅ |

The **subtext check is unique to Tier 1** — the Tier 1 harness (`harnesses/CharacterCraftHarness.ts`) uses word-level patterns to detect subtext presence. Tier 2 focuses on structural character analysis through the CharacterGraph.

## Source Files

| File | Purpose |
|------|---------|
| `src/types/character-graph.ts` | CharacterGraph schema definition |
| `src/character/character-checker.ts` | 6 deterministic checks |
| `src/character/extraction-prompt.ts` | LLM extraction prompt for Phase A |
| `src/character/index.ts` | Barrel export |
| `harnesses/CharacterCraftHarness.ts` | Tier 1 code harness |
| `harnesses/CharacterCraftHarness.hybrid.json` | Tier 2 hybrid harness config |
| `harnesses/CharacterCraftHarness.test.ts` | Test suite |

## See Also

- [Tier 2 — Hybrid Harnesses](../tiers/tier-2-hybrid.md)
- [Logic Domain](logic.md)
- [Dialogue Domain](dialogue.md)
- [Narrative Domain](narrative.md)
