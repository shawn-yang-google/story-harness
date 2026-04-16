---
name: confinement-rules
description: Confinement rules from [LOGIC_FOUNDATION] §3.4. Allow moving quantifiers past connectives when a subformula has no free occurrences of the quantified variable. Includes ∀ distribution over &, ∃ distribution over v, and quantifier extraction from conditionals. Use when rearranging quantifier scope relative to connectives.
---

# Confinement Rules

## Rules (S154–S161)

| # | Sequent | Name |
|---|---------|------|
| S154 | `∀x(Px & Qx) ⊣⊢ ∀xPx & ∀xQx` | ∀ distributes over & |
| S155 | `∀x(Px → Q) ⊣⊢ ∃xPx → Q` | Q has no free x |
| S156 | `∀xPx v ∀xQx ⊢ ∀x(Px v Qx)` | One direction only |
| S157 | `∃x∃y(Px & Qy) ⊣⊢ ∃xPx & ∃xQx` | ∃ distributes over & |
| S158 | `∃x(Px v Qx) ⊣⊢ ∃xPx v ∃xQx` | ∃ distributes over v |
| S159 | `∃x(Px → Q) ⊣⊢ ∀xPx → Q` | Q has no free x |
| S160 | `P → ∃xQx ⊣⊢ ∃x(P → Qx)` | P has no free x |
| S161 | `P → ∀xQx ⊣⊢ ∀x(P → Qx)` | P has no free x |

## Key Asymmetries

- `∀` distributes over `&` (both directions) but NOT fully over `v`
  - `∀xPx v ∀xQx ⊢ ∀x(Px v Qx)` ✓
  - `∀x(Px v Qx) ⊢ ∀xPx v ∀xQx` ✗ (invalid!)
- `∃` distributes over `v` (both directions) but NOT fully over `&`
  - `∃x(Px & Qx) ⊢ ∃xPx & ∃xQx` ✓
  - `∃xPx & ∃xQx ⊢ ∃x(Px & Qx)` ✗ (invalid!)

## Condition

Confinement only works when the subformula being moved past the quantifier has NO FREE occurrences of the quantified variable.
