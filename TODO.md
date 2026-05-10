# StoryHarness — TODO

R1–R6 (mechanical citation infrastructure), R8-A / R8-B / R8-C
(convergence-failure machinery), and R9 (empirical validation of R8 via
3 real LLM runs + 3 LLM-judge audits) have all landed. See `HISTORY.md`
for the full chronological log.

---

## Round 10 — CLOSED

All three R9 carry-overs resolved. See HISTORY.md.

- [DONE] R10-A — knowledge-source staging gate for `psychic_knowledge`.
- [DONE] R10-B — typed `StructuralCapReachedError` + CLI branching.
- [DONE] R10-C — analytically resolved with no code change. The threshold isn't the bottleneck; upstream verifier grading is. Surfaces R11.

---

## Round 11 — CLOSED

Verifier verdict-distribution audit completed across 296 sessions /
617 reference-graphs / 395 claims. R10-C's hypothesis is partially
confirmed (80.5% `(accurate, high)`) but no code change is warranted —
the verifier is doing its job, and the heuristic is just narrowly
applicable to science-heavy drafts that we don't currently run.
See HISTORY.md for full data and rationale.

Reusable artifacts: `scripts/r11-verdict-audit.ts`,
`scripts/r11-per-category.ts`. Re-run them after any major
verifier-prompt change to detect distribution drift.
