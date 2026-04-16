---
name: parenthesis-conventions
description: Parenthesis-dropping conventions for sentential logic from [LOGIC_FOUNDATION] §1.2. Covers when outer parentheses can be dropped, binding strength/precedence of connectives (tilde > ampersand/wedge > arrow > double-arrow), and ambiguity resolution. Use when simplifying or parsing logical expressions with omitted parentheses.
---

# Parenthesis-Dropping Conventions

## Rule

If a sentence is surrounded by parentheses, these may be dropped.

Example: `P → Q` is shorthand for `(P → Q)`.

## Binding Strength (Strongest to Weakest)

1. `-` (tilde) — binds most strongly
2. `&` and `v` — bind more strongly than → and ↔
3. `→` (arrow) — binds more strongly than ↔
4. `↔` (double-arrow) — binds least strongly

## Examples

| Abbreviated | Full Form |
|-------------|-----------|
| `-P & Q → R` | `((-P & Q) → R)` |
| `P → Q ↔ R` | `((P → Q) ↔ R)` |

## Ambiguous Cases

`&` and `v` at the same level are ambiguous — parentheses required:
- `P v Q & R` — AMBIGUOUS (could be `(P v (Q & R))` or `((P v Q) & R)`)
- `P → Q → R` — AMBIGUOUS (could be `(P → (Q → R))` or `((P → Q) → R)`)

## Important Note

Expressions admitted by these conventions are NOT themselves well-formed formulas. They are merely convenient abbreviations.
