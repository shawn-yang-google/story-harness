---
name: biconditional-rules
description: Double-Arrow-Introduction (↔I) and Double-Arrow-Elimination (↔E) rules from [LOGIC_FOUNDATION] §1.4. ↔I combines two opposing conditionals into a biconditional; ↔E extracts either conditional direction. Use when constructing or decomposing biconditionals in proofs.
---

# Biconditional Rules (↔I and ↔E)

## Double-Arrow-Introduction (↔I)

Given `φ → ψ` (at line m) and `ψ → φ` (at line n), conclude `φ ↔ ψ`.

- **Annotation**: `m,n ↔I`
- **Assumption set**: Union of sets at m and n
- Order of m and n is irrelevant

```
1  (1)  P → Q    A
2  (2)  Q → P    A
1,2 (3)  P ↔ Q    1,2 ↔I
1,2 (4)  Q ↔ P    1,2 ↔I
```

## Double-Arrow-Elimination (↔E)

Given a biconditional `φ ↔ ψ` (at line m), conclude either `φ → ψ` or `ψ → φ`.

- **Annotation**: `m ↔E`
- **Assumption set**: Same as at m
- **Also known as**: Definition of Biconditional (df.↔)

```
1  (1)  P ↔ Q    A
1  (2)  P → Q    1 ↔E
1  (3)  Q → P    1 ↔E
```

## Combined Usage

To prove a biconditional `φ ↔ ψ`, prove both directions (`φ → ψ` and `ψ → φ`) separately, then combine with ↔I.
