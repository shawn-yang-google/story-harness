# StoryHarness — TODO

R1–R6 (mechanical citation infrastructure) and R8-A / R8-B / R8-C
(convergence failures surfaced by real R7 generation runs) have all
landed — see `HISTORY.md` for the full chronological log.

---

## Open (empirical — needs real LLM runs to answer)

### Q1 — Does the L4/L5 evaluator under-flag rubber-stamp drafts?

The R7 runs showed the evaluator is **not** under-flagging — if anything,
it's flagging too aggressively (5 rounds couldn't satisfy the bar). The
R8 oscillation guard + structural-rewrite cap should now let convergence
succeed; once we have a passing baseline, re-examine whether the
evaluator is too lenient OR too strict.

**Resolution gate:** run the family-history prompt end-to-end after R8 and
inspect: (a) does it converge within 5 rounds? (b) is the accepted draft
genuinely good, or did the evaluator rubber-stamp a weak draft?

### Q2 — Does `lore_coverage_partial` (≥3 claims, ≥50%) match author intuition?

R7 runs didn't fire `lore_coverage_partial` (loreDb has only 4 refs total).
Need a larger loreDb to test the heuristic. Defer until we have a multi-
domain test loreDb (e.g. medical + legal + historical refs in one set).
