# StoryHarness — Change History

A chronological log of substantive feature additions and architectural changes. Each entry summarizes what changed, why, and where the relevant code lives.

---

## Unreleased

### Round 11 — Verifier Verdict-Distribution Audit

R10-C left a hypothesis open: the upstream LLM verifier might be
overproducing `(accurate, high)` verdicts, starving the
`lore_coverage_partial` heuristic. R11 tests that hypothesis at scale
across the entire historic log corpus rather than the 3-session
R10-C sample, then decides whether to broaden the heuristic's tally.

**Audit corpus.** `scripts/r11-verdict-audit.ts` and
`scripts/r11-per-category.ts` together scan 296 sessions / 617
reference-graphs / 395 total claims. No LLM calls; pure data analysis
on existing fixtures.

**Grand histogram (verdict × confidence):**

| verdict             | high   | medium | low    | unverif | other  | total  |
|---------------------|--------|--------|--------|---------|--------|--------|
| accurate            | 80.5%  |  4.3%  |  0.0%  |  0.0%   |  1.0%  | 85.8%  |
| inaccurate          |  2.8%  |  0.0%  |  0.0%  |  0.0%   |  0.8%  |  3.5%  |
| partially_accurate  |  1.3%  |  3.0%  |  0.0%  |  0.0%   |  0.3%  |  4.6%  |
| needs_research      |  0.0%  |  5.3%  |  0.8%  |  0.0%   |  0.0%  |  6.1%  |

**R10-C's hypothesis is PARTIALLY confirmed.** `(accurate, high)`
accounts for 80.5% of claims — high but not the 100% R10-C's tiny
sample suggested. Critically, **zero of the 18 sessions with
≥5 claims hit 100%** `(accurate, high)`. The verifier IS biased,
but it's not stuck.

**Outlier evidence — the verifier CAN distinguish.** Session
`generate-2026-05-08T23-10-24-196Z` is only 19% `(accurate, high)`
because 8 of its 21 claims are `(inaccurate, high)` — confidently
flagged errors. So the verifier doesn't just default to
"accurate-high"; it confidently flags real errors when they exist.
The 80.5% rate reflects "drafts mostly contain things the verifier
can verify and the loreDb covers", not "verifier is broken".

**Per-category breakdown is where the action is.** Different
categories have very different verdict diversity:

| category   | total | acc-hi | acc-med | part-acc | inacc-hi | needs-res |
|------------|-------|--------|---------|----------|----------|-----------|
| historical |   166 |  80%   |   3%    |    3%    |    4%    |    10%    |
| cultural   |   137 |  90%   |   2%    |    3%    |    0%    |     3%    |
| scientific |    79 |  65%   |  11%    |    9%    |    6%    |     5%    |
| geographic |     8 | 100%   |   0%    |    0%    |    0%    |     0%    |
| linguistic |     5 |  60%   |   0%    |   20%    |    0%    |     0%    |

`scientific` is the only category with meaningful verdict diversity
(35% non-acc-hi). If `lore_coverage_partial` ever needs to fire, it
would be there. `historical` and `cultural` are 80–90%
acc-hi; `geographic` is 100% but n=8 is too small to be conclusive.

**Production firings of `lore_coverage_partial` across 296 sessions:
ZERO.** The heuristic has never actually fired in any historic
session.

**Decision: no code change.** Three reasons:

1. The 80.5% rate isn't a bug — it reflects accurate verification
   of factually-correct drafts. Broadening the tally to include
   `(accurate, medium)` and `(partially_accurate, *)` would mix
   coverage semantics with confidence semantics. A
   `partially_accurate` claim is qualitatively different from an
   "uncovered" claim and shouldn't be equated.
2. The empirical impact would be modest: broadening adds only
   +34 claims (+10.7%) to the global tally, concentrated in the
   `scientific` category. Most of our actual prompts don't produce
   science-heavy drafts where this would matter.
3. The heuristic is dead-code-ish today (zero firings in 296
   sessions), but it's not WRONG — it's just narrowly applicable.
   When somebody starts running science-heavy prompts in volume,
   it'll start firing. Until then, leaving it as-is is correct.

**Artifacts.**

- `scripts/r11-verdict-audit.ts` — the grand-histogram pass.
  Reusable; takes `[logs-dir]` arg defaulting to `logs`.
- `scripts/r11-per-category.ts` — the per-category breakdown.
  Reusable; same signature.
- Audit outputs saved to `~/.gemini/tmp/storyharness/r11-audit-output.txt`
  and `r11-per-category-output.txt` for posterity.

