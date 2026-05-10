# StoryHarness — TODO

R1–R6 (mechanical citation infrastructure), R8-A / R8-B / R8-C
(convergence-failure machinery), and R9 (empirical validation of R8 via
3 real LLM runs + 3 LLM-judge audits) have all landed. See `HISTORY.md`
for the full chronological log.

---

## Round 10 — Carry-overs from R9 empirical runs

R8 fired flawlessly in production but two findings stand out:
`psychic_knowledge` recurrence=4 across both Q1 sessions (R8-A's
warning block isn't strong enough), and 0/3 sessions converged (the
cap moves the failure mode but doesn't raise the convergence bar).

### R10-A — Epistemic source-staging gate (HIGH)

**Symptom:** `EpistemicChecker/psychic_knowledge` recurred in EVERY
round (1-2-3-4-5) of both Q1 sessions despite R8-A's oscillation
warning. The model keeps writing "Ying knows Zhi is innocent" /
"Anonymous callers know children's school routes" without staging the
how-she-knows in the prose.

**Plan:** mirror R8-C's premise-staging gate but for the epistemic
shape. Add `EpistemicChecker/psychic_knowledge` to a new
`KNOWLEDGE_SOURCE_STAGING_RULES` set (or extend `PREMISE_STAGING_RULES`
if the validation logic is identical). Augment the patch prompt with
"the patch MUST add a sentence/paragraph showing HOW the agent learned
the information (overheard conversation, document, witness, deduction
from prior scene…) before rewriting the knowledge claim." Validate the
patch shape via the same 1.5×-or-multi-diff rule as R8-C.

**Files to touch:** `src/runner/premise-staging.ts` (extend or
sibling-module), `src/runner/index.ts` (wire the new gate next to the
existing premise gate). One new unit-test file plus one integration
test extending the existing R8-C scaffolding.

### R10-B — Distinguish cap-failure from convergence-failure in the runner UX (MEDIUM)

**Symptom:** When `STRUCTURAL_REWRITE_CAP` was hit, the runner still
threw `Failed to generate a valid scene after N rounds.` — losing the
signal that `needs-human-rewrite.md` exists and tells the user
exactly what's blocking convergence.

**Plan:** when `structuralRewriteCount === STRUCTURAL_REWRITE_CAP` AND
the cap was hit during the most recent round, throw a distinct
`StructuralCapReachedError` (or pass a `reason` field through to the
CLI) and surface the `needs-human-rewrite.md` path in the error
message. CLI exit code stays non-zero but is distinct from
unrecoverable failure.

**Files to touch:** `src/runner/index.ts` (the throw), `src/cli/index.ts`
(the catch + nicer message). Unit test that mocks the runner to throw
the new error and asserts the CLI prints the right path.

### R10-C — Should `PARTIAL_MIN_CLAIMS` drop from 3 to 2? (MEDIUM)

**Finding from R9:** the `lore_coverage_partial` heuristic never fired
in any of the 3 R9 sessions because the reference-graph extractor
produced fewer than 3 claims per category in every category for every
draft. The threshold isn't broken — but at the current density, it's
a no-op.

**Plan:** A/B-test the threshold. Run the same Q2-style prompt twice,
once with `PARTIAL_MIN_CLAIMS=3` (current) and once with `=2`. Inspect
which fires more authentically against author intuition. Decision
criterion: if `=2` fires on real coverage gaps without false-positives
on dense drafts, lower the constant. Otherwise keep `=3` and document
the constraint that the heuristic only triggers on long, fact-dense
drafts.

**Files to touch:** `src/reference/source-checker.ts` (the constant),
`src/reference/source-checker.test.ts` (extra coverage). No new
production-test runs needed — can be answered from the R9 reference-
graphs alone (rerun source-checker in-memory at threshold=2 against
the existing graph fixtures and inspect output).
