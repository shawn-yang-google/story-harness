# Regression Fixture: family-history oscillation case

This fixture captures the round-by-round feedback from a real generation
run (`logs/generate-2026-05-08T22-57-33-123Z`) that previously **failed to
converge** after 5 rounds because the patch loop kept reintroducing
violations from prior rounds — the canonical symptom that motivated R8-A
and R8-B.

## Files

| File | Description |
| --- | --- |
| `prompt.md` | The original Chinese family-history prompt that triggered the run. |
| `rounds.json` | The verbatim feedback array from each of the 5 rounds, with inner double quotes replaced by U+201C/U+201D smart quotes so the JSON parses cleanly. The `[Checker/rule]` prefix is preserved verbatim because that's what the OscillationGuard fingerprints on. |

## Why this matters

Before R8-A landed, this session burned 5 rounds and 37 LLM calls without
ever converging. The recurring fingerprints were obvious in hindsight
(`EpistemicChecker/psychic_knowledge` fired in rounds 1 and 5;
`PropositionalChecker/unsupported_conclusion` fired in rounds 2, 3, 4,
and 5; `Cringe Factor` fired in EVERY round) but the runner had no
machinery to surface them.

The regression test in `src/runner/oscillation-regression.test.ts`
replays this feedback through:

1. `OscillationGuard.recordRound()` for each captured round → asserts the
   recurrent fingerprints match the known-bad set, with the right round
   numbers.
2. `classifyFeedback` for every entry → asserts the structural-vs-
   surgical classification picks up the rules R8-B is meant to escalate
   (`cement_block_character`, `indistinct_voices`, `Page-Turner Momentum`,
   `Cringe Factor`, `Who Cares?`).
3. `requiresPremiseStaging` for the recurring `unsupported_conclusion` /
   `non_sequitur` entries → asserts R8-C's gate fires on exactly those
   rules.

This is hermetic: no LLM calls, no network, no harness execution. The
pipeline under test is the pure post-feedback analysis layer, which is
the layer that R8-A/B/C added.

## Update procedure

Re-capture only when the underlying contract changes (e.g. a new
checker is added that needs to appear in the structural set). Run the
real generator against a fresh family-history session, copy the
round-N/feedback.md files, and re-encode them as JSON with smart-quoted
inner quotes. Do NOT update this fixture from a passing session — the
whole point is that this captures the *failure* mode that should never
regress.
