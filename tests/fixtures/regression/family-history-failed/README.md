# Regression Fixture: family-history failed run

This fixture captures the state of a real generation run that previously
**failed to converge** under L4 reference enforcement, before the Round 2
fixes (TODO #1: stop promoting `lore_coverage` to error; TODO #2: source-aware
logic checkers).

## Files

| File | Description |
| --- | --- |
| `prompt.md` | The original Chinese family-history prompt that triggered the run. |
| `best-draft.md` | The best-effort draft the runner produced before exhausting `--max-retries 5`. ~6.5 KB of substantive Chinese prose. |
| `reference-graph.json` | The extracted reference graph from round 5 (the LLM extractor's structured view of the draft). |
| `lore-snapshot.json` | A snapshot of `datasets/lore.family-history-cn.json` at the time the regression test was committed (so test results are reproducible across loreDb edits). |

## Why this matters

Re-running the full pipeline against the prompt would be costly (multiple LLM
calls) AND non-hermetic. Instead, the integration test (see
`src/regression.test.ts`) loads `reference-graph.json` + `lore-snapshot.json`
directly and replays only the **pure** `checkReferences` →
`applyReferenceLevel(level=4)` pipeline.

The test asserts that the harness produces **fewer than 5 errors** at
reference level 4. Before the Round 2 fixes the same run would emit
`lore_coverage` as an error (unfixable by the LLM) and several
contradiction/non-sequitur false positives, blocking convergence. After the
fixes, the post-fact-merge state should pass the threshold.

## Updating

If you intentionally raise (or fix and lower) the error budget, edit the
threshold in `src/regression.test.ts` directly. Don't regenerate the fixture
unless the underlying graph schema changes — the whole point is that this
captures the historic failure state.
