---
name: sentential-vocabulary
description: Vocabulary of sentential (propositional) logic from [LOGIC_FOUNDATION] §1.2. Defines sentence letters, the five sentential connectives (tilde, ampersand, wedge, arrow, double-arrow), parentheses, expressions, and metavariables. Use when identifying the symbols of propositional logic or their English correspondents.
---

# Sentential Vocabulary

## Sentence Letters

Any symbol from: `A, ..., Z, A₀, ..., Z₀, A₁, ..., Z₁, ...`

Subscripts provide an infinite supply. Also called SENTENCE VARIABLES—they stand for sentences of natural languages.

## Connectives

| Symbol | Name | English Correspondent | Type |
|--------|------|-----------------------|------|
| `-` | Tilde | "It is not the case that" | Unary |
| `&` | Ampersand | "Both ... and ..." | Binary |
| `v` | Wedge | "Either ... or ..." (inclusive) | Binary |
| `→` | Arrow | "If ... then ..." | Binary |
| `↔` | Double-arrow | "... if and only if ..." | Binary |

## Parentheses

`(` and `)` are punctuation marks for the language.

## Expression

An EXPRESSION of sentential logic is any sequence of sentence letters, connectives, or parentheses.

Examples:
- `(P → Q)` is an expression ✓
- `)PQ→-` is an expression ✓ (though not well-formed)
- `(3 + 4)` is NOT an expression (contains non-vocabulary symbols)

## Metavariables

Greek letters (φ, ψ, etc.) are METAVARIABLES—not part of the formal language, but used to talk about expressions of the language. `(φ → ψ)` is not an expression of sentential logic but represents one.
