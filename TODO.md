# StoryHarness — TODO

The mechanical infrastructure is complete (R1–R6, see `HISTORY.md`).
The remaining work is **empirical** — driven by signal from real generation
runs, not speculative engineering.

---

## Open

### Q1 — Does the L4/L5 evaluator under-flag rubber-stamp drafts?

The L4/L5 prompts enforce hard quotas with few-shot examples. If real runs
show the EVALUATOR rubber-stamps drafts (e.g., `confidence:high` ratio
exceeds the quota too often, or obvious issues slip through), the next move
is one of:

- Upgrade `MODELS.EVALUATOR` from `gemini-3.1-flash-lite-preview` to
  `gemini-3.1-pro-preview` in `src/llm/index.ts`.
- Add a **verification pass** that rejects evaluator outputs whose
  high-confidence ratio exceeds the quota and forces a re-evaluation.

**Resolution gate:** wait for ≥3 real runs and compare evaluator output to
human judgment before deciding.

### Q2 — Does `lore_coverage_partial` (≥3 claims, ≥50%) match author intuition?

The threshold was picked theoretically. Real authors may want different
defaults (≥30% for strict authors, ≥70% for lenient). Tune after seeing
what the warning surfaces on real loreDbs.

**Resolution gate:** review the warning's signal-to-noise on the next
loreDb that's larger than the family-history one.

### Q3 — What failure modes does the regression fixture not capture?

`tests/fixtures/regression/family-history-failed/` captures one historic
failed-converge case. New fixtures should be added when:

- A future real run fails to converge in a novel way.
- A bug fix needs a permanent regression anchor.

**Resolution gate:** add fixtures opportunistically as they appear.

---

## Done

See `HISTORY.md` for the full chronological log of completed rounds (R1–R6).