**Round 11 closed.** No follow-up TODO surfaced. The R11 finding is
the answer.

### Round 10 — Knowledge-Source Staging Gate + PARTIAL_MIN_CLAIMS Resolution

R9's empirical validation surfaced three carry-overs (R10-A/B/C in
TODO.md). R10 closes two of them; R10-B is deferred.

**R10-C resolved analytically — no code change.** The `lore_coverage_partial`
heuristic uses two thresholds: `PARTIAL_MIN_CLAIMS=3` (minimum claims per
category) and `PARTIAL_THRESHOLD=0.5` (minimum uncovered fraction). The
hypothesis was that lowering `PARTIAL_MIN_CLAIMS` to 2 might let the
heuristic fire on shorter drafts. I wrote `scripts/r10c-analyze.ts` to
replay `checkLoreCoverage` against every reference-graph in the three
R9 sessions at both thresholds. The result was decisive: **at threshold=2,
the heuristic fires zero times — the same as at threshold=3.** Why?
Because the upstream LLM verifier marks almost every claim that the
loreDb covers as `(verdict: accurate, confidence: high)`. The per-category
tallies look like `{cultural: total=4, covered=4}` and `{historical:
total=6, covered=6}` — categories with 100% coverage. The
`>=50% uncovered` predicate filters everything out long before the
`>=N claims` threshold matters. The threshold is not the bottleneck;
the upstream verifier's "if I can find any source, mark it accurate-high"
grading policy is. Action: keep `PARTIAL_MIN_CLAIMS=3` as-is, document
the upstream constraint as a new TODO (R11), commit the analyzer script
for future re-runs.

**R10-A landed — knowledge-source staging gate.** R9 showed
`EpistemicChecker/psychic_knowledge` recurring in EVERY round (1-2-3-4-5)
of both Q1 sessions despite R8-A's oscillation warning. R8-A makes the
recurrence visible; it does not stop the model from reintroducing it.
R10-A adds an R8-C-style hard gate, mirroring the premise-staging design:

- `src/runner/knowledge-source-staging.ts` — exports
  `KNOWLEDGE_SOURCE_STAGING_RULES`, `requiresKnowledgeSourceStaging`,
  `validateKnowledgeSourcePatch`, and `buildKnowledgeSourceStagingInstruction`.
  Same patch-shape rules as R8-C: ≥2 diffs OR a single diff where
  `revLen >= origLen * 1.5`. Same 1.5× empirical threshold so the two
  gates behave identically — the only thing that differs is the
  augmentation wording (which talks about "knowledge source: overheard
  conversation, document, witness, deduction" instead of "premise +
  conclusion").
- `src/runner/knowledge-source-staging.test.ts` — 12 unit tests
  mirroring `premise-staging.test.ts`, plus explicit assertions that
  the two gates' rule-sets are disjoint (the R8-C `requires*` returns
  `false` for psychic_knowledge and vice versa, so the runner's
  if/else-if branch never double-augments a prompt).
- `src/runner/index.ts` — wired in next to R8-C: imports added,
  `knowledgeSourceRejections` counter declared next to
  `premiseRejections`, augmentation block added next to
  `premiseBlock` (both are empty-string-as-no-op so concatenating both
  is safe), and an `else if (requiresKnowledgeSourceStaging(issue))`
  branch added in the validation block. Telemetry: the new counter is
  surfaced in the failed-converge `status.json` write next to
  `premiseRejections`.
- `src/runner/r10a-integration.test.ts` — end-to-end test mirroring
  the R8-C scenario in `r8b-r8c-integration.test.ts`. A fake harness
  fires `psychic_knowledge` whenever the draft contains
  `PSYCHIC_KNOWLEDGE_MARKER`; the patch LLM only ever returns
  single-line in-place rewrites; the test asserts (a) the augmentation
  block reaches the LLM call, (b) `knowledgeSourceRejections >= 1` in
  status.json, (c) `premiseRejections === 0` (no double-counting),
  (d) the marker survives into `best-draft.md` (the gate prevented
  every patch from mutating the draft).

**Test count:** unit tests +12, integration tests +1, no regressions
in the 421 pre-existing tests.

**R10-B landed — typed StructuralCapReachedError.** The runner had
two indistinguishable failure modes: (a) the patch loop ran out of
rounds while still flagging surgical-only issues, or (b) the
`STRUCTURAL_REWRITE_CAP` was exhausted and `needs-human-rewrite.md`
was emitted. Both threw the same generic
`Failed to generate a valid scene after N rounds.` error, so the CLI
could not point the operator at the file the runner just wrote.
R10-B closes the gap:

