# Narrative Domain

The narrative domain evaluates story craft based on Robert McKee's story principles — ensuring scenes turn on values, stakes escalate, protagonists have goals, themes are shown rather than told, and conflict drives the narrative.

## NarrativeGraph Schema

The `NarrativeGraph` (`src/types/narrative-graph.ts`) contains 6 interfaces:

```
NarrativeGraph
├── SceneTurningValue      — Whether a scene's value changes (hope→despair, etc.)
├── StakeEntry             — Stakes with escalation tracking
├── ProtagonistDesire      — Goal presence and obstacle presence
├── ThemeDelivery          — How themes are communicated (shown vs stated)
├── ConflictEntry          — Conflict type (inner, personal, extra-personal, none)
└── PremiseCounterPremise  — Whether the story argues both sides
```

Key interfaces:

```typescript
interface SceneTurningValue {
  scene: string;
  valueBefore: string;   // "hope"
  valueAfter: string;    // "despair"
  changed: boolean;
  location: string;
}

interface StakeEntry {
  description: string;
  level: "personal" | "professional" | "life_death" | "societal";
  order: number;
  escalatesFromPrevious: boolean;
}

interface ProtagonistDesire {
  character: string;
  goal: string;
  hasGoal: boolean;
  obstaclePresent: boolean;
}

interface ThemeDelivery {
  theme: string;
  delivery: "shown" | "stated" | "didactic";
  location: string;
}

interface PremiseCounterPremise {
  premise: string;
  counterPremise: string;
  counterPresent: boolean;
}
```

## Checks

7 checks in `src/narrative/narrative-checker.ts`:

| # | Rule | Severity | What It Catches | Criteria |
|---|------|----------|----------------|----------|
| 1 | `non_turning_scene` | error | Scene with no value change — nothing happens | `changed === false` |
| 2 | `flat_stakes` | error | Stakes don't escalate through the narrative | `escalatesFromPrevious === false` (after first) |
| 3 | `no_protagonist_goal` | error | Protagonist lacks a clear goal | `hasGoal === false` |
| 4 | `no_obstacle` | error | Goal present but nothing blocking it | `hasGoal === true` && `obstaclePresent === false` |
| 5 | `didactic_theme` | error | Theme stated directly instead of shown | `delivery === "didactic"` |
| 6 | `no_conflict` | error | No conflict present in the narrative | All conflicts have `type === "none"` |
| 7 | `no_counter_premise` | error | One-sided argument without opposition | `counterPresent === false` |

## McKee Story Principles Referenced

- **Turning Values**: "A scene that does not turn is not a scene — it is activity" — check `non_turning_scene`
- **Escalating Stakes**: "Progressive complications must escalate the stakes of the story" — check `flat_stakes`
- **Protagonist Desire**: "A protagonist must have a conscious object of desire" — checks `no_protagonist_goal`, `no_obstacle`
- **Theme Through Action**: "Theme is expressed through the gap between expectation and result, not through dialogue" — check `didactic_theme`
- **Conflict**: "Story is born in conflict — without antagonism there is no progression" — check `no_conflict`
- **Premise/Counter-Premise**: "A great story argues against itself — the counter-premise makes the premise meaningful" — check `no_counter_premise`

## Fully Replaced Tier 1

Unlike Dialogue and Character, the Narrative domain is **Tier 2 only**. There is no `NarrativeCraftHarness.ts` — the original Tier 1 code harness was removed because narrative principles (turning values, escalating stakes, theme delivery) require semantic understanding that pure code cannot provide.

| Tier | Status | Reason |
|------|--------|--------|
| Tier 1 (`.ts`) | ❌ Removed | Narrative principles require semantic understanding |
| Tier 2 (`.hybrid.json`) | ✅ Active | LLM extraction + 7 deterministic checks |

The `NarrativeCraftHarness.hybrid.json` config:

```json
{
  "domain": "narrative",
  "extractionPromptAddendum": "",
  "verificationCode": ""
}
```

## Source Files

| File | Purpose |
|------|---------|
| `src/types/narrative-graph.ts` | NarrativeGraph schema definition |
| `src/narrative/narrative-checker.ts` | 7 deterministic checks |
| `src/narrative/extraction-prompt.ts` | LLM extraction prompt for Phase A |
| `src/narrative/index.ts` | Barrel export |
| `harnesses/NarrativeCraftHarness.hybrid.json` | Tier 2 hybrid harness config |

## See Also

- [Tier 2 — Hybrid Harnesses](../tiers/tier-2-hybrid.md)
- [Logic Domain](logic.md)
- [Dialogue Domain](dialogue.md)
- [Character Domain](character.md)
