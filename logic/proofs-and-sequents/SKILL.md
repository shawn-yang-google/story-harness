---
name: proofs-and-sequents
description: Proofs and sequents in sentential logic from [LOGIC_FOUNDATION] §1.4. Defines turnstile, sequent, proof, annotation, assumption set, line number, line of proof, and proof for a given argument. Use when understanding the structure of formal proofs or what constitutes a valid proof.
---

# Proofs and Sequents

## Turnstile

The symbol `⊢` (turnstile). Read as "therefore".

## Sequent

Premises separated by commas, followed by `⊢`, followed by a conclusion.

Example: `(P & Q) → R, -R & P ⊢ -Q`

A sequent is a convenient way to display an argument in formal notation.

## Double Turnstile

`⊣⊢` represents bidirectional provability. `φ ⊣⊢ ψ` means both `φ ⊢ ψ` and `ψ ⊢ φ`. Two separate proofs required.

## Proof

A sequence of lines containing sentences. Each sentence is either:
- An assumption, or
- The result of applying a rule of proof to earlier sentences

## Line of a Proof

Each line has four components:
1. **Assumption set** (far left): The set of assumptions on which the sentence depends
2. **Line number** (left): Current line number
3. **Sentence** (center): The formula
4. **Annotation** (right): Which rule was applied and to which earlier lines

Example:
```
1,2  (7)  P → Q & R    6 →I (3)
│         │             │
assumption sentence     annotation
set                     (rule applied)
```

## Proof for a Given Argument

A proof whose last sentence is the argument's conclusion depending on nothing other than the argument's premises. The conclusion need not depend on ALL premises.
