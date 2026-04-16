---
name: derived-rules
description: Derived rules of proof and substitution instances from [LOGIC_FOUNDATION] §1.5. A proved sequent can be used as a derived rule. Covers substitution instances, and the named derived rules (DN, MTT, HS, TC, FA, DM, Trans, Neg→, Commutativity, Associativity, Distribution, Import/Export, BP, BT, SimDil, ComDil, etc.). Use when applying shortcut rules in sentential logic proofs.
---

# Derived Rules

## Substitution Instance

A SUBSTITUTION INSTANCE of a sequent replaces each sentence letter uniformly with a wff throughout.

Example: `P v Q ⊢ -P → Q` has instance `(R & S) v Q ⊢ -(R & S) → Q` via pattern `P/(R & S); Q/Q`.

## Using Derived Rules

Any proved sequent (or substitution instance) may be used as a derived rule:
- **Annotation**: Line numbers of premises + rule name or S#
- **Assumption set**: Union of assumption sets of the premises

## Named Derived Rules (S11–S52)

| Name | Sequent |
|------|---------|
| Double Negation (DN) | `P ⊣⊢ --P` |
| Modus Tollens (MTT) | `P → Q, -Q ⊢ -P` |
| Hypothetical Syllogism (HS) | `P → Q, Q → R ⊢ P → R` |
| True Consequent (TC) | `P ⊢ Q → P` |
| False Antecedent (FA) | `-P ⊢ P → Q` |
| Impossible Antecedent (IA) | `P, -P ⊢ Q` |
| Wedge-Arrow (v→) | `P v Q ⊢ -P → Q` (and variants) |
| Simple Dilemma (SimDil) | `P v Q, P → R, Q → R ⊢ R` |
| Complex Dilemma (ComDil) | `P v Q, P → R, Q → S ⊢ R v S` |
| Special Dilemma | `P → Q, -P → Q ⊢ Q` |
| DeMorgan (DM) | `-(P v Q) ⊣⊢ -P & -Q` and `-(P & Q) ⊣⊢ -P v -Q` |
| Negated Arrow (Neg→) | `-(P → Q) ⊣⊢ P & -Q` (and variants) |
| & Commutativity | `P & Q ⊣⊢ Q & P` |
| v Commutativity | `P v Q ⊣⊢ Q v P` |
| ↔ Commutativity | `P ↔ Q ⊣⊢ Q ↔ P` |
| Transposition (Trans) | `P → Q ⊣⊢ -Q → -P` |
| & Associativity | `P & (Q & R) ⊣⊢ (P & Q) & R` |
| v Associativity | `P v (Q v R) ⊣⊢ (P v Q) v R` |
| &/v Distribution | `P & (Q v R) ⊣⊢ (P & Q) v (P & R)` |
| v/& Distribution | `P v (Q & R) ⊣⊢ (P v Q) & (P v R)` |
| Import/Export | `P → (Q → R) ⊣⊢ P & Q → R` |
| Biconditional Ponens (BP) | `P ↔ Q, P ⊢ Q` and `P ↔ Q, Q ⊢ P` |
| Biconditional Tollens (BT) | `P ↔ Q, -P ⊢ -Q` and `P ↔ Q, -Q ⊢ -P` |
| BiTransposition | `P ↔ Q ⊣⊢ -Q ↔ -P` |
| Negated ↔ | `-(P ↔ Q) ⊣⊢ P ↔ -Q` and `-(P ↔ Q) ⊣⊢ -P ↔ Q` |

## Example Usage

```
1    (1)  R v S → T    A
2    (2)  -T           A
1,2  (3)  -(R v S)     1,2 MTT
1,2  (4)  -R & -S      3 DM
1,2  (5)  -R           4 &E
```
