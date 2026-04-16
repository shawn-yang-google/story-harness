---
name: quantifier-scope-binding
description: Quantifier scope and variable binding from [LOGIC_FOUNDATION] §3.1. Defines scope of a quantifier (shortest open formula to its right), wider/narrower scope, bound variables (in scope of their quantifier), and free/unbound variables. Use when analyzing quantifier scope relationships or determining if variables are bound or free.
---

# Quantifier Scope and Variable Binding

## Scope

The SCOPE of a quantifier is the shortest open formula to the right of the quantifier.

### Examples

In `(∀xFx & ∃y(Fy → Gy))`:
- Scope of `∀x` is `Fx`
- Scope of `∃y` is `(Fy → Gy)`

In `∃y(Fy & ∀z(Gz v -Rzy))`:
- Scope of `∃y` is `(Fy & ∀z(Gz v -Rzy))` (wider)
- Scope of `∀z` is `(Gz v -Rzy)` (narrower)

## Wider and Narrower Scope

A quantifier whose scope CONTAINS another quantifier has WIDER SCOPE. The contained quantifier has NARROWER SCOPE.

## Bound Variables

A variable α in the scope of a quantifier `∀α` or `∃α` is BOUND.

A variable NOT bound by any quantifier is UNBOUND (FREE).

### Examples

In `∀x(Fx → Gx)`: both occurrences of x are bound by `∀x`.

In `∀x(Fx → Gy)`: x is bound, y is FREE (no quantifier `∀y` or `∃y`).

In `∀x(Fx → ∃xGx)`: the first x is bound by `∀x`, the second x is bound by `∃x`.
