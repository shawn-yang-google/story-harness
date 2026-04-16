---
name: universal-rules
description: Universal Elimination (∀E) and Universal Introduction (∀I) rules from [LOGIC_FOUNDATION] §3.3. ∀E instantiates a universal to any name (no condition). ∀I generalizes from a name to a universal, with the condition that the name must not appear in any assumption in the assumption set. Use when instantiating or generalizing universal quantifiers in predicate logic proofs.
---

# Universal Rules (∀E and ∀I)

## Universal Elimination (∀E)

Given a universally quantified sentence (at line m), conclude any instance of it.

- **Condition**: None
- **Annotation**: `m ∀E`
- **Assumption set**: Same as at m
- **Also known as**: Universal Instantiation

```
1  (1)  ∀xFx        A
1  (2)  Fa          1 ∀E
1  (3)  Fb          1 ∀E
```

## Universal Introduction (∀I)

Given a sentence (at line m) containing a name, conclude a universalization w.r.t. that name.

- **Condition**: The name must NOT appear in any assumption in m's assumption set
- **Annotation**: `m ∀I`
- **Assumption set**: Same as at m
- **Also known as**: Universal Generalization

### Correct Example

```
1    (1)  ∀x(Fx → Gx)    A
1    (2)  Fa → Ga         1 ∀E
3    (3)  ∀xFx            A
3    (4)  Fa              3 ∀E
1,3  (5)  Ga              2,4 →E
1,3  (6)  ∀xGx            5 ∀I    ← OK: 'a' not in assumptions 1 or 3
```

### WRONG Example (Condition Violated)

```
1    (1)  ∀x(Fx → Gx)    A
2    (2)  Fa              A       ← 'a' appears here!
1    (3)  Fa → Ga         1 ∀E
1,2  (4)  Ga              2,3 →E
1,2  (5)  ∀xGx            4 ∀I    ← WRONG: 'a' is in assumption 2
```

### Rationale

If we prove `Fa` from assumptions that say nothing about `a` specifically, then the proof works for ANY name — justifying `∀xFx`.
