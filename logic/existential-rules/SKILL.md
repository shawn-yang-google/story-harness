---
name: existential-rules
description: Existential Introduction (∃I) and Existential Elimination (∃E) rules from [LOGIC_FOUNDATION] §3.3. ∃I existentializes from a name (no condition). ∃E discharges an assumed instance of an existential, with strict conditions on the instantial name not appearing elsewhere. Use when introducing or eliminating existential quantifiers in predicate logic proofs.
---

# Existential Rules (∃I and ∃E)

## Existential Introduction (∃I)

Given a sentence (at line m) containing a name, conclude an existentialization w.r.t. that name.

- **Condition**: None
- **Annotation**: `m ∃I`
- **Assumption set**: Same as at m
- **Also known as**: Existential Generalization

```
1  (1)  Fa          A
1  (2)  ∃xFx        1 ∃I
```

Can pick up only SOME occurrences: from `Faa` can get `∃xFax` or `∃xFxa` or `∃xFxx`.

## Existential Elimination (∃E)

Given `∃αφ` (at line k), an assumed instance (at line i), and a derived sentence (at line m), conclude that sentence.

- **Annotation**: `k,m ∃E (i)`
- **Assumption set**: All assumptions at m (except i) + all at k

### Condition (CRITICAL)

The instantial name at line i must NOT appear in:
1. The sentence at line k (the existential)
2. The sentence at line m (the conclusion)
3. Any assumption in m's set, OTHER than i itself

### Correct Example

```
1    (1)  ∃xFx            A
2    (2)  Fa              A [for ∃E on 1]
2    (3)  Fa v Ga         2 vI
2    (4)  ∃x(Fx v Gx)     3 ∃I
1    (5)  ∃x(Fx v Gx)     1,4 ∃E (2)   ← 'a' not in (1) or (5)
```

### WRONG Examples

```
1    (1)  ∃xFx      A
2    (2)  Fa        A
1    (3)  Fa        1,2 ∃E (2)    ← WRONG: 'a' appears in conclusion
```

```
1    (1)  ∃xFax     A
2    (2)  Faa       A
2    (3)  ∃xFxx     2 ∃I
1    (4)  ∃xFxx     1,3 ∃E (2)   ← WRONG: 'a' appears in (1)
```

### Rationale

∃xFx says SOMETHING is F but not WHAT. The conditions ensure the conclusion doesn't depend on the specific identity of the witness.
