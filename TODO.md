# StoryHarness — TODO

Open follow-up work, ordered roughly by priority.

---

## High Priority

### 1. `lore_coverage` is an unactionable error at level 4-5

**Problem:** When `loreDb` is empty (the default), `SourceChecker/lore_coverage` fires every round saying "LoreDb has no entries for categories: historical, scientific, cultural." At reference level 4+, this is promoted to **error** severity — but the LLM generator can't fix an empty `loreDb`. This creates an unresolvable gate that blocks all drafts.

**Observed in:** `output/story-2026-05-04T23-42-22.md` — all 5 sections failed after 5 rounds.

**Possible fixes (pick one):**
- (a) Remove `lore_coverage` from the level 4-5 promotion list in `applyReferenceLevel`. It's an author-side task, not a generator-fixable issue.
- (b) Suppress `lore_coverage` entirely when `loreDb` is empty (it's redundant — of course it's empty).
- (c) Downgrade it to a one-time informational note that doesn't repeat per round.

**Files:** `src/reference/reference-checker.ts`, possibly `src/reference/source-checker.ts`.

### 2. Logic checkers over-flag legitimate plot devices

**Problem:** Stories about wrongful conviction, unreliable narrators, or contested truth get blocked by `PropositionalChecker/contradiction` ("智 was innocent" vs "智 was guilty"). The contradiction is the *plot*, not a bug. Similarly, `CausalChecker/necessary_precondition_missing` fires on "physical trauma causes lasting impairment" — common-sense physics that shouldn't need to be re-evidenced inline.

**Possible approaches:**
- Make checkers persona-aware (e.g., genres like `legal-drama`, `mystery`, `thriller` should tolerate contested truth).
- Add an "unreliable narrator" / "contested claim" flag in the LogicGraph that suppresses contradiction warnings between conflicting source attributions.
- Distinguish `narrative` source claims (in-story) from `narrator` claims (authorial). A character saying X and a record saying ¬X is a plot device, not a contradiction.

**Files:** `src/logic/propositional-checker.ts`, `src/logic/causal-checker.ts`, `src/types/logic-graph.ts`.

---

## Medium Priority

### 3. LLM still rubber-stamps at level 4

**Observed:** Level 4 prompt explicitly says "challenge high confidence verdicts" but the LLM still produced 4/4 claims as `verdict: accurate, confidence: high` with `needs_research: 0` in the test run from `logs/generate-2026-05-04T23-27-41-426Z`.

**Investigation needed:** Is the level 4 prompt actually reaching the LLM? Run `buildReferenceExtractionPrompt(draft, { personaConfig: { referenceLevel: 4 }})` and inspect the output. May need stronger prompt language (few-shot examples of "downgraded" verdicts) or a model upgrade for the EVALUATOR (currently flash-lite).

**Files:** `src/reference/reference-level.ts`, `src/reference/extraction-prompt.ts`, possibly `src/llm/index.ts` (model selection).

### 4. Build a starter `loreDb` for the family-history persona

**Why:** The user is writing a Chinese family history (1990s-2000s). A loreDb seeded with verified facts about that era (PRC criminal procedure, university funding reform, common medical treatments, dial-up internet adoption) would dramatically reduce `unsourced_critical` and `lore_coverage` errors.

**Suggested seed entries:**
- PRC Criminal Law Article 397 (玩忽职守 / dereliction of duty)
- Chinese university financial reforms of the late 1990s
- Standard SLE (红斑狼疮) treatment protocols
- Dial-up internet adoption timeline in China (1995-2003)
- 双规 / Shuanggui detention practices

**Files:** `datasets/lore.json`.

### 5. Resolve-research workflow

**Why:** `needs-research.json` is generated, but there's no workflow to merge resolved research back into `loreDb`. The `parseResolvedNeedsResearch` function exists in `src/reference/needs-research.ts` (line 240) but isn't wired to a CLI command.

**Add:** `bun run src/cli/index.ts resolve-research <session-dir>` that reads the resolved file and appends verified facts to `datasets/lore.json`.

**Files:** `src/cli/index.ts`, `src/reference/needs-research.ts`.

---

## Low Priority

### 6. Test extraction prompt at each level

Add an integration test that runs `buildReferenceExtractionPrompt` at each level and asserts:
- Level 1 prompt mentions "SCAN" and skipping niche categories
- Level 4 prompt includes the `enrichmentSuggestions` JSON schema
- Level 5 prompt includes the `researchQuestions` JSON schema

**Files:** `src/reference/extraction-prompt.test.ts` (new).

### 7. Document the level-1 skipCategories behavior

`getReferenceLevelConfig(1).skipCategories` returns `["linguistic", "cultural"]`, but this is currently **only documentation**. The extraction prompt doesn't actually omit these categories from its JSON schema. Either:
- (a) Wire `skipCategories` into the prompt builder to actually skip those sections.
- (b) Remove the field if it's purely informational.

**Files:** `src/reference/reference-level.ts`, `src/reference/extraction-prompt.ts`.

### 8. Persona suggest should also suggest a referenceLevel

**Why:** When `create-persona` analyzes a name like "人物传记作家-写家史" (biographer writing family history), `suggestPersonaDefaults` could include a `referenceLevel` suggestion (e.g., 4 for a biographer, 5 for a journalist).

**Files:** `src/persona/suggest.ts`.

---

## Done

- ✅ Add 5-level reference enforcement system (Scan/Validate/Scrutinize/Investigate/Research)
- ✅ Wire `referenceLevel` into `PersonaConfig` and genre presets
- ✅ Add `referenceLevel` selection to `create-persona` CLI
- ✅ Fix `needs-research.json` to be generated on failed runs
- ✅ Fix `ReferenceHarness.ts` Napoleon string parse error
- ✅ Fix `ReferenceCraftHarness.hybrid.json` invalid JSON (literal newlines)
- ✅ Document the reference domain (`docs/domains/reference.md`)
