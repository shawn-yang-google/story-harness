# Tier 2 — Hybrid Harnesses

"LLM Extracts, Code Verifies" — a two-phase pipeline where a cheap LLM parses narrative text into a structured graph, then deterministic checkers verify formal rules against that graph.

## What

Tier 2 harnesses split evaluation into two phases:

```
                     Phase A                         Phase B
                   (Extraction)                    (Verification)
┌─────────┐    ┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│  Draft   │───►│  Flash-Lite     │───►│  Domain      │───►│  CheckResult │
│  (text)  │    │  + Extraction   │    │  Graph       │    │  [] (errors/ │
│          │    │  Prompt         │    │  (JSON)      │    │   warnings)  │
└─────────┘    └─────────────────┘    └──────────────┘    └──────────────┘
                  LLM (~300ms)         Deterministic (<1ms)
```

**Phase A — Extraction**: A cheap, fast LLM (Gemini 3.1 Flash Lite) parses the narrative draft into a domain-specific structured graph (JSON). The LLM acts as a parser/lexer — it understands natural language and extracts structured data, but makes no quality judgments.

**Phase B — Verification**: Deterministic TypeScript checker modules run against the extracted graph. These are analogous to a type checker in a compiler — they apply formal rules and produce precise error messages with evidence.

This design gives us the best of both worlds: the LLM's ability to understand natural language, combined with the precision and debuggability of deterministic code.

## The Compiler Pipeline Analogy

| Compiler Stage | StoryHarness Equivalent | What It Does |
|---------------|------------------------|--------------|
| **Lexer/Parser** | Phase A (Flash-Lite extraction) | Reads raw text → structured AST |
| **AST** | Domain Graph (LogicGraph, DialogueGraph, etc.) | Structured intermediate representation |
| **Type Checker** | Phase B (Checker modules) | Applies formal rules to the AST |
| **Error Messages** | `CheckResult[]` | Precise errors with evidence and locations |

## Domain-Specific Graphs

Each domain has its own graph schema defined in `src/types/`:

| Domain | Graph | File | Interfaces |
|--------|-------|------|------------|
| Logic | `LogicGraph` | `src/types/logic-graph.ts` | 14 interfaces (Proposition, TemporalEvent, KnowledgeEntry, etc.) |
| Dialogue | `DialogueGraph` | `src/types/dialogue-graph.ts` | 9 interfaces (Speech, SubtextEntry, ExpositionLine, etc.) |
| Character | `CharacterGraph` | `src/types/character-graph.ts` | 5 interfaces (Character, PressureChoice, DimensionalContradiction, etc.) |
| Narrative | `NarrativeGraph` | `src/types/narrative-graph.ts` | 6 interfaces (SceneTurningValue, StakeEntry, ProtagonistDesire, etc.) |

See the [domain docs](../domains/) for detailed schema breakdowns.

## Extraction Prompts

Each domain has a carefully crafted extraction prompt in `src/<domain>/extraction-prompt.ts`. These prompts instruct Flash-Lite to:

1. Read the narrative draft and any lore/context provided
2. Output a JSON object conforming to the domain's graph schema
3. Include location references (e.g., "paragraph 2, sentence 1") for traceability

The extraction prompt is **fixed** (expert-crafted, not synthesized). The `.hybrid.json` file can optionally append a domain-specific `extractionPromptAddendum` for specialized harnesses, but the base prompt handles the core extraction.

## Deterministic Checkers

48 total checks across 4 domains:

| Domain | Checker Module | Checks | Source |
|--------|---------------|--------|--------|
| **Logic** | 6 modules | 27 checks | `src/logic/` ([details](../domains/logic.md)) |
| **Dialogue** | 1 module | 8 checks | `src/dialogue/dialogue-checker.ts` ([details](../domains/dialogue.md)) |
| **Character** | 1 module | 6 checks | `src/character/character-checker.ts` ([details](../domains/character.md)) |
| **Narrative** | 1 module | 7 checks | `src/narrative/narrative-checker.ts` ([details](../domains/narrative.md)) |

