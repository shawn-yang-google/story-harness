---
name: quantifier-exchange
description: Quantifier Exchange (QE) derived rules from [LOGIC_FOUNDATION] §3.4. Establishes that initial tilde can move past a quantifier (changing ∀↔∃): -∀xPx⊣⊢∃x-Px, -∃xPx⊣⊢∀x-Px, -∀x-Px⊣⊢∃xPx, -∃x-Px⊣⊢∀xPx. Use when pushing negation past quantifiers or converting between universal and existential forms.
---

# Quantifier Exchange (QE)

## The Four Rules

| # | Sequent | Direction |
|---|---------|-----------|
| S150 | `-∀xPx ⊣⊢ ∃x-Px` | "Not everything is P" ↔ "Something is not P" |
| S151 | `-∃xPx ⊣⊢ ∀x-Px` | "Nothing is P" ↔ "Everything is not P" |
| S152 | `-∀x-Px ⊣⊢ ∃xPx` | "Not everything is not P" ↔ "Something is P" |
| S153 | `-∃x-Px ⊣⊢ ∀xPx` | "Nothing is not P" ↔ "Everything is P" |

## General Principle

A tilde can always be moved past an adjacent quantifier, CHANGING the quantifier type (∀↔∃).

This works for any quantified formula, not just simple `Px`.

## Usage as Derived Rule

```
1    (1)  ∃x-(Fx & Gx)     A
2    (2)  ∃xGx → ∀x(Fx & Gx)    A
1    (3)  -∀x(Fx & Gx)     1 QE
1,2  (4)  -∃xGx            2,3 MTT
1,2  (5)  ∀x-Gx            4 QE
```

## Proof Sketch (S150: `-∀xPx ⊢ ∃x-Px`)

```
1  (1)  -∀xPx        A
2  (2)  -∃x-Px       A [for RAA]
3  (3)  -Pa           A [for RAA]
3  (4)  ∃x-Px         3 ∃I
2  (5)  Pa             2,4 RAA (3)
2  (6)  ∀xPx          5 ∀I
1  (7)  ∃x-Px         1,6 RAA (2)
```
