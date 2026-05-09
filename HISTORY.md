# StoryHarness — Change History

A chronological log of substantive feature additions and architectural changes. Each entry summarizes what changed, why, and where the relevant code lives.

---

## Unreleased

### Round 8-B / 8-C — Structural Rewrite Tier, Premise-Staging Discipline, Regression Anchor

R8-A's recurrence telemetry (commit `b5e4bbb`) made the oscillations
visible but did not fix them. R8-B and R8-C close the loop with two
orthogonal interventions:

- **R8-B — Centralized rule classification + structural-rewrite cap.**
  New `src/runner/rule-classification.ts` exposes `classifyFeedback`,
  which maps every feedback string to `"structural"` or `"surgical"`. The
  registry has two parts: `STRUCTURAL_FINGERPRINTS` (Tier-2 rules whose
  `[Checker/rule]` prefix indicates a scene-level problem —
  `cement_block_character`, `unearned_emotion`, `exposition_dump`,
  `indistinct_voices`, `no_subtext`, `no_conflict`, `no_obstacle`) and
  `STRUCTURAL_TIER3_PATTERNS` (lowercased substrings from
  `harnesses/ReaderExperience.prompt.txt` — `opening hook`, `who cares?`,
  `page-turner momentum`, `cringe factor`, `voice distinctiveness`).
  Defaults to `"surgical"` for unknown rules — the safer choice. The
  hardcoded 6-substring list inside `runner/index.ts` is gone; one place
  to look up structural classification.

  The runner's existing structural-rewrite phase is now (a) gated by the
  per-session `STRUCTURAL_REWRITE_CAP=2` and (b) can be triggered by
  R8-A escalation: any *surgical* fingerprint with
  `recurrenceCount >= OSCILLATION_ESCALATION_THRESHOLD` (default 1) is
  promoted to structural for the current round. Hitting the cap writes a
  `needs-human-rewrite.md` to the session dir and skips further LLM
  rewrites. `status.json` now reports `structuralRewriteCount`,
  `structuralRewriteCap`, and the existing `oscillations` array.

- **R8-C — Premise-staging discipline.** New
  `src/runner/premise-staging.ts` exposes `requiresPremiseStaging` (the
  two-rule gate — `PropositionalChecker/unsupported_conclusion` and
  `SoundnessChecker/non_sequitur`), `buildPremiseStagingInstruction` (the
  per-rule prompt augmentation block — verbatim two-constraint wording
  from TODO.md R8-C), and `validatePremisePatch` (rejects empty patches,
  rejects single-diff edits where the revised text is < 1.5× the
  original by character count). The runner appends the instruction to
  the patch prompt and validates the resulting diffs; rejected patches
  do NOT mutate `currentDraft` and increment `premiseRejections` for the
  status.json. The 1.5× threshold is empirical: 2× rejected too many
  legitimate "added a clause" patches; 1.2× let through paraphrase-only
  edits.

- **Q3 — Regression fixture for the historic failed session.** New
  `tests/fixtures/regression/family-history-oscillation/` captures the
  round-by-round feedback verbatim from
  `logs/generate-2026-05-08T22-57-33-123Z` (the canonical 5-round
  oscillation case). The companion test
  `src/runner/oscillation-regression.test.ts` replays the captured
  feedback through `OscillationGuard.recordRound`, `classifyFeedback`,
  and `requiresPremiseStaging` — asserting (a) `psychic_knowledge` is
  recurrent in rounds 1+5, `unsupported_conclusion` in 2+3+4+5,
  `non_sequitur` in 2+3+5, etc. (exact counts), (b) every Tier-3
  reader-experience verdict and every structural Tier-2 rule observed
  classifies as `"structural"`, (c) `requiresPremiseStaging` opts in on
  exactly the 7 unsupported_conclusion / non_sequitur entries across
  the 5 rounds. Hermetic — no LLM calls, no network. Inner double
  quotes in the captured strings were re-encoded as U+2018/U+201C smart
  quotes so the JSON parses cleanly; the test only inspects the
  `[Checker/rule]` prefix, not the message body. A bug in the initial
  `STRUCTURAL_FINGERPRINTS` list (mis-attributing `no_subtext` to
  NarrativeChecker instead of DialogueChecker) was caught by this
  fixture and corrected.