Each checker returns `CheckResult[]` with structured fields:

```typescript
interface CheckResult {
  checker: string;     // e.g., "PropositionalChecker"
  rule: string;        // e.g., "contradiction"
  severity: "error" | "warning";
  message: string;     // Human-readable description
  evidence: string[];  // IDs of involved entities
}
```

## File Format

`.hybrid.json` files in `harnesses/`:

```json
{
  "domain": "logic",
  "extractionPromptAddendum": "",
  "verificationCode": ""
}
```

| Field | Type | Description |
|-------|------|-------------|
| `domain` | `"logic" \| "dialogue" \| "character" \| "narrative"` | Selects extraction prompt and checker pipeline |
| `extractionPromptAddendum` | `string` | Optional additions to the base extraction prompt |
| `verificationCode` | `string` | Reserved for future custom verification logic |

If `domain` is absent, it is inferred from the filename (e.g., `DialogueCraftHarness.hybrid.json` → `"dialogue"`).

## Benchmark Results

Tier 2 significantly outperforms [Tier 3](tier-3-prompt.md) on domains with formal structure:

| Metric | Tier 2 (Hybrid) | Tier 3 (Prompt) |
|--------|:---:|:---:|
| **Accuracy** | **88%** | 53% |
| **Deterministic verification** | ✅ | ❌ |
| **Debuggable errors** | ✅ (rule + evidence) | ❌ (LLM prose) |
| **Cost per eval** | ~$0.0002 | ~$0.0002 |
| **Speed** | ~300ms | ~500ms |

## When to Use

Tier 2 is the **default choice** for any domain with formal, rule-based principles:

| Domain | Use Tier 2? | Why |
|--------|:-----------:|-----|
| **Logic** | ✅ | Formal logic rules (propositional, temporal, epistemic, etc.) |
| **Dialogue** | ✅ | McKee's dialogue principles have clear, checkable criteria |
| **Character** | ✅ | McKee's character principles (mask vs truth, pressure choice) are structural |
| **Narrative** | ✅ | McKee's story principles (turning values, stakes, conflict) are formal |
| **Style** | ❌ | Too subjective for structured extraction |
| **Emotion** | ❌ | Emotional resonance resists formal decomposition |
| **Tension** | ❌ | Pacing "feel" is hard to formalize |

For subjective domains, use [Tier 1 code harnesses](tier-1-code.md) (pattern matching) or [Tier 3 prompt harnesses](tier-3-prompt.md) (LLM evaluation).

## Execution Flow

The hybrid harness executor lives in `src/environment/hybrid-harness.ts`:

```
executeHybridHarness(addendum, verificationCode, draft, context, domain)
  │
  ├─ buildPromptForDomain(domain, draft, context)    // Select extraction prompt
  ├─ Append extractionPromptAddendum (if any)
  ├─ generateContent(MODELS.EVALUATOR, fullPrompt)   // Phase A: LLM extraction
  ├─ parseJsonResponse(response, emptyGraph)          // Lenient JSON parsing
  └─ runDomainCheckers(graph, context)                // Phase B: Deterministic checks
       └─ return CheckResult[]
```

JSON parsing is lenient — it handles raw JSON, code blocks (` ```json ... ``` `), and extracts JSON from mixed text. On parse failure, it falls back to an empty graph (which means all checker modules see clean inputs).

## See Also

- [Architecture — Gated Pipeline](../architecture.md#the-gated-pipeline)
- [Tier 1 — Code Harnesses](tier-1-code.md)
- [Tier 3 — Prompt Harnesses](tier-3-prompt.md)
- [Logic Domain](../domains/logic.md)
- [Dialogue Domain](../domains/dialogue.md)
- [Character Domain](../domains/character.md)
- [Narrative Domain](../domains/narrative.md)
