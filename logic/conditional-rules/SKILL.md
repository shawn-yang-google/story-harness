---
name: conditional-rules
description: Arrow-Introduction (→I/Conditional Proof) and Arrow-Elimination (→E/Modus Ponens) rules from [LOGIC_FOUNDATION] §1.4. →I discharges an assumed antecedent to form a conditional; →E detaches the consequent given the antecedent. Use when constructing conditionals or applying modus ponens in proofs.
---

# Conditional Rules (→I and →E)

## Arrow-Introduction (→I)

Given a sentence (at line n), conclude a conditional having it as consequent, whose antecedent was assumed at line m.

- **Annotation**: `n →I (m)`
- **Assumption set**: Everything in set at n, EXCLUDING m (the discharged assumption)
- **Also known as**: Conditional Proof (CP)
- Lines m and n may be the same

```
1  (1)  -P v Q    A
2  (2)  P         A
1,2 (3)  Q         1,2 vE
1  (4)  P → Q     3 →I (2)
```

The antecedent (line m) must be present as an assumption. We DISCHARGE this assumption — removing it from the dependency set.

## Arrow-Elimination (→E)

Given a conditional (at line m) and its antecedent (at line n), conclude the consequent.

- **Annotation**: `m,n →E`
- **Assumption set**: Union of sets at m and n
- **Also known as**: Modus Ponendo Ponens (MPP), Modus Ponens (MP), Detachment

```
1  (1)  P → Q    A
2  (2)  P        A
1,2 (3)  Q        1,2 →E
```

Order of m and n is irrelevant.

## Vacuous Discharge

This system allows vacuous discharge — →I can discharge an assumption even if the consequent doesn't depend on it. This yields shorter proofs than [LOGIC_CREATOR]'s system.

```
1  (1)  P    A
2  (2)  Q    A
1  (3)  Q → P    1 →I (2)
```

Line 1 (P) does not depend on assumption 2, but we still discharge 2.
