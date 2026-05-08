# StoryHarness — TODO

Open follow-up work, ordered roughly by priority.

---

## High Priority

*(none open — see "Done" below for the cleared backlog)*

## Medium Priority

### Future: improve L4/L5 evaluator model

The L4/L5 prompts now enforce hard quotas with few-shot examples (see commit
fixing TODO #3). If the LLM still under-flags after a few real runs, consider
upgrading the EVALUATOR model from flash-lite to a stronger model in
`src/llm/index.ts` or adding a verification pass that rejects rubber-stamp
outputs whose `confidence:high` ratio exceeds the quota.

## Low Priority

### Wire `lore_coverage` to detect categories that are *partially* uncovered

Today `SourceChecker/lore_coverage` fires when a category has ZERO matching
loreDb entries. A more nuanced version could flag categories where ≥ 50% of
claims are uncovered, even if a few are. Out of scope for now — the warning is
already informational.

### Move `output/story-2026-05-04T23-42-22.md` to a fixtures dir

That file is the regression case for the lore_coverage / contradiction fixes.
Consider moving it under `tests/fixtures/regression/` and adding an integration
test that runs the harness against it and asserts < 5 errors at L4.

---

## Done

- ✅ Add 5-level reference enforcement system (Scan/Validate/Scrutinize/Investigate/Research)
- ✅ Wire `referenceLevel` into `PersonaConfig` and genre presets
- ✅ Add `referenceLevel` selection to `create-persona` CLI
- ✅ Fix `needs-research.json` to be generated on failed runs
- ✅ Fix `ReferenceHarness.ts` Napoleon string parse error
- ✅ Fix `ReferenceCraftHarness.hybrid.json` invalid JSON (literal newlines)
- ✅ Document the reference domain (`docs/domains/reference.md`)
- ✅ **#1** Stop promoting `lore_coverage` to error at L4-5 (was unfixable
  for the LLM and blocked all drafts when `loreDb` empty).
- ✅ **#2** Logic checkers now tolerate contested-truth and common-sense plot
  devices: added `Proposition.source` and `WorldRule.source="common_sense"`
  conventions, with extractor-prompt updates and source-aware
  `checkContradictions` + `checkNecessaryWorldRules`.
- ✅ **#3** Strengthened L4/L5 prompts with hard quotas + few-shot
  WRONG → CORRECT downgrade examples to combat LLM rubber-stamping.
- ✅ **#4** Seeded `datasets/lore.family-history-cn.json` (14 verified entries
  across history/science/culture/facts) for the user's family-history persona.
- ✅ **#5** Added `resolve-research` CLI command (and pure
  `mergeResolvedIntoLore` engine) so resolved needs-research.json files merge
  back into the loreDb under the `references` namespace.
- ✅ **#6** Added per-level extraction-prompt tests
  (`src/reference/extraction-prompt.test.ts`).
- ✅ **#7** Wired `skipCategories` into `buildReferenceExtractionPrompt` so L1
  actually omits the linguistic and cultural sections from the JSON schema.
- ✅ **#8** Extended `suggestPersonaDefaults` to also propose a
  `referenceLevel` (with a per-genre fallback in `getDefaultReferenceLevel`);
  `create-persona` CLI now uses the LLM's suggestion when available.
