---
name: well-formed-formulas
description: Well-formed formulas (wffs) of sentential logic from [LOGIC_FOUNDATION] §1.2. Defines the 7 formation rules for wffs, atomic sentences, negation, conjunction, disjunction, conditional (antecedent/consequent), biconditional, binary vs unary connectives, sentence, and denial. Use when determining whether an expression is a wff or classifying its type.
---

# Well-Formed Formulas (Wffs)

## The 7 Formation Rules

A WFF of sentential logic is any expression that accords with:

1. A sentence letter standing alone is a wff → **ATOMIC SENTENCE**
2. If φ is a wff, then `-φ` is a wff → **NEGATION** (`-φ` is the negation of φ)
3. If φ, ψ are wffs, then `(φ & ψ)` is a wff → **CONJUNCTION** (φ = left conjunct, ψ = right conjunct)
4. If φ, ψ are wffs, then `(φ v ψ)` is a wff → **DISJUNCTION** (φ = left disjunct, ψ = right disjunct)
5. If φ, ψ are wffs, then `(φ → ψ)` is a wff → **CONDITIONAL** (φ = ANTECEDENT, ψ = CONSEQUENT)
6. If φ, ψ are wffs, then `(φ ↔ ψ)` is a wff → **BICONDITIONAL** (also called EQUIVALENCE)
7. Nothing else is a wff

## Related Definitions

- **Binary connectives**: `&, v, →, ↔` (connect two wffs)
- **Unary connective**: `-` (attaches to one wff)
- **Sentence**: A wff that is not part of a larger wff
- **Denial**: The denial of non-negation φ is `-φ`. A negation `-φ` has two denials: `φ` and `--φ`

## Examples

| Expression | Wff? | Type |
|-----------|------|------|
| `A` | ✓ | Atomic sentence |
| `(A → B)` | ✓ | Conditional (antecedent A, consequent B) |
| `(A)` | ✗ | Extra parentheses |
| `-(A v B)` | ✓ | Negation |
| `((P & Q) → R)` | ✓ | Conditional |
| `(A & B)` | ✓ | Conjunction |
| `(-A)` | ✗ | Negation doesn't get outer parens |

## Denial vs Negation

`-(P → Q)` has one negation: `--(P → Q)`. It has two denials: `(P → Q)` and `--(P → Q)`.

`(P → Q)` has one denial: `-(P → Q)`.