- **TDD coverage.** 9 unit tests for `classifyFeedback`, 10 unit tests
  for premise-staging (fingerprint, instruction-builder, patch-shape
  validation including the deletion-only rejection), 2 end-to-end
  integration tests in `r8b-r8c-integration.test.ts` (R8-B cap fires
  with `needs-human-rewrite.md` written; R8-C gate refuses single-line
  conclusion-only patches and `BAD_CONCLUSION` is never erased), 3
  regression tests in `oscillation-regression.test.ts`. The pre-R8-A
  R8-A integration test was loosened by exactly one assertion (the
  recurrence may now surface in the structural-rewrite prompt instead of
  the patch prompt — both paths satisfy the contract).

- Tests: **421 pass** (up from 397, +24 = 9 + 10 + 2 + 3). TS errors:
  391 distinct (`grep -E '^src/.*error TS'`), no new errors from any
  file added in this round.

- **Deferred:** Q1 (does L4/L5 under-flag rubber-stamp drafts?) and Q2
  (`lore_coverage_partial` author-intuition tuning) remain in TODO.md.
  Both require real LLM runs against the family-history prompt to
  answer; the R8 changes set up the conditions for that re-run.

### Round 8-A — Patch Oscillation Guard

Two real generation runs on the family-history prompt (sessions
`generate-2026-05-08T22-57-33-123Z` and `generate-2026-05-08T23-10-24-196Z`)
both failed to converge after 5 rounds. Per-round feedback analysis showed
the same `(checker, rule)` fingerprint firing in non-consecutive rounds —
`EpistemicChecker/psychic_knowledge` recurred in rounds 1, 2, 3, AND 5 of the
22-57-33 session. The patch in round N would fix issue X but reintroduce
issue Y from round N-1; without per-session memory, the runner had no way to
ask the patch LLM "do not undo the prior fix." R8-A closes that gap.

- **`src/runner/oscillation-guard.ts` — pure data structure.** New
  `OscillationGuard` class plus the `extractFingerprint(feedback)` helper that
  parses the canonical `[Checker/rule] message` prefix produced by
  `environment/hybrid-harness.ts`. The fingerprint is `${checker}/${rule}`;
  message text and severity are intentionally dropped so the same rule firing
  on a different paragraph still counts as the same oscillation (the LLM is
  failing to internalize the rule itself, not just one site of it). API:
  `recordRound(round, feedback[])`, `priorRounds(fp)`, `wasSeenInPriorRound`,
  `recurrenceCount` (= distinctRounds - 1, so first sighting is not a
  recurrence), `shouldEscalateToStructural(fp, threshold)`, `allRecurrent`.
  Multiple violations of the same rule within ONE round count as one sighting
  by design.
- **Wiring in `src/runner/index.ts`.** A guard is instantiated per
  `generateScene()` call (each scene has its own validation history). After
  every round-level gate run, `oscillationGuard.recordRound(round, feedback)`
  is called. Each per-patch prompt now includes a `## ⚠ Oscillation Warning`
  block whenever `extractFingerprint(issue)` was already recorded in a
  STRICTLY prior round, listing the rounds and instructing the LLM not to
  reintroduce the prior fix's pattern. A yellow `⟳ Oscillation: ...` line is
  also logged so operators can see the guard fire in real time.
- **Telemetry in `status.json`.** Failed-converge sessions now emit an
  `oscillations` array of `{fingerprint, rounds, recurrenceCount}` so
  operators don't have to hand-grep round-N feedback.md files to figure out
  which checker rules kept reasserting themselves.
- **TDD coverage.** 12 unit tests in `oscillation-guard.test.ts`
  (fingerprint parsing edge cases — severity tags, empty strings,
  non-bracketed feedback; guard semantics — "current round doesn't count as
  prior", "multiple violations per round don't double-count",
  threshold-based escalation, alphabetic determinism). 1 integration test in
  `oscillation-integration.test.ts` exercises the full runner with two fake
  checkers that toggle TOKEN_A↔TOKEN_B every patch (the canonical R8-A
  oscillation pattern from the TODO); asserts both `status.oscillations`
  records the recurrence and the round-3 patch prompt embeds the warning
  block.
