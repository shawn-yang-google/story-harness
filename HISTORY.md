# StoryHarness — Change History

A chronological log of substantive feature additions and architectural changes. Each entry summarizes what changed, why, and where the relevant code lives.

---

## Unreleased

### Round 2 — TODO Sweep (#1-#8)

Cleared the entire open backlog from the previous Reference-Enforcement round. The L4-5 reference path is now actually usable end-to-end (it was previously gated on an unfixable warning and noisy logic checkers). Tests grew from 335 → 352 (+17). All 352 pass.

- **#1** `applyReferenceLevel` no longer promotes `lore_coverage` to error at L4-5 — it was an author-side action the LLM couldn't fix, blocking every draft on empty `loreDb`. (`src/reference/reference-checker.ts`, `docs/domains/reference.md`.)
- **#2** Source-aware logic checks: added optional `Proposition.source` (with values `narrator | claim_by_character | claim_by_record | lore | narrative`) so contested-truth plot devices (legal drama, unreliable narrator, mystery) no longer trigger spurious `contradiction`. Added the `WorldRule.source="common_sense"` convention so universal physics rules don't trigger `necessary_precondition_missing`. Updated the logic-extraction prompt to teach the LLM both conventions. (`src/types/logic-graph.ts`, `src/logic/{propositional,causal}-checker.ts`, `src/logic/extraction-prompt.ts`.)
- **#3** Strengthened L4/L5 reference-extraction prompts with hard, enforceable quotas (L4: ≤30% high-confidence; L5: ≤10% high, every accurate must cite a source) and few-shot WRONG → CORRECT downgrade examples. Replaces the abstract "challenge high confidence" instruction that the LLM was ignoring. (`src/reference/reference-level.ts`.)
- **#4** Seeded `datasets/lore.family-history-cn.json` — 14 verified entries across history (Art. 397 dereliction, shuanggui, 1997/1999 university reforms, rural tax-for-fee), science (late-1990s SLE protocols, IUI vs IVF availability), culture (danwei, guanxi, xinfang), and household facts (dial-up adoption, appliance penetration, RMB purchasing power). Loads via the existing `references/history/science/culture/facts` keys recognized by SourceChecker.
- **#5** New `resolve-research` CLI command (and pure `mergeResolvedIntoLore` engine) closes the loop from `needs-research.json` back into the loreDb. Resolved facts land under the `references` namespace with full provenance (`fact, source, addedAt, originalClaim, originalLocation`). 4 TDD tests cover the merge behavior. (`src/reference/needs-research.ts`, `src/cli/index.ts`.)
- **#6** New `src/reference/extraction-prompt.test.ts` (7 tests) — locks in per-level prompt behavior including preamble selection, schema gating for `enrichmentSuggestions`/`researchQuestions`, and the level-3 default fallback.
- **#7** `skipCategories` is now actually honored. The L1 prompt previously documented a skip list (`["linguistic", "cultural"]`) but still emitted those JSON schema sections; refactored the schema-example assembly into per-category snippets that are conditionally included. (`src/reference/extraction-prompt.ts`.)
- **#8** `suggestPersonaDefaults` now also proposes a `referenceLevel` (with reason). The CLI `create-persona` flow prefers the LLM-suggested level over the genre default, so a "biographer" persona in a `literary-fiction` genre can still be steered toward L4. New helper `getDefaultReferenceLevel` exported from `persona-config.ts` for fallback. (`src/persona/{suggest,persona-config}.ts`, `src/cli/index.ts`.)

### Reference Enforcement Levels (1-5)

**Why:** The reference harness was producing shallow rubber-stamp results — most claims came back as `confidence: high, verdict: accurate` without meaningful analysis. There was no way to tune how rigorous the fact-checking should be for different writing styles.

**What changed:**

- **New module `src/reference/reference-level.ts`** — Defines `ReferenceLevel` (1-5) and `ReferenceLevelConfig` with per-level `promptPreamble`, `skipCategories`, `enableEnrichment`, and `enableResearchQuestions` flags.
- **5 levels:** Scan (1) → Validate (2) → Scrutinize (3, default) → Investigate (4) → Research (5).
- **Phase A modulation** — Extraction prompt now injects level-specific instructions before "## Critical Rules". Higher levels force the LLM to provide explicit reasoning, challenge "high" confidence verdicts, and (at L4+) extract implicit claims plus enrichment suggestions.
- **Phase B modulation** — New `applyReferenceLevel()` in `src/reference/reference-checker.ts` filters/promotes results: L1 strips warnings, L3 promotes `unsourced_critical` to error, L4-5 also promote `vague_history` and `lore_coverage`.
- **New types** — `EnrichmentSuggestion` and `ResearchQuestion` added to `src/types/reference-graph.ts`. Conditionally appear in the JSON schema when `enableEnrichment` / `enableResearchQuestions` is true.
- **Persona integration** — `PersonaConfig.referenceLevel: ReferenceLevel` field added to `src/persona/persona-config.ts`. Genre presets set defaults: `historical: 4`, `comedy: 1`, `children: 1`, `fantasy: 2`, others: 3.
- **CLI integration** — `create-persona` now prompts for reference level after emphasis selection, with the genre default suggested. Selected level appears in the persona preview as `Ref Level: N/5 name`.

**Tests:** +11 new tests across `reference-level.test.ts`, `reference-level-checker.test.ts`, and additions to `persona-config.test.ts`. All 335 tests pass.

**Files touched:**
- `src/reference/reference-level.ts` (new)
- `src/reference/reference-level.test.ts` (new)
- `src/reference/reference-level-checker.test.ts` (new)
- `src/reference/extraction-prompt.ts`
- `src/reference/reference-checker.ts`
- `src/types/reference-graph.ts`
- `src/types/index.ts`
- `src/persona/persona-config.ts`
- `src/persona/persona-config.test.ts`
- `src/cli/index.ts`

### Needs-Research Export Fix

**Why:** `needs-research.json` was never being generated, even when claims explicitly needed research. Two bugs: (1) the export only checked the last attempt's `graphs` field, but the last attempt is often a patch-level attempt without graphs; (2) when generation failed after exhausting all rounds, the export was bypassed entirely.

**What changed:** In `src/runner/index.ts`, the export logic now walks backwards through all attempts to find the most recent gate-level attempt with a reference graph. This works on both successful and failed runs — research checklists are now produced exactly when they're most useful (when drafts are rejected for unsourced claims).

**Files touched:**
- `src/runner/index.ts` (saveLog method)

### Bug Fixes

- **`harnesses/ReferenceHarness.ts`** — Fixed an unescaped double-quote in the Napoleon misconception string. The original `(~5'7")` prematurely terminated the JS string literal; replaced with an escaped form so the inches-mark `"` is treated as content. This was raising `AggregateError: Parse error` from Bun's transpiler and blocking all harness loading.
- **`harnesses/ReferenceCraftHarness.hybrid.json`** — Fixed literal raw newlines embedded inside JSON string values (which is invalid per JSON spec). Regenerated the file using `JSON.stringify` so all newlines inside string values are now encoded as the two-character escape sequence (backslash followed by `n`).

### Documentation

- **`docs/domains/reference.md`** (new) — Full reference domain documentation matching the style of existing logic/dialogue/character/narrative docs. Covers ReferenceGraph schema, all 8 checker modules with 30 rules, the 5-level enforcement system, genre defaults, and the needs-research export.
- **`HISTORY.md`** (this file) (new) — Change history.
- **`TODO.md`** (new) — Tracking of follow-up work.

---

## dfe5430 — Writer Persona System, Multi-Section Generation, and Draft Checker

The previous baseline. See git log for details.
