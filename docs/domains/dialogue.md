# Dialogue Domain

The dialogue domain evaluates dialogue craft based on Robert McKee's principles — ensuring conversations have subtext, conflict, distinct voices, and purposeful exposition.

## DialogueGraph Schema

The `DialogueGraph` (`src/types/dialogue-graph.ts`) contains 9 interfaces:

```
DialogueGraph
├── Speech               — Individual lines of dialogue with speaker, text, word count
├── SubtextEntry         — Hidden meaning beneath surface dialogue
├── ExpositionLine       — Information delivery classification
├── CharacterVoice       — Vocabulary, sentence length, distinctive traits per character
├── DialogueConflict     — Conflict type per speech (agreement, confrontation, etc.)
├── chitchatSpeeches     — IDs of pure filler speeches
├── monologueSpeeches    — IDs of speeches >100 words with no interruption
├── onTheNoseSpeeches    — IDs of speeches directly stating emotions
└── clicheSpeeches       — IDs of speeches using dialogue clichés
```

Key interfaces:

```typescript
interface SubtextEntry {
  speechId: string;
  surfaceMeaning: string;
  hiddenMeaning: string;
  type: "irony" | "evasion" | "deflection" | "double_meaning" | "none";
}

interface CharacterVoice {
  character: string;
  vocabulary: "formal" | "colloquial" | "technical" | "poetic" | "terse";
  avgSentenceLength: number;
  distinctiveTraits: string[];
  distinctFromOthers: boolean;
}
```

## Checks

8 checks in `src/dialogue/dialogue-checker.ts`:

| # | Rule | Severity | What It Catches | Threshold/Criteria |
|---|------|----------|----------------|-------------------|
| 1 | `chitchat_ratio` | error | Too much filler dialogue | >30% of speeches are chitchat |
| 2 | `no_subtext` | error | Dialogue too on-the-nose | >50% of subtext entries have `type="none"` |
| 3 | `exposition_dump` | error | Unnatural exposition | Any `"as_you_know_bob"` or `"info_dump"` exposition |
| 4 | `monologue_too_long` | error | Unchecked long speeches | Speeches >100 words with no interruption |
| 5 | `no_conflict` | error | All agreement, no friction | All conflict entries are `"agreement"` |
| 6 | `indistinct_voices` | error | Characters sound the same | >1 character voice has `distinctFromOthers=false` |
| 7 | `on_the_nose` | error | Directly stating emotions | Any speeches flagged as on-the-nose |
| 8 | `cliche_dialogue` | error | Stock phrases and clichés | Any speeches flagged as cliché |

## McKee Dialogue Principles Referenced

The checks are grounded in McKee's dialogue theory:

- **Subtext**: "The best dialogue has a gap between what is said and what is meant" — checks `no_subtext`, `on_the_nose`
- **Exposition as Ammunition**: "Information should be weaponized, not dumped" — check `exposition_dump`
- **Conflict**: "Every scene, every dialogue exchange, should contain conflict" — check `no_conflict`
- **Distinct Voices**: "Each character should have a unique verbal identity" — check `indistinct_voices`
- **Economy**: "Cut everything that doesn't serve the story" — check `chitchat_ratio`

## Tier 1 vs Tier 2

DialogueCraftHarness exists in both tiers:

| Check Type | Tier 1 (`.ts`) | Tier 2 (`.hybrid.json`) |
|-----------|:-:|:-:|
| Word-level cliché detection | ✅ | — |
| Voice pattern matching (lexical) | ✅ | — |
| Semantic subtext analysis | — | ✅ |
| Exposition classification | — | ✅ |
| Conflict type detection | — | ✅ |
| Character voice distinctiveness | — | ✅ |
| Chitchat ratio | — | ✅ |
| Monologue detection | — | ✅ |

The Tier 1 harness (`harnesses/DialogueCraftHarness.ts`) uses pattern matching and word lists for surface-level checks. The Tier 2 harness performs semantic analysis through LLM extraction, catching issues that pure code cannot detect (e.g., whether a character's words have hidden meaning).

## Source Files

| File | Purpose |
|------|---------|
| `src/types/dialogue-graph.ts` | DialogueGraph schema definition |
| `src/dialogue/dialogue-checker.ts` | 8 deterministic checks |
| `src/dialogue/extraction-prompt.ts` | LLM extraction prompt for Phase A |
| `src/dialogue/index.ts` | Barrel export |
| `harnesses/DialogueCraftHarness.ts` | Tier 1 code harness |
| `harnesses/DialogueCraftHarness.hybrid.json` | Tier 2 hybrid harness config |
| `harnesses/DialogueCraftHarness.test.ts` | Test suite |

## See Also

- [Tier 2 — Hybrid Harnesses](../tiers/tier-2-hybrid.md)
- [Logic Domain](logic.md)
- [Character Domain](character.md)
- [Narrative Domain](narrative.md)
