---
name: predicate-wffs
description: Well-formed formulas of predicate logic from [LOGIC_FOUNDATION] §3.1. Defines the 7 formation rules for predicate wffs including atomic sentences (predicate+names, identity statements), universally and existentially quantified wffs, and open formulas. Use when determining if a predicate logic expression is well-formed.
---

# Predicate Logic Wffs

## The 7 Formation Rules

1. Sentence letters are wffs
2. An n-place predicate followed by n names is a wff → **ATOMIC SENTENCE**
3. `α=β` (where α, β are names) is a wff → **IDENTITY STATEMENT** (atomic)
4. Negations, conjunctions, disjunctions, conditionals, biconditionals of wffs are wffs
5. Replace ≥1 occurrence of a name by new variable α, prefix `∀α` → **UNIVERSAL WFF**
6. Replace ≥1 occurrence of a name by new variable α, prefix `∃α` → **EXISTENTIAL WFF**
7. Nothing else is a wff

## Open Formula

An OPEN FORMULA is the result of replacing ≥1 name in a wff by a new variable. Open formulas are NOT wffs and never appear as sentences in proofs.

Examples: `Fx` is open (part of `∀xFx`). `Fxy` is open (part of `∀x∃yFxy`).

## Conventions

- **Quantifier shorthand**: `∀xyz(...)` = `∀x∀y∀z(...)`
- **Non-identity**: `a≠b` abbreviates `-a=b` (a negation, not atomic)

## Examples of Wffs

`∀x(Fx → Gx)`, `∃x∃y(Rxy → Ryx)`, `(∃xFx → P)`, `∀x∃yFyxb`, `-a=b`, `∀x x=x`

## Examples of Non-Wffs

`∀xGcax` (x doesn't replace a name), `P=c` (P is not a name), `Fa=Fa` (malformed identity)
