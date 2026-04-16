---
name: infinite-countermodels
description: Infinite and numerical countermodels from [LOGIC_FOUNDATION] §4.5. Some invalid arguments require infinite domains (cannot be shown invalid with finite models). A numerical countermodel uses the natural numbers (ℕ) as universe. Common predicates include < (transitive, asymmetric, irreflexive, serial). Use when finite countermodels are insufficient to demonstrate invalidity.
---

# Infinite Countermodels

## When Needed

Some invalid arguments cannot be shown invalid by any finite countermodel. They require an INFINITE COUNTERMODEL — one with infinitely many objects in the domain.

## Numerical Countermodel

A countermodel whose universe is ℕ (natural numbers: 0, 1, 2, 3, ...).

**Important**: Expansions cannot be used (would be infinitely long). Instead, argue directly about truth of quantified statements using properties of numbers.

## Classic Example

`∀xyz(Rxy & Ryz → Rxz), ∀xy(Rxy → -Ryx), ∀x-Rxx, ∀x∃yRxy ⊢ ∃y∀xRxy`

Countermodel: `U: ℕ`, `R: {(m,n) : m < n}`

Premises (all TRUE):
1. Transitivity: if m < n and n < p then m < p ✓
2. Asymmetry: if m < n then n ≮ m ✓
3. Irreflexivity: no m < m ✓
4. Seriality: for every m, there exists m+1 > m ✓

Conclusion (FALSE): "There is a number greater than every number" — no such number exists ✗

## Why Infinite is Required

The four premises force an ever-growing chain: each object must relate to something new (by seriality), but can't relate back (by asymmetry) or to itself (by irreflexivity). This process never terminates → requires infinitely many objects.

## Useful Predicates for ℕ

| Predicate | Properties |
|-----------|-----------|
| `<` (strictly less than) | Transitive, asymmetric, irreflexive, serial |
| `>` (strictly greater than) | Same properties |
| Divisibility | Reflexive, antisymmetric, transitive |
| Even/Odd membership | Partition into two infinite sets |
