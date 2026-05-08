# Reference Domain

The reference domain verifies that fiction is grounded in real-world truth — historical events, geography, culture, science, and linguistic authenticity. It catches anachronisms, factual errors, and lore inconsistencies, while also surfacing claims that need human research.

## ReferenceGraph Schema

The `ReferenceGraph` (`src/types/reference-graph.ts`) is the structured intermediate representation extracted by the LLM in [Tier 2](../tiers/tier-2-hybrid.md) Phase A. It contains 8 typed reference categories plus optional level 4+ outputs:

```
ReferenceGraph
├── Core Claims
│   ├── claims                  — Flat FactualClaim[] across all categories
│   ├── historical              — HistoricalReference[] (events, figures, periods)
│   ├── geographic              — GeographicReference[] (places, celestial, terrain)
│   ├── cultural                — CulturalReference[] (customs, food, art)
│   ├── scientific              — ScientificReference[] (physics, biology, medicine)
│   └── linguistic              — LinguisticReference[] (dialects, period language)
├── Cross-Cutting
│   ├── anachronisms            — AnachronismEntry[] (modern elements in past settings)
│   └── crossReferences         — CrossReference[] (internal claim conflicts)
└── Enrichment (Level 4+)
    ├── enrichmentSuggestions   — EnrichmentSuggestion[] (deepening details)
    └── researchQuestions       — ResearchQuestion[] (Level 5 only)
```

Each claim carries: `excerpt`, `claim`, `location`, `confidence` (high/medium/low/unverifiable), `verdict` (accurate/inaccurate/partially_accurate/needs_research), `reasoning`, and optional `correction` and `knowledgeSource`.

## Checker Modules

8 checker modules in `src/reference/`, aggregated by `checkReferences()` in `src/reference/reference-checker.ts` (30 rules total):

### 1. Historical Checker — `src/reference/historical-checker.ts`

| Rule | What It Catches |
|------|----------------|
| `inaccurate_date` | Wrong dates for well-known historical events |
| `figure_misattribution` | Historical figure with wrong role/title/timeline |
| `timeline_violation` | Events in impossible historical sequence |
| `vague_history` | Historical references too vague to verify |

### 2. Geographic Checker — `src/reference/geographic-checker.ts`

| Rule | What It Catches |
|------|----------------|
| `inaccurate_place` | Real place described inaccurately |
| `inaccurate_celestial` | Astronomical/celestial facts wrong |
| `environment_mismatch` | Climate/terrain inconsistent with location |
| `unverifiable_place` | Place reference too vague to verify |

### 3. Cultural Checker — `src/reference/cultural-checker.ts`

| Rule | What It Catches |
|------|----------------|
| `inaccurate_custom` | Custom misattributed to a culture |
| `era_mismatch` | Custom from wrong time period |
| `stereotyping` | Reductive cultural depictions |
| `unverifiable_culture` | Cultural detail too obscure to verify |

### 4. Scientific Checker — `src/reference/scientific-checker.ts`

| Rule | What It Catches |
|------|----------------|
| `inaccurate_science` | Real-world science asserted incorrectly |
| `fictional_leak` | Speculative fiction presented as fact |
| `outdated_science` | Superseded scientific claims |
| `unverifiable_science` | Specialized claim needing expert review |

### 5. Linguistic Checker — `src/reference/linguistic-checker.ts`

| Rule | What It Catches |
|------|----------------|
| `dialect_mismatch` | Wrong regional dialect features |
| `period_language` | Modern slang in historical settings |
| `naming_anachronism` | Names culturally/temporally inappropriate |
| `register_violation` | Wrong honorifics, formality, or register |

### 6. Anachronism Checker — `src/reference/anachronism-checker.ts`

| Rule | What It Catches |
|------|----------------|
| `tech_anachronism` | Technology before its invention |
| `concept_anachronism` | Concepts that didn't exist yet |
| `language_anachronism` | Period-inappropriate vocabulary |
| `cultural_anachronism` | Customs from a future era |

### 7. Consistency Checker — `src/reference/consistency-checker.ts`

| Rule | What It Catches |
|------|----------------|
| `cross_reference_conflict` | Two claims internally contradict |
| `category_contradiction` | Same fact treated differently across categories |
| `duplicate_claims` | Same claim extracted multiple times |

### 8. Source Checker — `src/reference/source-checker.ts`

| Rule | What It Catches |
|------|----------------|
| `lore_contradiction` | Draft contradicts the author's `loreDb` |
| `unsourced_critical` | Critical fact lacks verified source |
| `research_needed` | Claims require human verification |
| `lore_coverage` | LoreDb missing entries for claimed categories |

## Reference Enforcement Levels

The reference domain is the only domain with a tunable **enforcement level** (1-5), set per-persona in `PersonaConfig.referenceLevel`. The level modulates both Phase A (extraction prompt depth) and Phase B (severity gating).

| Level | Name | Phase A Behavior | Phase B Severity | Output |
|-------|------|------------------|------------------|--------|
| **1** | Scan | Skip linguistic/cultural; only obvious errors | Errors only (warnings suppressed) | `CheckResult[]` |
| **2** | Validate | All categories, standard assessment | All results unchanged | `CheckResult[]` + `needs-research.json` |
| **3** | Scrutinize *(default)* | Force explicit reasoning; challenge "high" confidence | `unsourced_critical` → error | Full output |
| **4** | Investigate | Extract implicit claims; suggest enrichment | Also `vague_history` → error | + `enrichmentSuggestions[]` |
| **5** | Research | Research consultant mode; treat all as `needs_research` | Same as level 4 | + `researchQuestions[]` |

### Genre Defaults

| Genre | Default Level | Rationale |
|-------|--------------|-----------|
| `historical` | 4 | Historical fiction demands deep rigor |
| `comedy` | 1 | Comedy doesn't need fact-checking |
| `children` | 1 | Simple stories don't need depth |
| `fantasy` | 2 | Magic systems break real-world checks |
| All others | 3 | Default skeptical scrutiny |

### Setting the Level

The level is selected interactively during `create-persona`, or can be edited directly in the persona JSON:

```json
{
  "checkerConfig": {
    "referenceLevel": 4,
    "enabledCheckers": { "reference": true, ... },
    "thresholds": { ... }
  }
}
```

## The Needs-Research Export

When `needs_research` claims exist after generation, the runner writes `needs-research.json` to the session log directory. This file lists all unverifiable claims with suggested research sources, intended for human resolution. Resolved entries can be merged back into the `loreDb` for future runs.

The export runs on **both successful and failed generations** — failures are exactly when research is most valuable. The runner walks backwards through attempts to find the most recent gate-level attempt with a reference graph (patch-level attempts don't carry graphs).

## Tier Coverage

| Tier | Harness | What It Checks |
|------|---------|---------------|
| [Tier 1](../tiers/tier-1-code.md) | `ReferenceHarness.ts` | Regex-based anachronism red flags, impossible measurements, common misconceptions |
| [Tier 2](../tiers/tier-2-hybrid.md) | `ReferenceCraftHarness.hybrid.json` | Full 30-check reference verification via ReferenceGraph |

The Tier 1 ReferenceHarness catches obvious surface-level issues (modern tech in historical settings, "Napoleon was short" myth). The Tier 2 ReferenceCraftHarness performs LLM-powered fact extraction and deterministic checking.

## See Also

- [Tier 2 — Hybrid Harnesses](../tiers/tier-2-hybrid.md)
- [Logic Domain](logic.md)
- [Character Domain](character.md)
- [Dialogue Domain](dialogue.md)
- [Narrative Domain](narrative.md)
