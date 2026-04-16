---
name: finite-interpretations
description: Finite interpretations from [LOGIC_FOUNDATION] §4.1. An interpretation consists of a finite universe (domain), predicate extensions (subsets of the universe), and truth-value specifications for sentence letters. Used to evaluate truth values of sentences. Use when specifying models or domains for predicate logic sentences.
---

# Finite Interpretations

## Definition

A FINITE INTERPRETATION for symbolic sentences consists of:

1. **Universe (Domain)**: A finite set of objects (≥1 element). E.g., `U: {a, b, c}`
2. **Predicate Extensions**: For each predicate, a (possibly empty) subset of the universe. E.g., `F: {a, b}`, `G: {b}`
3. **Truth-Value Specifications**: Each sentence letter paired with True or False. E.g., `P is False`

## Evaluation Rules

Given an interpretation:

1. **Quantifiers**: Construct expansions (see universal-existential-expansions), then evaluate the quantifier-free result
2. **Sentence letters**: Have truth values directly from the interpretation
3. **Predicates**: `Fa` is true iff object `a` is in the extension of `F`
4. **Connectives**: Standard truth-functional rules

## Example

`U: {a, b, c}`, `F: {a, b}`, `G: {b}`, `P is False`

Evaluate `∀x(Fx v -Gx) → (P v ∃x(Gx & -Fx))`:
- Antecedent: Everything is F or not-G. a: F✓. b: F✓. c: not-G✓. TRUE.
- Consequent: P is F. ∃x(Gx & -Fx): b is G but also F, so no. FALSE.
- Conditional: T → F = **FALSE**.
