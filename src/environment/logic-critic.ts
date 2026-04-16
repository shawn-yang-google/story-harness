import { generateContent, MODELS } from "../llm";

interface LogicCriticResult {
  label: "good" | "bad";
  score: number;
  reasoning: string;
  flaws: string[];
}

/**
 * Tier 4 Logic Consistency Critic.
 *
 * Evaluates narrative passages for internal logical consistency using
 * formal logic concepts as a knowledge base:
 *
 * - Validity & Soundness: Are character arguments valid? Do premises
 *   support conclusions? (arguments-validity-soundness)
 * - Conditional reasoning: Does the narrative correctly handle if-then
 *   chains via modus ponens? (conditional-rules)
 * - Common fallacies: Affirming the consequent, denying the antecedent,
 *   non sequitur, invalid modus tollens (derived-rules)
 * - English-to-logic patterns: Detecting "if...then", "only if", "unless",
 *   "neither...nor" in prose (english-to-sentential-translation)
 * - Counterexample method: Can a character's reasoning be invalidated by
 *   counterexample? (english-counterexamples)
 */
export async function evaluateLogicConsistency(
  text: string,
  targetAudience: string = "general"
): Promise<LogicCriticResult> {
  const prompt = `
You are an expert narrative logic editor trained in formal logic. Your task is to
evaluate a story excerpt for INTERNAL LOGICAL CONSISTENCY.

Target Audience: ${targetAudience}

## Your Knowledge Base (Formal Logic Concepts)

### Validity and Soundness
- An ARGUMENT is valid iff it is impossible for all premises to be true while the
  conclusion is false.
- A SOUND argument is valid AND has all true premises.
- Characters whose reasoning is valid AND based on established facts are logically sound.

### Conditional Reasoning (Modus Ponens / →E)
- VALID: If P then Q. P is true. Therefore Q. (Modus Ponens)
- VALID: If P then Q. Q is false. Therefore P is false. (Modus Tollens)
- INVALID: If P then Q. Q is true. Therefore P. (Affirming the Consequent)
- INVALID: If P then Q. P is false. Therefore Q is false. (Denying the Antecedent)

### English-to-Logic Translation Patterns
- "If φ, then ψ" → φ → ψ (conditional)
- "φ only if ψ" → φ → ψ (the consequent is the "only if" clause)
- "Unless φ, ψ" → ¬φ → ψ (equivalent to φ ∨ ψ)
- "Neither φ nor ψ" → ¬φ ∧ ¬ψ
- "φ provided that ψ" → ψ → φ

### Derived Rules & Common Fallacies
- Hypothetical Syllogism: If P→Q and Q→R, then P→R (VALID chain)
- Disjunctive Syllogism: P∨Q, ¬P, therefore Q (VALID)
- DeMorgan's Laws: ¬(P∨Q) ≡ ¬P∧¬Q; ¬(P∧Q) ≡ ¬P∨¬Q
- Non Sequitur: Conclusion does not follow from premises

### Counterexample Method
If a character's reasoning follows a pattern that can be shown invalid by
substituting real-world facts (e.g., "If LA is in Canada, then LA is in North America;
LA is in North America; therefore LA is in Canada" — obviously false conclusion), flag it.

## What to Check

1. **Contradictions**: Does the passage state X and then assert ¬X without
   justification (character change, revelation, etc.)?
2. **Invalid conditional reasoning**: Does any character or narrator use
   affirming the consequent, denying the antecedent, or other fallacies?
3. **Unsupported conclusions**: Does a character reach a conclusion without
   sufficient premises being established?
4. **Rule violations**: If the narrative establishes a rule ("if X then Y",
   "only X can do Y"), is that rule later violated without explanation?
5. **Consistent character behavior**: Do characters act in accordance with
   their established traits, knowledge, and abilities?

## Output Format

Output valid JSON only with the following schema:
{
  "label": "good" | "bad",
  "score": number,  // 0.0 to 1.0 (1.0 = perfectly consistent)
  "reasoning": string,  // brief explanation referencing specific logic concepts
  "flaws": string[]  // specific flaw tags, empty if good. Use tags like:
    // "contradiction", "affirming_the_consequent", "denying_the_antecedent",
    // "non_sequitur", "unsupported_conclusion", "character_inconsistency",
    // "ignored_established_rule", "invalid_modus_tollens", "plot_hole",
    // "invalid_unless_reasoning", "violated_disjunction"
}

Excerpt to evaluate:
---
${text}
---
`;

  try {
    const response = await generateContent(
      MODELS.CRITIC,
      prompt,
      "You are a JSON-only API. Respond with raw JSON, no markdown blocks."
    );

    // Parse the JSON, cleaning markdown blocks if the model ignored instructions
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
    } else if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();
    }

    const result = JSON.parse(cleanResponse) as LogicCriticResult;

    if (
      !["good", "bad"].includes(result.label) ||
      typeof result.score !== "number" ||
      typeof result.reasoning !== "string" ||
      !Array.isArray(result.flaws)
    ) {
      throw new Error("Invalid schema returned by Logic Critic LLM");
    }

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Logic Critic evaluation failed: ${message}`);
  }
}
