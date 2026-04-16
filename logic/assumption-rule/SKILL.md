---
name: assumption-rule
description: The Assumption rule of proof from [LOGIC_FOUNDATION] §1.4. The first of ten primitive rules allowing any sentence to be assumed at any time in a proof, with the current line number as its assumption set. Use when starting a proof or introducing hypotheses for conditional proof or reductio.
---

# Assumption Rule (A)

## Rule

Assume any sentence at any time.

## Format

- **Annotation**: `A`
- **Assumption set**: `{current line number}`

## Example

```
1  (1)  P v Q    A
2  (2)  R → S    A
3  (3)  -P       A
```

## Notes

- Anything may be assumed at any time
- Some assumptions are useful and some are not
- Assumptions can later be DISCHARGED by →I or RAA
- After discharge, the line number is removed from the assumption set
