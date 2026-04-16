---
name: english-to-predicate-translation
description: Translation of English to quantified wffs from [LOGIC_FOUNDATION] §3.2. Covers translation schemes for predicate logic, universal patterns (∀x(Fx→Gx) for "All Fs are Gs"), existential patterns (∃x(Fx&Gx) for "Some Fs are Gs"), identity translations, and the critical rule that universals use → while existentials use &. Use when converting English sentences with "all", "some", "no", "every", "only" into first-order logic.
---

# English to Predicate Translation

## Translation Scheme

A pairing of predicate letters with English predicate phrases, and names with English names. Include metavariables to show argument order.

Example: `Lab`: a likes β. `a`: Abigail → "Abigail likes everything" = `∀xLax`

## Universal Patterns

| English | Translation |
|---------|------------|
| Everything is F | `∀xFx` |
| All Fs are Gs / Every F is G | `∀x(Fx → Gx)` |
| No Fs are Gs | `∀x(Fx → -Gx)` |
| Only Gs are Fs | `∀x(Fx → Gx)` |

**CRITICAL**: Use `→` (not `&`) in the scope of `∀`.

## Existential Patterns

| English | Translation |
|---------|------------|
| Something is F | `∃xFx` |
| Some Fs are Gs | `∃x(Fx & Gx)` |
| There exists an F that is G | `∃x(Fx & Gx)` |

**CRITICAL**: Use `&` (not `→`) in the scope of `∃`.

## Common Mistakes

- `∀x(Fx & Gx)` does NOT mean "All Fs are Gs" — it means "Everything is both F and G"
- `∃x(Fx → Gx)` does NOT mean "Some Fs are Gs" — it's trivially true if anything is not F

## Identity Patterns

| English | Translation |
|---------|------------|
| a is β | `a=β` |
| a is the same as β | `a=β` |

## One-Place vs Many-Place

The choice depends on how much structure the argument requires. More detail (more places) is generally better.
