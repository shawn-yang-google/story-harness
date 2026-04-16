---
name: universal-existential-expansions
description: Universal and existential expansions from [LOGIC_FOUNDATION] §4.1. A universal expansion is the conjunction of all instances over the universe. An existential expansion is the disjunction of all instances. For overlapping quantifiers, expand outermost first. Use when converting quantified formulas to quantifier-free form in a finite domain.
---

# Universal and Existential Expansions

## Universal Expansion

The expansion of `∀xφ(x)` in universe `{a₁, ..., aₙ}`:

```
φ(a₁) & φ(a₂) & ... & φ(aₙ)
```

Example: `∀x(Fx → Gx)` in `{a, b, c}`:
```
(Fa → Ga) & (Fb → Gb) & (Fc → Gc)
```

## Existential Expansion

The expansion of `∃xφ(x)` in universe `{a₁, ..., aₙ}`:

```
φ(a₁) v φ(a₂) v ... v φ(aₙ)
```

Example: `∃x(Fx & Gx)` in `{a, b}`:
```
(Fa & Ga) v (Fb & Gb)
```

## Overlapping Quantifiers

Expand the OUTERMOST quantifier first, then inner ones.

Example: `∀x∃yGxy` in `{a, b}`:
1. Expand `∀x`: `∃yGay & ∃yGby`
2. Expand each `∃y`: `(Gaa v Gab) & (Gba v Gbb)`

Example: `∀x(Fx → ∃yGy)` in `{a, b}`:
1. `(Fa → ∃yGy) & (Fb → ∃yGy)`
2. `(Fa → (Ga v Gb)) & (Fb → (Ga v Gb))`

## Truth Value

The truth value of a quantified sentence equals the truth value of its expansion in the given interpretation.
