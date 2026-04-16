---
name: truth-tables-for-sequents
description: Truth tables for sequents from [LOGIC_FOUNDATION] §2.2. Shows how to determine validity/invalidity of sequents using truth tables, defines invalidating assignment, covers number of TT lines (2^n), and incompatible premises. Use when checking argument validity via exhaustive truth value enumeration.
---

# Truth Tables for Sequents

## Method

Construct a single TT for the whole sequent (premises and conclusion).

- **Valid**: NO line exists where all premises are T and conclusion is F
- **Invalid**: AT LEAST ONE line exists where all premises are T and conclusion is F

## Invalidating Assignment

An assignment of T/F to sentence letters making all premises true and the conclusion false. Read directly from the TT row showing invalidity.

## Number of Lines

With n sentence letters, the TT has **2ⁿ** lines.

| Letters | Lines |
|---------|-------|
| 2 | 4 |
| 3 | 8 |
| 4 | 16 |
| 5 | 32 |

## Special Case: Incompatible Premises

If NO line makes all premises true simultaneously, the sequent is valid (vacuously). There can be no line with all premises true and conclusion false because there's no line with all premises true.

Example: `P → Q, Q → R, P & -R ⊢ S` — no assignment satisfies all three premises, so it's valid.
