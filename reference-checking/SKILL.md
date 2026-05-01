---
name: reference-checking
description: Validate real-world factual accuracy in fiction — historical events, geography, culture, science, linguistics, and anachronisms. Use when interpreting ReferenceChecker feedback, fixing factual errors in stories, understanding needs-research.json output, importing verified facts into loreDb, or debugging reference harness failures. Also use when the user asks about anachronism detection, cultural stereotyping, dialect authenticity, or scientific accuracy in narrative drafts.
---

# Reference Checking

Verifies factual claims in fiction across 8 checker domains with 31 rules. Ensures stories are grounded in real-world truth like *The Three-Body Problem* (Cultural Revolution history, Proxima Centauri science, 1960s Chinese dialect).

## Architecture

```
Tier 1: ReferenceHarness.ts        — Regex surface checks (no LLM)
Tier 2: ReferenceCraftHarness.json  — LLM extraction → ReferenceGraph → 8 deterministic checkers
Output: needs-research.json        — Unverifiable claims → author research → loreDb
```

## Checker Domains (31 Rules)

| Checker | Rules | What It Catches |
|---------|-------|-----------------|
| **HistoricalChecker** | `inaccurate_date`, `inaccurate_figure`, `timeline_conflict`, `vague_history` | Wrong dates, misattributed figures, contradictory timelines |
| **GeographicChecker** | `inaccurate_geography`, `inaccurate_celestial`, `impossible_environment`, `unverifiable_place` | Wrong terrain/climate, bad star properties, impossible physics |
| **CulturalChecker** | `inaccurate_custom`, `era_mismatch`, `stereotyping`, `unverifiable_culture` | Wrong customs, anachronistic traditions, universalizing language |
| **ScientificChecker** | `inaccurate_science`, `fictional_science_leak`, `outdated_science`, `unverifiable_science` | Bad physics, fictional tech as fact, superseded claims |
| **LinguisticChecker** | `dialect_mismatch`, `period_language_violation`, `naming_inconsistency`, `register_mismatch` | Wrong dialects, modern slang in old settings, bad names |
| **AnachronismChecker** | `technology_anachronism`, `concept_anachronism`, `language_anachronism`, `cultural_anachronism` | Smartphones in 1960s, NATO in medieval times |
| **ConsistencyChecker** | `cross_reference_conflict`, `category_contradiction`, `duplicate_claim` | Internal factual contradictions |
| **SourceChecker** | `contradicts_lore`, `unsourced_critical`, `research_needed`, `lore_coverage` | LoreDb conflicts, missing sources |

For per-checker details and fix strategies, see [references/checkers.md](references/checkers.md).

## Feedback Format

```
[CheckerName/rule_name] Description: "evidence" — explanation
```

Examples:
```
[HistoricalChecker/inaccurate_date] Inaccurate historical date: "Cultural Revolution" placed in "1958" — Correction: began in 1966
[AnachronismChecker/technology_anachronism] Technology anachronism: "smartphone" in 1960s story — smartphones are from 2007+
[CulturalChecker/stereotyping] Possible stereotyping: "All Japanese people always bow" — universalizing language
```

## Quick Fixes

| Rule | Fix |
|------|-----|
| `inaccurate_date` | Verify date against primary historical sources, correct in narrative |
| `inaccurate_figure` | Check the figure's actual role/title/timeline |
| `timeline_conflict` | Ensure all historical references in the story agree on dates |
| `technology_anachronism` | Remove or replace with period-appropriate equivalent |
| `language_anachronism` | Replace modern slang with era-appropriate expressions |
| `dialect_mismatch` | Research actual speech patterns of the region/era |
| `stereotyping` | Replace "all/every/always" with specific, observed behavior |
| `fictional_science_leak` | Mark speculative science explicitly as fictional within narrative |
| `inaccurate_science` | Consult domain textbooks or peer-reviewed papers |
| `contradicts_lore` | Align story with author's established loreDb facts |
| `research_needed` | Export needs-research.json and complete research checklist |

## The needs-research.json Workflow

When the harness identifies claims it cannot verify, it generates a research checklist:

```
Draft → Reference Harness → needs-research.json → Author researches → loreDb
```

1. Run generation: claims extracted and checked
2. Unverifiable claims exported to `needs-research.json` (priority-sorted)
3. Author fills in the `resolution` field for each item
4. Import resolved facts: `bun run src/cli/index.ts import-research <file>`
5. Verified facts merge into loreDb for future validations

For the full needs-research schema and workflow, see [references/needs-research.md](references/needs-research.md).

## LoreDb Structure for Reference Checking

Add verified facts to the loreDb to improve future accuracy:

```json
{
  "references": {
    "cultural revolution": "nationwide political movement 1966-1976, launched by Mao Zedong"
  },
  "facts": {
    "proxima centauri": "red dwarf star, 4.24 light-years from Earth, M-type"
  },
  "history": {
    "red coast base": "fictional, but set in Inner Mongolia's Greater Khingan Range"
  }
}
```

Keys under `references`, `facts`, `history`, `geography`, `science`, `culture` are matched against extracted claims.

## Genre Activation

| Genre | Tier 1 | Tier 2 | Why |
|-------|--------|--------|-----|
| literary-fiction | ✅ | ✅ | Real-world grounding is essential |
| historical | ✅ | ✅ | **Most critical** — entire genre depends on accuracy |
| sci-fi | ✅ | ✅ | Science claims must be correct |
| thriller | ❌ | ❌ | Enable manually if story references real events |
| mystery | ❌ | ❌ | Enable manually if story references real places |
| fantasy | ❌ | ❌ | Fantasy worlds have their own rules |
| children | ❌ | ❌ | Imagination prioritized over accuracy |

Enable manually for any genre: add `"ReferenceHarness.ts"` and `"ReferenceCraftHarness.hybrid.json"` to the genre's harness list.
