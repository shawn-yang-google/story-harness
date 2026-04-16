---
name: truth-tables-for-sentences
description: Truth tables for sentences from [LOGIC_FOUNDATION] §2.1. Defines truth values (T/F), truth-functional connectives, and the truth tables for negation, conjunction, disjunction, conditional, and biconditional. Shows how to construct TTs for compound wffs. Use when evaluating truth values of compound logical expressions.
---

# Truth Tables for Sentences

## Truth Values

T (True) and F (False).

## Truth Functions

### Negation

| φ | -φ |
|---|-----|
| T | F |
| F | T |

### Binary Connectives

| φ | ψ | φ & ψ | φ v ψ | φ → ψ | φ ↔ ψ |
|---|---|-------|-------|-------|-------|
| T | T | T | T | T | T |
| T | F | F | T | F | F |
| F | T | F | T | T | F |
| F | F | F | F | T | T |

### Key Observations

- **&**: True only when BOTH are true
- **v**: False only when BOTH are false
- **→**: False only when antecedent T and consequent F. False antecedent → always true. True consequent → always true.
- **↔**: True when both sides have SAME truth value

## Constructing TTs

Build columns from innermost components outward, placing each under its main connective.

All sentential connectives are TRUTH-FUNCTIONAL: the truth value of a compound is determined entirely by the truth values of its components.
