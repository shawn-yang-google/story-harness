---
name: countermodels-many-place
description: Finite countermodels for arguments with many-place predicates from [LOGIC_FOUNDATION] §4.3. Defines ordered pairs, ordered n-tuples, and n-place predicate extensions as sets of tuples. Covers expansion of many-place quantified formulas. Use when constructing countermodels for relational predicate logic arguments.
---

# Countermodels with Many-Place Predicates

## Ordered Pairs and n-Tuples

- **Ordered pair** `(α, β)`: Two objects in order. `(a, b) ≠ (b, a)` when a ≠ b.
- **Ordered n-tuple** `(a₀, ..., aₙ)`: n objects in order. Changing order changes identity.

## n-Place Predicate Extensions

The EXTENSION of an n-place predicate is a set of ordered n-tuples from the universe.

Example: `U: {a, b, c}`, `R: {(a,b), (c,b), (a,a)}`
- True: Rab, Rcb, Raa
- False: Rac, Rbc, Rba, Rca, Rbb, Rcc

## Expansion with Many-Place Predicates

Example: `∀x∃yFxy` in `{a, b}`:
1. `∃yFay & ∃yFby` (expand ∀x)
2. `(Faa v Fab) & (Fba v Fbb)` (expand each ∃y)

## Classic Example

`∀x∃yRxy ⊢ ∃y∀xRxy` — INVALID

`U: {a, b}`, `R: {(a, b), (b, a)}`

Premise: `(Raa v Rab) & (Rba v Rbb)` = `(F v T) & (T v F)` = **T** ✓
Conclusion: `(Raa & Rba) v (Rab & Rbb)` = `(F & T) v (T & F)` = **F** ✗

This shows that "everything relates to something" does NOT imply "something relates to everything."
