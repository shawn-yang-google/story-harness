---
name: countermodels-one-place
description: Finite countermodels for arguments with one-place predicates from [LOGIC_FOUNDATION] §4.2. A model makes all sentences true. A countermodel makes premises true and conclusion false, demonstrating invalidity. For n one-place predicates, universe needs at most 2^n elements. Use when showing predicate logic arguments invalid via finite interpretations.
---

# Countermodels with One-Place Predicates

## Definitions

- **Model**: An interpretation where all sentences in a set are true
- **Countermodel**: A model for the premises where the conclusion is FALSE

A countermodel demonstrates invalidity — the predicate-logic analogue of an invalidating assignment.

## Size Bound

For an invalid sequent with n one-place predicates (no many-place), the universe needs at most **2ⁿ** elements.

## Method

1. Choose a small universe
2. Assign predicate extensions
3. Expand the premises and conclusion
4. Verify: all premises TRUE, conclusion FALSE

## Example

`∀xFx → ∀xGx ⊢ ∀x(Fx → Gx)` — INVALID

Countermodel: `U: {a, b}`, `F: {a}`, `G: {b}`

Premise: `Fa & Fb → Ga & Gb` = `T & F → F & T` = `F → F` = **T** ✓
Conclusion: `(Fa → Ga) & (Fb → Gb)` = `(T → F) & (F → T)` = `F & T` = **F** ✗

## Example

`∃xFx & ∃xGx ⊢ ∃x(Fx & Gx)` — INVALID

Countermodel: `U: {a, b}`, `F: {a}`, `G: {b}`

Premise: `(Fa v Fb) & (Ga v Gb)` = `(T v F) & (F v T)` = **T** ✓
Conclusion: `(Fa & Ga) v (Fb & Gb)` = `(T & F) v (F & T)` = **F** ✗
