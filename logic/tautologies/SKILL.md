---
name: tautologies
description: Tautologies, inconsistent sentences, and contingent sentences from [LOGIC_FOUNDATION] §2.3. A tautology has only Ts in its TT column (valid with no premises). An inconsistent sentence has only Fs. A contingent sentence has both. Use when classifying logical sentences by their truth-value profiles.
---

# Tautologies

## Definitions

- **Tautology** (tautologous): A sentence whose TT column contains ONLY Ts. Equivalently, `⊢ φ` is valid (no premises needed). Cannot be false.
- **Inconsistent**: A sentence whose TT column contains ONLY Fs. Cannot be true.
- **Contingent**: A sentence that is neither tautologous nor inconsistent (has both Ts and Fs).

## Examples

| Sentence | Classification |
|----------|---------------|
| `P v -P` | Tautologous |
| `P & -P` | Inconsistent |
| `P` | Contingent |
| `((P → Q) → P) → P` | Tautologous (Peirce's Law) |
| `(P & Q) ↔ (-P v -Q)` | Inconsistent |

## Relationship to Theorems

All theorems from Chapter 1 are tautologies. Every tautology can be proved as a theorem.

## Valid Sequents Without Premises

A valid sequent with no premises means its conclusion is a tautology — there are no TT lines where the conclusion is false (since there are no premises to constrain).
