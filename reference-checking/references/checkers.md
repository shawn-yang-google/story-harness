# Reference Checker Details

Detailed rules, examples, and fix strategies for each of the 8 reference checker modules.

## Table of Contents

1. [HistoricalChecker](#1-historicalchecker)
2. [GeographicChecker](#2-geographicchecker)
3. [CulturalChecker](#3-culturalchecker)
4. [ScientificChecker](#4-scientificchecker)
5. [LinguisticChecker](#5-linguisticchecker)
6. [AnachronismChecker](#6-anachronismchecker)
7. [ConsistencyChecker](#7-consistencychecker)
8. [SourceChecker](#8-sourcechecker)

---

## 1. HistoricalChecker

**Source**: `src/reference/historical-checker.ts`

### Rules

| Rule | Severity | Trigger |
|------|----------|---------|
| `inaccurate_date` | error | Historical event at wrong date (high confidence) |
| `inaccurate_figure` | warning | Historical figure partially mischaracterized |
| `timeline_conflict` | error | Two historical claims contradict each other's timeline |
| `vague_history` | warning | Historical reference too vague to verify |

### Examples

**inaccurate_date**: "The Cultural Revolution began in 1958" → Actually 1966. Fix: verify with historical sources.

**timeline_conflict**: Story says event X happened in 1958 but also during the Cultural Revolution (1966-1976). Fix: make dates internally consistent.

**vague_history**: "During the ancient wars, the emperor fell." Fix: specify which emperor, which war, which era.

### Fix Strategy

1. Cross-reference with 2+ primary sources for dates
2. Use specific dates/periods, not "long ago" or "in the old days"
3. Add verified dates to loreDb under `history` key

---

## 2. GeographicChecker

**Source**: `src/reference/geographic-checker.ts`

### Rules

| Rule | Severity | Trigger |
|------|----------|---------|
| `inaccurate_geography` | error/warning | Wrong physical description of real place |
| `inaccurate_celestial` | error/warning | Wrong star/planet/moon properties |
| `impossible_environment` | error | Natural phenomenon violates physics |
| `unverifiable_place` | warning | Geographic claim needs verification |

### Examples

**inaccurate_celestial**: "Proxima Centauri, the blue giant" → It's a red dwarf (M-type). Fix: check NASA databases.

**impossible_environment**: "The Sahara's freezing rain forests" → The Sahara is hot desert. Fix: verify biome/climate.

### Fix Strategy

1. Use Google Earth for terrain/architecture verification
2. Check NASA/ESA databases for celestial body properties
3. Verify climate data for the specific time period (climates change)

---

## 3. CulturalChecker

**Source**: `src/reference/cultural-checker.ts`

### Rules

| Rule | Severity | Trigger |
|------|----------|---------|
| `inaccurate_custom` | error/warning | Custom wrong for the stated culture |
| `era_mismatch` | warning | Custom exists but not in depicted era |
| `stereotyping` | warning | Universalizing language ("all", "every", "always") |
| `unverifiable_culture` | warning | Niche cultural claim needs expert input |

### Examples

**era_mismatch**: Modern sushi conveyor belts in 1920s Japan → Kaiten-zushi wasn't invented until 1958. Fix: use period-appropriate dining customs.

**stereotyping**: "All Chinese families eat rice at every meal" → Universalizing. Fix: "The family sat down to their evening rice" (specific, not generalized).

### Fix Strategy

1. Specify the exact community, not the entire culture
2. Verify customs against the SPECIFIC time period
3. Consult ethnographic studies or people from the culture
4. Replace "all/every/always/never" with observed specifics

---

## 4. ScientificChecker

**Source**: `src/reference/scientific-checker.ts`

### Rules

| Rule | Severity | Trigger |
|------|----------|---------|
| `inaccurate_science` | error/warning | Wrong science asserted as fact |
| `fictional_science_leak` | error | Fictional tech presented as established science |
| `outdated_science` | warning | Once-true science now superseded |
| `unverifiable_science` | warning | Domain-expert verification needed |

### Examples

**fictional_science_leak**: "Quantum entanglement allows faster-than-light communication" asserted as fact → It doesn't. Fix: mark as speculative or frame as character's hypothesis.

**outdated_science**: "Pluto is the ninth planet" → Reclassified in 2006. Fix: update unless story is set pre-2006.

### Fix Strategy

1. Distinguish fictional/speculative science from asserted facts
2. Frame speculative science through character perspective ("she theorized that...")
3. Check publication date of sources — science evolves
4. For medical/bio claims, verify against current consensus

---

## 5. LinguisticChecker

**Source**: `src/reference/linguistic-checker.ts`

### Rules

| Rule | Severity | Trigger |
|------|----------|---------|
| `dialect_mismatch` | error/warning | Speech doesn't match character's region |
| `period_language_violation` | error/warning | Modern language in historical setting |
| `naming_inconsistency` | warning | Character name wrong for their background |
| `register_mismatch` | warning | Formal/informal level wrong for context |

### Examples

**dialect_mismatch**: Character from 1960s Beijing using Cantonese expressions → Beijing speakers use Mandarin. Fix: research regional speech patterns.

**naming_inconsistency**: A character from feudal Japan named "Kevin" → Fix: use culturally appropriate names.

**register_mismatch**: Peasant addressing emperor with casual slang → Fix: use appropriate honorifics/registers.

### Fix Strategy

1. Research specific regional dialects (not just the national language)
2. Use period-appropriate terms of address and honorifics
3. Verify character names against naming conventions of the culture/era
4. Read literature FROM the depicted era to absorb authentic language

---

## 6. AnachronismChecker

**Source**: `src/reference/anachronism-checker.ts`

### Rules

| Rule | Severity | Trigger |
|------|----------|---------|
| `technology_anachronism` | error | Tech from a later era (smartphone, TV, etc.) |
| `concept_anachronism` | error | Institutions/ideas that didn't exist yet |
| `language_anachronism` | error | Words/phrases coined after the story's era |
| `cultural_anachronism` | error | Cultural products from wrong era |

### Examples

**technology_anachronism**: "She pulled out her smartphone" in a 1960s story → Smartphones from 2007. Fix: "She checked her wristwatch."

**concept_anachronism**: "The NATO alliance" in a medieval story → NATO founded 1949. Fix: remove or use period equivalent.

**language_anachronism**: "That's so extra" in a Victorian story → Modern Gen-Z slang. Fix: "How excessive."

### Fix Strategy

1. Create a timeline of technology for the story's era
2. Research when specific words/phrases entered common usage
3. Use etymological dictionaries to verify word origins
4. When in doubt, use simpler, older expressions

---

## 7. ConsistencyChecker

**Source**: `src/reference/consistency-checker.ts`

### Rules

| Rule | Severity | Trigger |
|------|----------|---------|
| `cross_reference_conflict` | error | LLM-detected contradictions between claims |
| `category_contradiction` | warning | Same subject with conflicting facts across categories |
| `duplicate_claim` | warning | Same claim stated with different verdicts |

### Examples

**cross_reference_conflict**: Story says the battle was in 1832 (paragraph 2) but also in 1835 (paragraph 7). Fix: pick one correct date and use consistently.

**category_contradiction**: Historical section says the city was founded in 1200, but geographic section describes modern architecture. Fix: verify and reconcile.

### Fix Strategy

1. Maintain a fact sheet for each story
2. Search for the same subject across all mentions — ensure consistency
3. Use the loreDb to lock down established facts

---

## 8. SourceChecker

**Source**: `src/reference/source-checker.ts`

### Rules

| Rule | Severity | Trigger |
|------|----------|---------|
| `contradicts_lore` | error | Claim contradicts author's loreDb |
| `unsourced_critical` | warning | Important claim with no verified source |
| `research_needed` | warning | N claims need human verification |
| `lore_coverage` | warning | LoreDb missing entries for some categories |

### Examples

**contradicts_lore**: LoreDb says "Cultural Revolution: 1966-1976" but story says 1958. Fix: align story with your own research.

**lore_coverage**: Story has scientific claims but loreDb has no `science` section. Fix: add verified scientific facts to loreDb.

### Fix Strategy

1. Keep loreDb up-to-date with all verified research
2. After completing needs-research.json, import resolved facts
3. Add entries for all 6 loreDb categories: `references`, `facts`, `history`, `geography`, `science`, `culture`
