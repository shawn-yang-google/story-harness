---
name: reductio-ad-absurdum
description: Reductio Ad Absurdum (RAA/Indirect Proof) rule from [LOGIC_FOUNDATION] §1.4. Given a sentence and its denial, conclude the denial of any assumption. Discharges the reductio assumption. Also known as Indirect Proof, negation introduction/elimination. Use when deriving contradictions to negate assumptions in proofs.
---

# Reductio Ad Absurdum (RAA)

## Rule

Given both a sentence and its denial (at lines m and n), conclude the denial of any assumption appearing in the proof (at line k).

- **Annotation**: `m,n RAA (k)`
- **Assumption set**: Union of sets at m and n, EXCLUDING k (the discharged assumption)
- The sentence at line k is the REDUCTIO ASSUMPTION
- The conclusion must be a DENIAL of the discharged assumption
- Lines m and n must be denials of each other
- **Also known as**: Indirect Proof (IP), -Introduction, -Elimination

## Examples

```
1    (1)  P → Q    A
2    (2)  -Q       A
3    (3)  P        A           ← reductio assumption
1,3  (4)  Q        1,3 →E
1,2  (5)  -P       2,4 RAA (3) ← discharge assumption 3
```

```
1    (1)  P → -Q   A
2    (2)  Q        A
3    (3)  P        A           ← reductio assumption
1,3  (4)  -Q       2,3 →E
1,2  (5)  -P       2,4 RAA (3)
```

## Vacuous Discharge

RAA allows vacuous discharge — the contradiction need not depend on the reductio assumption. This differs from [LOGIC_CREATOR]'s system.

## Strategy

1. Assume the OPPOSITE of what you want to prove
2. Derive a contradiction (some φ and -φ)
3. Apply RAA to discharge the assumption, concluding its denial
