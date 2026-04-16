---
name: arguments-validity-soundness
description: Basic logical notions from [LOGIC_FOUNDATION] §1.1. Defines argument (premises + conclusion), validity (impossible for all premises true and conclusion false), entailment, and soundness (valid + all premises true). Use when reasoning about whether arguments are valid, sound, or what entailment means.
---

# Arguments, Validity, and Soundness

## Definitions

- **Argument**: A pair of (1) a set of sentences called PREMISES and (2) a sentence called the CONCLUSION. The premise set can be empty.
- **Valid**: An argument is valid iff it is impossible for all premises to be true while the conclusion is false. True premises guarantee a true conclusion.
- **Entailment**: When an argument is valid, its premises ENTAIL its conclusion.
- **Sound**: An argument is sound iff it is valid AND all its premises are true.

## Key Facts

- All sound arguments have true conclusions
- An argument may be unsound in two ways: invalid, or has ≥1 false premise
- A valid argument CAN have false premises and/or a false conclusion
- A valid argument CANNOT have all true premises with a false conclusion
- Some valid arguments have no premises (the premise set is empty)
- Validity concerns the *relationship* between premises and conclusion, not their individual truth values

## Exercise 1.1 (True/False)

| # | Statement | Answer |
|---|-----------|--------|
| i | Every premise of a valid argument is true | **False** |
| ii | Every invalid argument has a false conclusion | **False** |
| iii | Every valid argument has exactly two premises | **False** |
| iv | Some valid arguments have false conclusions | **True** |
| v | Some valid arguments have a false conclusion despite having premises that are all true | **False** |
| vi | A sound argument cannot have a false conclusion | **True** |
| vii | Some sound arguments are invalid | **False** |
| viii | Some unsound arguments have true premises | **True** |
| ix | Premises of sound arguments entail their conclusions | **True** |
| x | If an argument has true premises and a true conclusion then it is sound | **False** |