- `src/runner/errors.ts` — new `StructuralCapReachedError extends Error`
  carrying the operator-actionable context: `sessionDir`,
  `needsHumanRewritePath`, `structuralRewriteCount`,
  `structuralRewriteCap`, `premiseRejections`,
  `knowledgeSourceRejections`, `rounds`. Its `.message` includes both
  the cap counter (`"2/2"`) and the path so log-only sinks also get
  the actionable signal.
- `src/runner/errors.test.ts` — 4 unit tests for instantiation,
  Error-subclass shape, message formatting, and instanceof
  distinguishability vs plain Error.
- `src/runner/index.ts` — tracks `needsHumanRewritePath` (set on the
  first cap-branch write, null otherwise). At the failed-converge
  throw site, branches: if `needsHumanRewritePath !== null`, throw
  the typed error; otherwise throw the original generic message
  unchanged. This means R10-B is fully backward-compatible — every
  existing catcher that does `catch (e: any) { console.error(e.message) }`
  still works; new catchers can use `instanceof StructuralCapReachedError`
  for the richer path.
- `src/cli/index.ts` — single-shot generate catch now branches on
  `instanceof StructuralCapReachedError` and prints a multi-line
  message that names the cap counter, points at
  `needs-human-rewrite.md`, surfaces the session log dir, and (when
  non-zero) shows the staging-gate refusal counts. The multi-section
  catch was deliberately left as-is — its existing `err.message`
  printout already gets the actionable signal because
  `StructuralCapReachedError.message` includes the path.
- `src/runner/r8b-r8c-integration.test.ts` — extended the existing
  R8-B cap test to also assert (a) the runner throws
  `StructuralCapReachedError`, (b) the typed fields populate
  correctly, (c) the `needsHumanRewritePath` from the typed error
  matches the file path on disk, and (d) `err.message` contains
  `"needs-human-rewrite.md"`.

**Round 10 closed.** All three carry-overs from R9 are now resolved:
R10-A (knowledge-source-staging gate), R10-B (typed cap error), and
R10-C (analytically — keep `PARTIAL_MIN_CLAIMS=3`, surfaced R11).

**New TODO surfaced — R11: upstream verifier grading policy.** R10-C's
finding suggests a new investigation: the verifier produces almost
exclusively `(accurate, high)` verdicts, which makes the partial-coverage
heuristic structurally unreachable for the categories where the loreDb
provides ANY support. Two possible actions in R11: (a) audit the verifier's
verdict-distribution to confirm this pattern across more datasets; (b)
make the partial-coverage heuristic also tally `(accurate, medium)` and
`(partially_accurate, *)` claims so it sees more data.

### Round 9 — Empirical Validation of R8 (Q1 + Q2 LLM Experiments)

After R8-A/B/C landed, Q1 (does the L4/L5 evaluator under-flag rubber-
stamp drafts?) and Q2 (does the `lore_coverage_partial` heuristic match
author intuition?) were still open because both required real LLM
generations to answer. R9 ran those experiments and produced their
answers.

**Experimental setup.** Three end-to-end `bun run src/cli/index.ts
generate` runs against the real Gemini API:

1. **Q1 persona** — family-history prompt + persona
   `personas/人物传记作家-写家史.json` + lore.family-history-cn.json,
   max-retries 5 → session `generate-2026-05-10T04-25-31-969Z`.
2. **Q1 bare** — same prompt + same loreDb but no persona, max-retries 5
   → session `generate-2026-05-10T04-26-05-132Z`.
3. **Q2 multi-domain** — new 1000-word vignette prompt grounded in
   2003 Beijing + new `datasets/lore.q2-multi-domain.json` (15 entries
   across history/science/culture, all real and citable), max-retries 3
   → session `generate-2026-05-10T04-27-43-656Z`.

Each session's `best-draft.md` was then audited by the EVALUATOR model
through `scripts/q1-judge.ts` against a 5-axis rubric (logic, character
depth, dramatic tension, subtext/voice, cringe-factor inverted). The
rubric prompt lives in `q1-judge-prompt.md` (in the project temp dir
under `q1-q2-experiment/`).

