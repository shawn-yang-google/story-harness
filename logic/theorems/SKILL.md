---
name: theorems
description: Theorems and their use as derived rules from [LOGIC_FOUNDATION] §1.6. A theorem is provable from the empty premise set, has an empty assumption set on its final line, and can be introduced into any proof as a line with no assumptions. Use when proving or applying logical tautologies like Excluded Middle, Non-Contradiction, Peirce's Law.
---

# Theorems

## Definition

A THEOREM is a sentence provable from the empty premise set. Written as `⊢ φ` (nothing left of turnstile).

## How to Prove

1. Assume something
2. Derive the desired conclusion
3. Discharge ALL assumptions so the final line has an empty assumption set

```
   (1)  P & Q    A
   (2)  Q        1 &E
   (3)  P        1 &E
   (4)  Q & P    2,3 &I
   (5)  P & Q → Q & P    4 →I (1)   ← empty assumption set
```

## Key Theorems

| # | Theorem | Name |
|---|---------|------|
| T1 | `⊢ P → P` | Identity |
| T2 | `⊢ P v -P` | Excluded Middle |
| T3 | `⊢ -(P & -P)` | Non-Contradiction |
| T4 | `⊢ P → (Q → P)` | Weakening |
| T5 | `⊢ (P → Q) v (Q → P)` | — |
| T8 | `⊢ -(P ↔ Q) ↔ (-P ↔ Q)` | — |
| T9 | `⊢ ((P → Q) → P) → P` | Peirce's Law |
| T10 | `⊢ (P → Q) v (Q → R)` | — |
| T14 | `⊢ P ↔ P v P` | v Idempotence |
| T15 | `⊢ P ↔ P & P` | & Idempotence |
| T30 | `⊢ (P & Q) v (R & S) ↔ ((PvR)&(PvS))&((QvR)&(QvS))` | — |

## Theorems as Derived Rules

A theorem (or substitution instance) can appear as a proof line with an empty assumption set.

```
1  (1)  P → Q    A
2  (2)  -P → Q   A
   (3)  P v -P   T2 (Excluded Middle)
1,2 (4)  Q        1,2,3 SimDil
```

Annotation: theorem name or `T#`.
