---
name: prenex-form
description: Prenex normal form from [LOGIC_FOUNDATION] §3.4. A prenex sentence has all quantifiers at the beginning with no connective outside the scope of any quantifier. Any sentence can be converted to prenex form using quantifier exchange and confinement rules. Use when normalizing predicate logic formulas to have all quantifiers upfront.
---

# Prenex Normal Form

## Definition

A PRENEX sentence has all its quantifiers in a row at the beginning. No connective is outside the scope of any quantifier.

## Structure

```
Q₁x₁ Q₂x₂ ... Qₙxₙ (matrix)
```

Where each Qᵢ is ∀ or ∃, and the matrix is quantifier-free.

## Conversion Method

Use Quantifier Exchange (QE) and Confinement rules to move all quantifiers to the front:

1. Eliminate biconditionals and negated quantifiers using QE
2. Apply confinement rules to extract quantifiers past connectives
3. Repeat until all quantifiers are at the front

## Examples

| Original | Prenex Equivalent |
|----------|-------------------|
| `∀x(Px → ∀zRxz)` | `∀x∀z(Px → Rxz)` |
| `∃y(Fy & ∀z(Hyz & Jz))` | `∃y∀z(Fy & (Hyz & Jz))` |
| `-∀xFx → ∃xHx` | `∃x∀y(-Fy → Hx)` (or equivalent) |
| `∃xFxa → ∀yGyaa` | `∀x∀y(Fxa → Gyaa)` (if x not free in second part) |

## Important Notes

- Prenex conversion may require renaming variables to avoid capture
- The prenex equivalent is LOGICALLY EQUIVALENT to the original (provable in both directions)
- Not every prenex form is unique — different orderings of quantifiers may be equivalent