**Q1 finding — the L4/L5 evaluator is NOT rubber-stamping.** All three
sessions failed-converge after their max-retries, i.e. the evaluator
correctly never accepted a draft. The LLM judge audited the
`best-draft.md` (the runner's last attempt) and returned
`evaluator_under_flagged: "Yes"` for every session — but this is a
nomenclature mismatch with the question. The evaluator did NOT accept
those drafts; the runner emits `best-draft.md` regardless of acceptance.
The judge's verdict tells us the *best-draft is unpublishable*, which
matches what the evaluator already concluded by refusing to converge.
Net answer: **the evaluator is currently doing its job for prompts of
this difficulty — it's not under-flagging, if anything it's failing in
the other direction (failing-to-converge on prompts that may be too hard
for the model to satisfy at all).**

**R8 telemetry working flawlessly in production.** Every R8 mechanism
fired in the actual sessions:

- `EpistemicChecker/psychic_knowledge` recurrence=4 in BOTH Q1 sessions
  (rounds 1-2-3-4-5), exactly the pattern that motivated R8-A. Every
  recurrence post-round-1 saw the oscillation-warning block injected
  into its patch prompt.
- `structuralRewriteCount=2` (the cap) hit in all three sessions, with
  `needs-human-rewrite.md` correctly emitted in each session dir.
- Q2 hit the R8-A→R8-B escalation chain: `⇪ Escalated to structural
  after recurring as surgical: PropositionalChecker/unsupported_conclusion`
  fired in round 2, then bumped into the rewrite cap.
- Q2's `premiseRejections=2`: R8-C correctly refused two single-line
  conclusion-only patches against `non_sequitur` violations.
- Bare-run round 5 escalation log shows four fingerprints promoted
  in one round: `unsupported_conclusion, psychic_knowledge ×2,
  cross_reference_conflict` — the system saw the full fan-out it was
  designed for.

**Q2 finding — `lore_coverage_partial` heuristic is structurally
correct but rarely triggers.** The thresholds (`PARTIAL_MIN_CLAIMS=3`,
`PARTIAL_THRESHOLD=0.5`) are sound in principle, but the upstream
reference-graph extraction in our prompts is sparse: Q2 round 3's
reference-graph had only 6 claims total (2 historical, 0 scientific, 1
cultural) across the entire 1000-word draft. None of the categories
crossed the `>=3` threshold, so the heuristic correctly did not fire.
The non-partial `lore_coverage` (no minimum) DID fire in the Q1 bare
run for the `cultural` category. Practical implication: either (a)
lower `PARTIAL_MIN_CLAIMS` to 2 if author intuition expects coverage
warnings on shorter drafts, or (b) accept that the heuristic only
triggers on novel-length, fact-dense drafts where the reference-graph
extractor finds 3+ claims per category. The heuristic is not broken;
it's gated by extraction density.

**Artifacts.**

- `datasets/lore.q2-multi-domain.json` — 15-entry verifiable loreDb
  spanning history/science/culture. Reusable as a test fixture for
  any future multi-domain experiment.
- `scripts/q1-judge.ts` — generic LLM-judge runner that takes
  `<session_dir> <prompt_file>` and emits the JSON verdict.
- Judge results live in the project temp dir
  (`~/.gemini/tmp/storyharness/q1-q2-experiment/`); the three session
  dirs (`logs/generate-2026-05-10T04-25-31-969Z`, `04-26-05-132Z`,
  `04-27-43-656Z`) contain the full rounds, status.json telemetry,
  and `needs-human-rewrite.md` files.

**Carry-overs / new questions surfaced.**

1. **Two recurring fingerprints survive R8 and need a follow-up.**
   `EpistemicChecker/psychic_knowledge` recurrence=4 means R8-A's
   warning block isn't strong enough to stop the model from
   reintroducing this rule. Consider adding it to either
   `PREMISE_STAGING_RULES` (if the same staging discipline applies)
   or a new "epistemic source-staging" rule with its own gate.
2. **`needs-human-rewrite.md` is emitted but the runner still fails
   loudly.** The cap is doing its job (no more wasted rewrites), but
   the user-facing UX is "Generation failed" + an exception. A future
   iteration could exit with a different status code when the cap
   was hit (vs. genuine convergence failure), and surface the
   `needs-human-rewrite.md` path in the error message.
3. **Convergence under R8 is still hard.** 0/3 of the runs converged.
   That isn't a regression (R7 was 0/2 at 5 rounds), but it suggests
   R8 didn't move the convergence rate up — it moved the *failure
   mode* from oscillation-driven failure to capped-rewrite failure.
   Both are cheaper than the pre-R8 baseline (R8-B's cap saves
   N-2 rewrites' worth of LLM calls when N rounds would have
   re-rewritten otherwise), but the fundamental quality bar is still
   beyond the model on these prompts.

These are added to TODO.md.

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
