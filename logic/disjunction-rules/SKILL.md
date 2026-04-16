---
name: disjunction-rules
description: Wedge-Introduction (vI) and Wedge-Elimination (vE/Disjunctive Syllogism) rules from [LOGIC_FOUNDATION] §1.4. vI adds any disjunct to a known sentence; vE eliminates a disjunct given its denial. Use when constructing or decomposing disjunctions in proofs.
---

# Disjunction Rules (vI and vE)

## Wedge-Introduction (vI)

Given a sentence (at line m), conclude any disjunction having it as a disjunct.

- **Annotation**: `m vI`
- **Assumption set**: Same as at m
- **Also known as**: Addition (ADD)

```
1  (1)  P              A
1  (2)  P v Q          1 vI
1  (3)  (R ↔ -T) v P   1 vI
```

The added disjunct can be ANY wff — it need not appear elsewhere in the proof.

## Wedge-Elimination (vE)

Given a disjunction (at line m) and a denial of one disjunct (at line n), conclude the other disjunct.

- **Annotation**: `m,n vE`
- **Assumption set**: Union of sets at m and n
- **Also known as**: Modus Tollendo Ponens (MTP), Disjunctive Syllogism (DS)

```
1  (1)  P v Q    A
2  (2)  -P       A
1,2 (3)  Q        1,2 vE
```

Order of m and n is irrelevant. This replaces [LOGIC_CREATOR]'s more complex v-Elimination rule.