- **Net diagnostic.** No false positives — the `extractFingerprint`
  intentionally returns `null` for tier-1 style notes, harness-skipped
  warnings (`⚠ LLM Harness skipped (API unavailable)`), and harness execution
  failures, so transient infrastructure failures don't get tagged as
  oscillations.
- Tests: **397 pass** (up from 384, +13 = 12 unit + 1 integration). TS
  errors: 452 (down 3 from the 455 baseline — my new files are net-positive
  on type strictness).
- **Deferred:** R8-B (scene-level structural rewrite escalation) and R8-C
  (premise-staging discipline for `unsupported_conclusion` /
  `non_sequitur`) remain open and can now consume R8-A's recurrence
  telemetry as an escalation signal — see `TODO.md`.

### Round 6 — Verbatim-Quote Verification, Partial Lore Coverage, Regression Fixture

Three follow-ups that close gaps surfaced in Rounds 4-5.

- **Verbatim-quote verification (`--verify-quotes`).** Adds a third citation-check path alongside URL HEAD and PubMed PMID. Extracts verbatim quotes (English `"..."`/`"..."`, Chinese `「...」`/`『...』`, ≥20 chars to skip noise) from each reference's source field, then asks `generateGroundedContent` whether each quote appears at the cited source. Parses `{verified, url}` with markdown-fence stripping. Lazy-imports the LLM module so the test mock catches it. Cost-gated: no LLM call when there are no quotes, when `verifyQuotes=false` (the default), or for short quotes. Live result against `lore.family-history-cn.json`: the Article 40 ref went from `unverifiable` to `verified` (verbatim Chinese legal text confirmed at npc.gov.cn), the Andre F JCO 2004 paper picked up an additional quote-match at ascopubs.org, and the Medscape title quote-matched at the Medscape URL — **3 verified / 0 unverifiable** (was 2 + 1). Wired into both `verify-citations --verify-quotes` and the auto-verify-after-merge step in `do-research --merge --verify-quotes`. 7 new BDD tests (mocking both `fetch` and `generateGroundedContent`).
- **Partial lore coverage (`SourceChecker/lore_coverage_partial`).** New warning that fires when a category has ≥3 high-confidence-accurate claims and ≥50% are uncovered by the loreDb. Complements the existing `lore_coverage` (100%-uncovered) check. Both are intentionally NOT promoted to error at any reference level since they're author-side recommendations the LLM can't fix. **Also fixes a latent bug in the existing `lore_coverage` implementation**: the previous code stringified the entire loreDb (keys + values) into a single haystack, so a claim containing the word "references" would trivially match the `references` top-level key and be marked "covered" even when no actual fact applied. Replaced with a recursive `collectLoreValues()` that builds the haystack from values only. 4 new BDD tests; the docstring on `applyReferenceLevel` updated to document the new exemption.
- **Regression fixture (`tests/fixtures/regression/family-history-failed/`).** Captured the state of the historic failed-converge run as a permanent fixture: `prompt.md` (the original Chinese family-history prompt), `best-draft.md` (the ~6.5 KB best-effort draft), `reference-graph.json` (the round-5 extracted graph), and `lore-snapshot.json` (loreDb at the time of capture). New `src/regression.test.ts` replays only the pure `checkReferences` → `applyReferenceLevel(level)` pipeline against the fixture (no LLM calls, hermetic), asserting (a) <5 errors at L4 (currently 2), (b) <8 errors at L5, (c) `lore_coverage` and `lore_coverage_partial` stay warnings at every level. Includes a `README.md` documenting the fixture's purpose and update procedure.
- Tests: **384 pass** (up from 370, +14 from quote-verification + partial-coverage + regression).

### Round 5 — Repoint Dead Model Ids + Auto-Verify After Merge

