---
name: numerical-quantities
description: Numerical quantity translations using identity from [LOGIC_FOUNDATION] §3.2. Covers "at least n" (asserting existence of n non-identical objects), "exactly n" (at least n + all objects identical to one of them), and "at most n" (negating existence of n+1 distinct objects). Use when translating sentences like "exactly one", "at least two", "at most three" into predicate logic.
---

# Numerical Quantities

Express numerical quantities using quantifiers + identity symbol.

## At Least n

Assert existence of n pairwise non-identical objects.

| Quantity | Pattern |
|----------|---------|
| At least 1 | `∃xFx` |
| At least 2 | `∃x∃y((Fx & Fy) & x≠y)` |
| At least 3 | `∃x∃y∃z(((Fx & Fy) & Fz) & ((x≠y & x≠z) & y≠z))` |

## Exactly n

At least n objects, and everything is identical to one of them.

| Quantity | Pattern |
|----------|---------|
| Exactly 1 F | `∃x(Fx & ∀y(Fy → y=x))` |
| Exactly 2 | `∃x∃y((x≠y) & ∀z(z=x v z=y))` |
| Exactly 3 | `∃x∃y∃z(((x≠y & x≠z) & y≠z) & ∀w((w=x v w=y) v w=z))` |

## At Most n

Equivalent to "not at least n+1 distinct objects."

| Quantity | Pattern |
|----------|---------|
| At most 1 F | `∀x∀y((Fx & Fy) → x=y)` |
| At most 2 Ds | `-∃x∃y∃z((Dx & (Dy & Dz)) & (x≠y & (x≠z & y≠z)))` |

## Example

"Every dog has exactly one tail":

`∀x(Dx → ∃y((Ty & Byx) & ∀z((Tz & Bzx) → y=z)))`

(For every dog x, there exists a tail y belonging to x, and any tail z belonging to x is identical to y.)
