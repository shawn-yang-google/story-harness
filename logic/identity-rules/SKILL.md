---
name: identity-rules
description: Identity Introduction (=I) and Identity Elimination (=E/Leibniz's Law) rules from [LOGIC_FOUNDATION] §3.3. =I asserts a=a with empty assumptions. =E substitutes names given an identity statement. =E fails in intensional contexts (belief reports). Use when working with identity/equality in predicate logic proofs.
---

# Identity Rules (=I and =E)

## Identity Introduction (=I)

Conclude any sentence of the form `a=a`.

- **Condition**: None
- **Annotation**: `=I`
- **Assumption set**: Empty (like a theorem)

```
   (1)  c=c    =I
```

## Identity Elimination (=E)

Given φ containing name α (at line m) and identity `α=β` or `β=α` (at line n), conclude the result of replacing ≥1 occurrence of α in φ with β.

- **Condition**: None
- **Annotation**: `m,n =E`
- **Assumption set**: Union of sets at m and n
- **Also known as**: Leibniz's Law, Substitutivity of Identity

### Examples

```
1    (1)  Fa          A
2    (2)  a=b         A
1,2  (3)  Fb          1,2 =E
```

```
1    (1)  Fa & Ga     A
2    (2)  b=a         A
1,2  (3)  Fb & Ga     1,2 =E    ← partial replacement OK
1,2  (4)  Fb & Gb     1,2 =E    ← full replacement OK
```

### Global Replacement

```
1    (1)  ∀x(Fxa → x=a)    A
2    (2)  Fba               A
1    (3)  Fba → b=a         1 ∀E
1,2  (4)  b=a               2,3 →E
1,2  (5)  ∀x(Fxb → x=b)    1,4 =E
```

## Intensional Context Warning

=E is NOT valid in intensional contexts (e.g., belief reports). "Frank believes Twain is a novelist" and "Twain=Clemens" does NOT entail "Frank believes Clemens is a novelist." The formal language here covers only extensional contexts.
