# StoryHarness — TODO

Open follow-up work, ordered roughly by priority.

---

## High Priority

### Fix dead model constants (latent CRITIC / REFINER 404)

`MODELS.CRITIC` (`gemini-2.5-pro`) and `MODELS.REFINER` (`gemini-2.5-flash`)
both 404 on the current Gemini API endpoint (verified by probing all
candidate ids on 2026-05-08). The only reachable models are
`gemini-3.1-pro-preview` and `gemini-3.1-flash-lite-preview`. Every critic
invocation (`logic-critic`, `story-critic`, `critic`, `character-critic`,
`dialogue-critic`) and every synthesizer iteration (`synthesizer/index.ts` ×3)
silently fails today. **Round 5 task B** addresses this.

## Medium Priority

### Auto-`verify-citations` after `do-research --merge`

The `do-research` pipeline still trusts whatever the grounded LLM returns.
Now that `verify-citations` exists, wire it to run automatically right after
the merge step in `do-research --merge` and either (a) downgrade unverified
resolutions back to `null` so the human is asked to re-research them, or
(b) emit a warning report alongside the merge. **Round 5 task C** addresses
this.

### Future: improve L4/L5 evaluator model

The L4/L5 prompts now enforce hard quotas with few-shot examples (see commit
fixing TODO #3). If the LLM still under-flags after a few real runs, consider
upgrading the EVALUATOR model from flash-lite to a stronger model in
`src/llm/index.ts` or adding a verification pass that rejects rubber-stamp
outputs whose `confidence:high` ratio exceeds the quota.

### Verbatim-quote citation verification

`verify-citations` returns "unverifiable" when a reference has no URL and no
PMID — e.g., when the source is a verbatim legal-text quote with only a body
of law cited (Higher Ed Law Article 40). Future iteration: feed the cited
verbatim text + source description into a grounded LLM and ask "does this
quote appear at this source?" to catch hallucinated quotes too.

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

### Round 4 — Citation Audit & Flash-Model Failover (2026-05-08)

- ✅ Audited and corrected the 3 auto-researched references in
  `lore.family-history-cn.json` (1 PMID off-by-one, 1 fabricated paper, 1 dead
  URL); each now carries `verifiedAt: 2026-05-08`.
- ✅ Added `verify-citations` CLI subcommand + `src/reference/verify-citations.ts`
  module (URL HEAD + PubMed eutils + title-overlap heuristic; exits non-zero on
  any `broken` so it can be a CI gate; 9 TDD tests with stubbed `fetch`).
- ✅ Added `--generator-model {pro|flash|<raw>}` flag to `generate` so the user
  can route around `PREFILL_QUEUE_OVERLOADED` 503s on the pro endpoint by
  routing draft / rewrite / patch through `MODELS.EVALUATOR`. Plumbed via
  `RunnerOptions.generatorModel` to all 3 LLM call sites in
  `RejectionSamplingRunner`; flows to `MultiSectionRunner` via inheritance.

### Round 3 — Auto-Research Pipeline (2026-05-08)

- ✅ `do-research` CLI command (LLM with Google Search grounding produces
  `needs-research-resolved.json`).
- ✅ `generateGroundedContent` LLM helper (`src/llm/index.ts`).
- ✅ `autoResearch` orchestrator (`src/reference/auto-research.ts`) with
  graceful JSON parse fallback + grounding-URL provenance.
- ✅ `--merge` and `--continue` flags for `do-research` close the entire
  research → enrich → regenerate loop in one command.
- ✅ `--lore <path>` flag now honored by `generate` and `check`.
- ✅ End-to-end smoke test: family-history rerun produced **zero**
  `unsourced_critical` warnings and no `needs-research.json` was written.

### Round 2 — Reference-Enforcement TODO Sweep (#1-#8)

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
