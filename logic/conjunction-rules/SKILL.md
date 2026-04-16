---
name: conjunction-rules
description: Ampersand-Introduction (&I) and Ampersand-Elimination (&E) rules from [LOGIC_FOUNDATION] §1.4. &I combines two sentences into a conjunction; &E extracts either conjunct. Also known as Conjunction/Simplification. Use when constructing or decomposing conjunctions in proofs.
---

# Conjunction Rules (&I and &E)

## Ampersand-Introduction (&I)

Given two sentences (at lines m and n), conclude a conjunction of them.

- **Annotation**: `m,n &I`
- **Assumption set**: Union of sets at m and n
- **Also known as**: Conjunction (CONJ)
- Order of m,n is irrelevant; m and n may be the same line

```
1  (1)  P        A
2  (2)  Q        A
1,2 (3)  P & Q    1,2 &I
1,2 (4)  Q & P    1,2 &I
1  (5)  P & P    1,1 &I
```

## Ampersand-Elimination (&E)

Given a conjunction (at line m), conclude either conjunct.

- **Annotation**: `m &E`
- **Assumption set**: Same as at m
- **Also known as**: Simplification (S)

```
1  (1)  P & Q    A
1  (2)  Q        1 &E
1  (3)  P        1 &E
```
