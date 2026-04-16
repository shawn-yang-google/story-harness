---
name: indirect-truth-tables
description: Indirect truth tables (ITTs) from [LOGIC_FOUNDATION] §2.4. A shorter method to test validity by attempting to construct an invalidating assignment directly rather than building the full truth table. Use when efficiently checking validity of sequents without constructing complete truth tables.
---

# Indirect Truth Tables (ITTs)

## Purpose

A shorter alternative to full TTs for finding invalidating assignments.

## Procedure

1. **Start with the conclusion**: Determine what assignment(s) make it FALSE
2. **Check premises**: For each such assignment, see if ALL premises can be TRUE
3. **Result**:
   - No valid assignment found → **VALID** (no invalidating assignment exists)
   - Assignment found → **INVALID** (that assignment invalidates)

## Example: Valid Case

`P → Q, -R → -Q ⊢ -R → -P`

Conclusion `-R → -P` is false only when: -R is T (R=F) and -P is F (P=T).

With R=F, P=T: Premise 1 `P → Q` needs Q=T. Premise 2 `-R → -Q` needs -Q=T, so Q=F. **Contradiction** → no invalidating assignment → **VALID**.

## Example: Invalid Case

`P & -Q, Q → R ⊢ P → R`

Conclusion `P → R` false when P=T, R=F. Premise 1: Q=F works. Premise 2: `F → F` = T. ✓

Invalidating assignment: P=T, Q=F, R=F → **INVALID**.

## Multiple Attempts

Sometimes the first attempt fails (a premise comes out false). Try other ways to make the conclusion false before concluding validity.

Example: For `P & Q` as conclusion, try: (T,F), (F,T), and (F,F).
