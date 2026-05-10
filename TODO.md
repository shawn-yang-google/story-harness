# StoryHarness — TODO

R1–R6 (mechanical citation infrastructure), R8-A / R8-B / R8-C
(convergence-failure machinery), and R9 (empirical validation of R8 via
3 real LLM runs + 3 LLM-judge audits) have all landed. See `HISTORY.md`
for the full chronological log.

---

## Round 10 — Status

- [DONE] R10-A — knowledge-source staging gate for `psychic_knowledge`. See HISTORY.md.
- [DONE] R10-C — analytically resolved with no code change. The threshold isn't the bottleneck; upstream verifier grading is. Surfaces R11. See HISTORY.md.
- [TODO] R10-B — distinguish cap-failure from convergence-failure in the runner UX (still pending).

### R10-B — Distinguish cap-failure from convergence-failure in the runner UX (MEDIUM)

**Symptom:** When `STRUCTURAL_REWRITE_CAP` was hit, the runner still
threw `Failed to generate a valid scene after N rounds.` — losing the
signal that `needs-human-rewrite.md` exists and tells the user
exactly what's blocking convergence. R10-A added a second gate
(`knowledgeSourceRejections`) whose telemetry deserves the same
surfacing.

**Plan:** when `structuralRewriteCount === STRUCTURAL_REWRITE_CAP` AND
the cap was hit during the most recent round, throw a distinct
`StructuralCapReachedError` (or pass a `reason` field through to the
CLI) and surface both `needs-human-rewrite.md` AND the staging-gate
counters (`premiseRejections`, `knowledgeSourceRejections`) in the
error message. CLI exit code stays non-zero but is distinct from
unrecoverable failure.

**Files to touch:** `src/runner/index.ts` (the throw), `src/cli/index.ts`
(the catch + nicer message). Unit test that mocks the runner to throw
the new error and asserts the CLI prints the right path.

---

## Round 11 — Upstream verifier grading policy (NEW, surfaced by R10-C)

**Finding from R10-C:** the `lore_coverage_partial` heuristic never
fires not because its thresholds are wrong, but because the upstream
LLM verifier marks almost every claim that the loreDb covers as
`(verdict: accurate, confidence: high)`. The per-category tallies
across all 13 R9 rounds were `total === covered` in every case where
the category had any coverage at all. The `>=50% uncovered` predicate
filters these out long before the `>=N claims` minimum matters.

**Two candidate actions, neither obvious yet — investigate first.**

1. **Audit the verifier's verdict distribution.** Reuse
   `scripts/r10c-analyze.ts` as a starting point: scan every
   reference-graph in `logs/generate-*` and produce a histogram of
   `(verdict, confidence)` pairs across categories. If `accurate-high`
   is overrepresented (e.g. >90% of all claims), the verifier
   prompt is being too lenient.
2. **Broaden `lore_coverage_partial`'s tally to include lower-confidence
   claims.** If the verifier is honest but cautious, the right fix is
   to count `(accurate, medium)` and `(partially_accurate, *)` claims
   in the partial-coverage tally too. This is a one-line change in
   `src/reference/source-checker.ts` plus a test.

**Files to touch:** `scripts/r11-verdict-audit.ts` (new investigation
script — same shape as `r10c-analyze.ts`); possibly
`src/reference/source-checker.ts` (broaden the tally). Decide based
on the audit output, not in advance.
