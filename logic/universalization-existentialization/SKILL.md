---
name: universalization-existentialization
description: Universalization, existentialization, and instance from [LOGIC_FOUNDATION] §3.3. Universalization replaces ALL occurrences of a name and prefixes ∀. Existentialization replaces AT LEAST ONE occurrence and prefixes ∃. An instance removes the quantifier and uniformly replaces the variable with a name. Use when preparing to apply quantifier introduction or elimination rules.
---

# Universalization, Existentialization, and Instance

## Universalization

A UNIVERSALIZATION of a sentence w.r.t. a name:
1. Replace ALL occurrences of the name by a new variable α (not already in the sentence)
2. Prefix `∀α`

Examples: Universalizations of `(Fa → Ga)`: `∀x(Fx → Gx)`, `∀y(Fy → Gy)`.
Universalizations of `Faa`: `∀xFxx`, `∀yFyy` (ALL occurrences replaced).

## Existentialization

An EXISTENTIALIZATION of a sentence w.r.t. a name:
1. Replace AT LEAST ONE occurrence of the name by a new variable α
2. Prefix `∃α`

**Key difference**: Existentialization allows partial replacement.

Examples: Existentializations of `(Fa → Ga)`: `∃x(Fx → Gx)`, `∃x(Fa → Gx)`, `∃y(Fy → Ga)`.
Existentializations of `Faa`: `∃xFxx`, `∃xFax`, `∃yFya`.

## Instance

An INSTANCE of `∀αφ` or `∃αφ`:
1. Remove the initial quantifier
2. Uniformly replace ALL occurrences of the unbound variable by a name (the INSTANTIAL NAME)

Examples:
- `∀xFx` has instances `Fa`, `Fb`, `Fc`, ...
- `∃x(Fx & Gx)` has instances `(Fa & Ga)`, `(Fb & Gb)`, ...
- `∃x∀y(Fxy → Gy)` has instances `∀y(Fay → Gy)`, `∀y(Fby → Gy)`, ...
