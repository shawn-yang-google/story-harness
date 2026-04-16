---
name: english-to-sentential-translation
description: Translation of English to sentential wffs from [LOGIC_FOUNDATION] §1.3. Covers translation schemes, logical form, stylistic variants for negations, conditionals, conjunctions, disjunctions, biconditionals, neither-nor, and tense handling. Use when converting English sentences to propositional logic notation.
---

# English to Sentential Translation

## Translation Scheme

A pairing of sentence letters with logically simple English sentences (containing no connective words).

## Logical Form

The wff translation of a natural language sentence under a given scheme. Sentences with the same logical form are STYLISTIC VARIANTS.

## Stylistic Variants by Connective

### Negation (`-φ`)
- "φ is not the case" / "It is not the case that φ" / "It is false that φ"
- English prefixes: "not", "un-", "in-", "im-"

### Conditional (`φ → ψ`)
- If φ, ψ / φ only if ψ / Provided that φ, ψ / ψ provided that φ
- φ is sufficient for ψ / φ is a sufficient condition for ψ
- ψ is necessary for φ / ψ is a necessary condition for φ
- Whenever φ, ψ / ψ if φ / Given that φ, ψ / In case φ, ψ
- φ only on the condition that ψ / ψ on the condition that φ

### Conjunction (`φ & ψ`)
- φ and ψ / Both φ and ψ / φ, but ψ / φ, although ψ
- φ as well as ψ / Though φ, ψ / φ, also ψ

### Disjunction (`φ v ψ`)
- φ or ψ / Either φ or ψ / φ unless ψ
- Note: "φ unless ψ" also translates as `(-ψ → φ)`, which is equivalent

### Biconditional (`φ ↔ ψ`)
- φ if and only if ψ / φ is equivalent to ψ
- φ is necessary and sufficient for ψ / φ just in case ψ

### Neither...Nor
- "Neither φ nor ψ" = `-(φ v ψ)` = `(-φ & -ψ)`

## Tense

Tense distinctions (present vs future) can usually be ignored in exercises unless the argument's validity depends on them.
