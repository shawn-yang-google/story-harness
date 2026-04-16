# Logic Domain

The logic domain verifies narrative consistency through formal logic — ensuring that stories don't contradict themselves, respect causality, and maintain coherent character knowledge and world rules.

## LogicGraph Schema

The `LogicGraph` (`src/types/logic-graph.ts`) is the structured intermediate representation extracted by the LLM in [Tier 2](../tiers/tier-2-hybrid.md) Phase A. It contains 14 interfaces organized into 6 logical subsystems:

```
LogicGraph
├── Propositional Logic
│   ├── Proposition          — Asserted/negated statements about entities
│   ├── ConditionalRule      — P→Q and P↔Q relationships
│   └── Conclusion           — Inferred claims with inference type
├── Temporal Logic
│   ├── TemporalEvent        — Ordered narrative events
│   ├── TemporalConstraint   — Before/after ordering requirements
│   └── StateChange          — Entity attribute changes over time
├── Epistemic Logic
│   ├── KnowledgeEntry       — What agents know and how they learned it
│   └── Ability              — What agents can do and when established
├── Deontic Logic
│   ├── Obligation           — What agents must do
│   └── Prohibition          — What agents must not do
├── Modal Logic
│   └── WorldRule            — Necessary/impossible/conditional world rules
└── Entity State
    ├── InventoryItem        — Object possession tracking
    ├── LocationEntry        — Agent location tracking
    └── StatusEntry          — Agent status tracking (alive, dead, etc.)
```

## Checker Modules

6 checker modules in `src/logic/`, aggregated by `runAllCheckers()` in `src/logic/index.ts`:

### 1. Propositional Checker — `src/logic/propositional-checker.ts`

| # | Rule | What It Catches | Example |
|---|------|----------------|---------|
| 1 | `contradiction` | P ∧ ¬P — same subject+predicate, opposite truth | "Elara is brave" + "Elara is not brave" at the same location |
| 2 | `modus_ponens_violation` | P→Q, P is true, but Q is false | "If it rains, the ground is wet" + it rains + ground is dry |
| 3 | `modus_tollens_violation` | P→Q, Q is false, but P is true | "If she's a witch, she floats" + she sinks + but she's a witch |
| 4 | `affirming_consequent` | Fallacy: Q is true, therefore P | "The ground is wet, therefore it rained" (could be sprinklers) |
| 5 | `denying_antecedent` | Fallacy: P is false, therefore ¬Q | "It didn't rain, therefore the ground is dry" |
| 6 | `unsupported_conclusion` | Conclusion with no premises | A claim made without any supporting evidence |

### 2. Temporal Checker — `src/logic/temporal-checker.ts`

| # | Rule | What It Catches |
|---|------|----------------|
| 7 | `temporal_violation` | Events out of required order |
| 8 | `impossible_simultaneity` | Agent in two places at the same time |
| 9 | `state_used_before_change` | Entity state referenced before it was established |
| 10 | `backwards_causation` | Effect appears before its cause |

### 3. Epistemic Checker — `src/logic/epistemic-checker.ts`

| # | Rule | What It Catches |
|---|------|----------------|
| 11 | `knowledge_before_learning` | Agent uses knowledge before learning it |
| 12 | `unexplained_knowledge` | Agent knows something with no established source |
| 13 | `ability_before_established` | Agent uses ability before it's established |
| 14 | `impossible_deduction` | Agent deduces something from insufficient premises |
| 15 | `knowledge_after_forgetting` | Agent uses knowledge that was explicitly forgotten |

### 4. Deontic Checker — `src/logic/deontic-checker.ts`

| # | Rule | What It Catches |
|---|------|----------------|
| 16 | `unfulfilled_obligation` | Obligation established but never addressed |
| 17 | `unacknowledged_violation` | Prohibition violated without narrative consequence |
| 18 | `contradictory_deontic` | Agent both must and must-not do the same thing |
| 19 | `obligation_without_source` | Obligation with no established origin |

### 5. Entity Checker — `src/logic/entity-checker.ts`

| # | Rule | What It Catches |
|---|------|----------------|
| 20 | `item_used_after_lost` | Character uses an item they already lost/gave away |
| 21 | `item_never_acquired` | Character uses an item they never had |
| 22 | `impossible_location` | Character appears at a location without traveling there |
| 23 | `action_while_incapacitated` | Dead/unconscious character takes action |
| 24 | `status_contradiction` | Character simultaneously alive and dead |

### 6. Causal Checker — `src/logic/causal-checker.ts`

| # | Rule | What It Catches |
|---|------|----------------|
| 25 | `uncaused_effect` | Major event with no established cause |
| 26 | `broken_causal_chain` | Intermediate step missing in a cause-effect chain |
| 27 | `world_rule_violation` | Violation of an established world rule (e.g., "only dragonfire melts adamantine") |

## Extraction Prompt Strategy

The extraction prompt (`src/logic/extraction-prompt.ts`) instructs Flash-Lite to:

1. **Read** the narrative draft plus any lore database and previous story beats
2. **Extract** every proposition, event, knowledge entry, obligation, etc. into the `LogicGraph` schema
3. **Include locations** — every extracted element has a `location` field (e.g., "paragraph 2, sentence 1") for traceability back to the source text
4. **Cross-reference lore** — if a lore database is provided, contradictions between the draft and established lore are captured

The prompt is expert-crafted and covers all 14 interface types with examples.

## The P∧¬P Location-Aware Fix

A key design decision in the propositional checker: **contradictions are only flagged when propositions co-occur at the same narrative location**. If the same predicate appears with opposite truth values at different locations, this is treated as a **state change over time** rather than a logical contradiction.

```typescript
// From src/logic/propositional-checker.ts
// Only flag contradictions where propositions co-occur at the same
// narrative location. If they're at different locations, this is
// likely a state change over time (handled by the temporal checker).
```

For example:
- ❌ `"Elara is brave"` (paragraph 1) + `"Elara is not brave"` (paragraph 1) → **Contradiction**
- ✅ `"Elara is brave"` (paragraph 1) + `"Elara is not brave"` (paragraph 5) → **State change** (deferred to temporal checker)

This prevents false positives in narratives where characters change over time.

## Tier Coverage

| Tier | Harness | What It Checks |
|------|---------|---------------|
| [Tier 1](../tiers/tier-1-code.md) | `LogicHarness.ts` | Basic lore consistency (word-level pattern matching) |
| [Tier 2](../tiers/tier-2-hybrid.md) | `LogicCraftHarness.hybrid.json` | Full 27-check logic verification via LogicGraph |

The Tier 1 LogicHarness handles simple lore lookups. The Tier 2 LogicCraftHarness is the comprehensive logic verification system described above.

## See Also

- [Tier 2 — Hybrid Harnesses](../tiers/tier-2-hybrid.md)
- [Dialogue Domain](dialogue.md)
- [Character Domain](character.md)
- [Narrative Domain](narrative.md)