Three follow-ups that closed gaps surfaced in Round 4.

- **Repoint dead model ids.** Endpoint probing of all candidate Gemini ids on 2026-05-08 confirmed only 2 model ids actually resolve: `gemini-3.1-pro-preview` and `gemini-3.1-flash-lite-preview`. The previous `MODELS.CRITIC` (`gemini-2.5-pro`) and `MODELS.REFINER` (`gemini-2.5-flash`) constants both 404'd, meaning every critic invocation across `logic-critic` / `story-critic` / `character-critic` / `dialogue-critic` / `critic` and every synthesizer iteration was silently failing in production. Repointed `CRITIC` → `gemini-3.1-pro-preview` (same id as `GENERATOR`) and `REFINER` → `gemini-3.1-flash-lite-preview` (same id as `EVALUATOR`). The semantic role separation is preserved at the type level so callsites don't change. Added a docstring to `MODELS` documenting the endpoint reachability snapshot and the rationale for the overlap; updated the stale `auto-research.ts` doc comment.
- **Auto-verify-citations after `do-research --merge`.** Wires the Round 4 `verifyCitations` module into the research → merge loop so the trust gap is closed by default. After `do-research --merge` writes the loreDb, the resulting references namespace is automatically passed through `verifyCitations` and the formatted report is printed. Warning-only — broken/partial refs trigger a yellow warning that the merge is preserved; the operator decides what to do (the merge is NOT rolled back). New `--no-verify` flag opts out (offline mode). New `--generator-model` passthrough means `do-research --merge --continue --generator-model flash` now correctly runs both the research call AND the regenerated draft on flash.
- **History housekeeping.** Added the Round 4 section to `HISTORY.md`; restructured `TODO.md` with per-round Done sections and promoted the latent CRITIC 404 to High Priority before fixing it in this same round.

### Round 4 — Citation Audit & Flash-Model Failover

Round 3 closed the auto-research loop, but exposed a real trust gap: even with Google Search grounding enabled, the LLM can produce **plausible-looking fabrications** — most notably off-by-one PMIDs and entirely made-up journal articles. Round 4 closes that gap with an independent, network-only audit + adds a fallback when the pro-model endpoint is overloaded.

- **Citation audit of the existing family-history loreDb.** Manually verified each of the 3 auto-researched references via grounded LLM lookups + direct URL/PubMed fetches: 1 fully verified (Medscape phonebook trauma URL is HTTP 200), 1 verified-with-corrections (Higher Ed Law Article 40 — replaced 404 MoE URL with verbatim text quoted from npc.gov.cn + correct cadre regulation name), 1 partially verified (Andre F JCO 2004 paper IS real with **PMID corrected from 15310776 to 15310773**; Bhoo-Pathy 2011 Asian breast cancer paper not findable on PubMed and **removed**). All three references now carry `verifiedAt: 2026-05-08`.
- **New `verify-citations` CLI subcommand** (`src/reference/verify-citations.ts`). Independently audits the `references` namespace of a loreDb without involving an LLM. Per reference: extracts every URL → HEAD-checks each (`live`/`dead`/`error`); extracts every PMID → queries the PubMed eutils esummary API → compares the actual paper title to the cited source via a lenient content-word overlap heuristic (≥2 shared 5+ char words, stopwords filtered, so titles match across punctuation/word-order differences). Classifies each reference as `verified` / `partial` / `broken` / `unverifiable`. Exits non-zero on any `broken` so it can be used as a CI gate. Hermetic by design: all network I/O goes through global `fetch`, which the test suite stubs.
- **New `--generator-model {pro|flash|<raw>}` flag for `generate`.** The `gemini-3.1-pro-preview` deployment that backs `MODELS.GENERATOR` has been hitting `PREFILL_QUEUE_OVERLOADED` 503s during peak hours, blocking long-form generation entirely. The new flag routes draft / rewrite / patch through the smaller `MODELS.EVALUATOR` (`gemini-3.1-flash-lite-preview`) which has different capacity. Plumbed through `RunnerOptions.generatorModel` to all 3 LLM call sites in `RejectionSamplingRunner` (initial draft, rewrite, patch); flows to `MultiSectionRunner` via inheritance. When overridden, the resolved model id is logged. `bun run src/cli/index.ts generate <prompt> --generator-model flash` worked end-to-end where the pro endpoint had failed three consecutive attempts.
- **Surfaced latent bug: dead model constants.** Endpoint probing of all candidate Gemini ids confirms only 2 model ids resolve on this environment: `gemini-3.1-pro-preview` and `gemini-3.1-flash-lite-preview`. The `MODELS.CRITIC` (`gemini-2.5-pro`) and `MODELS.REFINER` (`gemini-2.5-flash`) constants both 404, meaning every critic invocation (`logic-critic`, `story-critic`, `critic`, `character-critic`, `dialogue-critic`) and every synthesizer iteration would silently fail. Tracked as a follow-up cleanup.
- 9 new TDD tests for `verifyCitations` (mocked `fetch`): live URL → verified, dead URL → broken, mixed → partial, PMID match, PMID mismatch (cited title vs actual title), PMID not_found, no-citations-at-all → unverifiable, multi-reference summary aggregation, no-references-namespace edge case.
- Tests: **370 pass** (up from 361, +9 from verify-citations tests).

