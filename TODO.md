# StoryHarness — TODO

The mechanical citation infrastructure is complete (R1–R6, see `HISTORY.md`).
The R7 real generation runs surfaced **three concrete narrative-craft failures**
that are now the next round of work.

---

## Round 8 — Convergence Failures Surfaced by Real Runs

Two real generation runs against the family-history prompt (sessions
`logs/generate-2026-05-08T22-57-33-123Z` and
`logs/generate-2026-05-08T23-10-24-196Z`) both **failed to converge** after 5
rounds. Analysis identified three distinct failure modes:

### R8-A — Patch oscillation guard (HIGH)

**Symptom:** Patches in round N fix issue X but reintroduce issue Y from round
N-1. The same `(checker, rule)` pair recurs across non-consecutive rounds —
e.g., `EpistemicChecker/psychic_knowledge` fired in rounds 1, 2, 3, AND 5 of
session `22-57-33`. The system "fights itself" instead of converging.

**Concrete data:** In session `22-57-33`, 4 of 5 rounds had at least one
recurring `(checker, rule)` from a prior round. In session `23-10-24` the
看守所 fact was correctly cited then re-broken on a later patch.

**Plan:**

1. Track per-session `seenViolations: Map<string, Set<RoundNum>>` keyed by
   `${checker}/${rule}` (or richer fingerprint including target id when
   available — e.g., character name for `psychic_knowledge`).
2. After each patch is applied, before accepting it, re-run the checker
   that *previously fired the same `(checker, rule, target)` triple* — if it
   re-triggers, **reject the patch** and ask the LLM to rewrite, citing the
   previous round's fix as a constraint.
3. After N (e.g., 3) cumulative re-introductions of the same fingerprint,
   escalate to a **structural rewrite** (see R8-B) rather than another patch.

**Files to touch:** `src/runner/index.ts` (patch loop), maybe a new
`src/runner/oscillation-guard.ts`.

**Tests:** TDD with a fake checker that toggles between two violations on
alternate calls; assert the guard catches the re-introduction.

**Resolution gate:** Re-run the family-history prompt; oscillation count
should drop to 0 across 5 rounds.

### R8-B — Two-tier loop: scene rewrite vs. surgical patch (HIGH)

**Symptom:** Tier-3 narrative-craft critiques (`Page-Turner Momentum`,
`Cringe Factor`, `Who Cares? Test`, `cement_block_character`,
`indistinct_voices`) fired in EVERY round of both sessions. These need
**scene-level rewrites** but the patch loop only does surgical replacements,
which can never satisfy "the whole interrogation scene reads like a soap
opera."

**Concrete data:** Session `23-10-24` round 5 final feedback included
*"Page-Turner Momentum: The narrative jumps through years and major life
events with such rapid, summary-style pacing that it kills any sense of
tension"* — unfixable by token-level replace().

**Plan:**

1. Classify each violation as `surgical` (e.g.,
   `monologue_too_long`, `unsourced_critical`) or `structural` (e.g.,
   `Page-Turner Momentum`, `Who Cares? Test`, `indistinct_voices`).
   Probably a tag in the rule definition.
2. Surgical violations → existing patch loop (unchanged).
3. Structural violations → new outer loop that asks the LLM to **rewrite the
   identified scene/section in full**, with the critique as the guidance.
   Output replaces the scene; existing surgical patches re-run on the new
   content.
4. Cap at e.g. 2 structural rewrites per session (cost gate); after that,
   escalate to human-review (write to a `needs-human-rewrite.md` file).

**Files to touch:** `src/runner/index.ts`, `src/synthesizer/index.ts` (scene
rewrite primitive), rule-definition files for the tag.

**Tests:** TDD with a fake structural critique that returns the same
verdict on the same scene; assert the rewrite path is invoked, not the patch
path.

**Resolution gate:** Re-run the family-history prompt with a persona; the
final draft should NOT contain the same structural critique it did in round 1.

### R8-C — Premise-staging discipline for `non_sequitur` / `unsupported_conclusion` (MEDIUM)

**Symptom:** `PropositionalChecker/unsupported_conclusion` and
`SoundnessChecker/non_sequitur` keep recurring with the same shape: the
model writes "Zhi is innocent" or "The interrogation is a setup" as a flat
assertion in narration, without staging the supporting premise in the prose
first. The patch LLM rewrites the conclusion sentence but doesn't add the
missing premise — so the next round flags the same failure.

**Concrete data:** Across both sessions, 4 of 5 rounds had at least one
`unsupported_conclusion` or `non_sequitur`, and the violations always cited
the same paragraph numbers (paragraph 8 in session `22-57-33`, paragraph 13
in session `23-10-24`).

**Plan:**

1. In the patch-prompt template, add an explicit branch:
   *"If the target violation is `unsupported_conclusion` or `non_sequitur`,
   your replacement MUST satisfy two constraints:
   (a) Add the supporting premise to the prose **before** the conclusion in
   document order. The premise should appear in narration, dialogue, or
   action — not just in your reasoning.
   (b) The patch diff must include both an insertion (the new premise) AND
   a modification (the conclusion now grounded). A single-line edit that
   only changes the conclusion sentence is forbidden."*
2. Validate the patch shape: if a patch claims to address one of these two
   rules but contains only a single-line replacement (no insertion), reject
   it with feedback "missing premise insertion."
3. Optional: extend the propositional graph to track which premises the
   prose has actually staged (parsed from the narrative-graph), and pass
   that explicitly as "do not assert any conclusion whose premise is not in
   this list."

**Files to touch:** `src/runner/patch-prompt.ts` (or wherever the patch
template lives), `src/logic/propositional-checker.ts` (validation hook).

**Tests:** TDD with a fixture that has an `unsupported_conclusion`
violation; assert that a single-line-replacement patch is rejected, and a
two-edit patch (insertion + modification) is accepted.

**Resolution gate:** Re-run the family-history prompt; recurrence rate of
`unsupported_conclusion` / `non_sequitur` across rounds should drop from
~80% to <20%.

---

## Open (deferred — not blocking R8)

### Q1 — Does the L4/L5 evaluator under-flag rubber-stamp drafts?

The R7 runs showed the evaluator is **not** under-flagging — if anything,
it's flagging too aggressively (5 rounds couldn't satisfy the bar). Reassess
after R8 lands and we have a converging baseline.

### Q2 — Does `lore_coverage_partial` (≥3 claims, ≥50%) match author intuition?

R7 runs didn't fire `lore_coverage_partial` (loreDb has only 4 refs total).
Need a larger loreDb to test the heuristic.

### Q3 — Capture R7 failed sessions as regression fixtures

After R8-A and R8-B land, save sessions `22-57-33` and `23-10-24` under
`tests/fixtures/regression/` so we have permanent oscillation + structural
regression anchors. Don't capture them now — the fixtures should reflect
the post-fix expected outcome, not the pre-fix failure.

---

## Done

See `HISTORY.md` for the full chronological log of completed rounds (R1–R6)
and the R7 empirical-discovery rounds.
