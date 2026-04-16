---
name: countermodels-with-identity
description: Finite countermodels with identity from [LOGIC_FOUNDATION] §4.4. Adds name extensions (mapping object-language names to universe objects) to interpretations. Uses italicized metalanguage names (each object gets one). Identity a=β is true iff both names have same extension. Use when constructing countermodels for arguments involving the identity symbol.
---

# Countermodels with Identity

## Name Extension

A NAME EXTENSION assigns a single object from the universe to each name in the sentences.

## Object Language vs Metalanguage

- **Object language**: The formal language being studied (names: a, b, c, ...)
- **Metalanguage**: The language we use to specify interpretations (italicized names)
- Each object has exactly ONE metalinguistic name
- Multiple object-language names CAN map to the same object

## Interpretation (with Identity)

1. A finite universe
2. Extensions for all predicates
3. Extensions for all names (each maps to one object in the universe)
4. Truth-value specifications for sentence letters

## Identity Truth Condition

`a=β` is TRUE iff the extension of `a` equals the extension of `β` (both denote the same object, i.e., same metalinguistic name).

## Expansion with Identity

Replace object-language names with metalinguistic equivalents BEFORE expanding.

Example: `U: {c, d}`, name extensions `a: c`, `b: c`

`∀x(Fxc → x≠c)` expands to `(Fcc → c≠c) & (Fdc → d≠c)`
- `c≠c` is FALSE (same metalinguistic name)
- `d≠c` is TRUE (different metalinguistic names)

## Example Countermodel

`a=b, c=d ⊢ a=c` — INVALID

`U: {m, n}`, `a: m`, `b: m`, `c: n`, `d: n`
- Premises: `m=m` (T) and `n=n` (T) ✓
- Conclusion: `m=n` — **F** ✗