### Round 3 — Auto-Research Pipeline

Closes the *complete* research loop. Previously you could ask the model what claims it couldn't verify (`needs-research.json`) and you could merge resolved facts back into the loreDb (`resolve-research`), but the actual research work was manual: read each claim, web-search, type the answer in. This release adds the missing middle step.

- **New `do-research` CLI command.** Takes a session directory or a `needs-research.json` file. For each unresolved item, calls the LLM with **Google Search grounding** enabled and asks it to return a strict JSON `ResearchResolution` (accurate / verifiedFact / source / addToLoreDb). Writes a `needs-research-resolved.json` next to the input. Optional `--merge` immediately calls `mergeResolvedIntoLore` to land verified facts in the loreDb (`--lore <path>` selects the target). Optional `--continue` re-launches `generate` on the same prompt with the now-enriched loreDb. Together, `do-research --merge --continue --persona ... --lore ...` runs the entire research → enrich → regenerate loop in one command.
- **New `generateGroundedContent` LLM helper** (`src/llm/index.ts`) wraps the existing `generateContent` retry loop and enables `tools: [{googleSearch: {}}]` in the request. Returns `{text, sources}` where `sources` are extracted from `groundingMetadata.groundingChunks[].web` and surface as resolvable URLs.
- **New `autoResearch` orchestrator** (`src/reference/auto-research.ts`) — pure modulo the LLM. Iterates only unresolved items, builds a per-item prompt that includes the original claim/excerpt/location/model-assessment, parses the LLM's JSON (strips markdown fences, falls back gracefully on parse failure with a stub resolution that won't pollute the loreDb), and appends grounding URLs to the resolution's `source` for provenance. Default model: `GENERATOR` (gemini-3.1-pro-preview) — `CRITIC` is not served by this Gemini API endpoint.
- **CLI now accepts `--lore <path>` for `generate` and `check`** (previously only `resolve-research` honored it). Each prints the chosen path and the loaded loreDb's top-level key count so the operator can verify the corpus.
- **End-to-end smoke test.** Re-ran the previously-failed family-history prompt with `do-research --merge --continue` → all 3 priority items got real research-grade answers (Higher Education Law Article 40 citation; phonebook-trauma forensic-myth correction with Medscape source; Stage III breast-cancer-prognosis stage-confusion correction with JCO 2004 source) → merged 3 facts into `datasets/lore.family-history-cn.json` under the `references` namespace → regenerated the story. The new run produced **zero** `unsourced_critical` warnings and the reference harness was fully satisfied (no `needs-research.json` written) — only narrative-craft issues remained.
- 5 new TDD tests for `autoResearch` (mocked LLM module): populate-all, skip-resolved, malformed-JSON-fallback, grounding-URL-append, code-fence-strip.
- Tests: **361 pass** (up from 356, +5 from auto-research tests).

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
