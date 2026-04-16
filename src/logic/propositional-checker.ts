import type { LogicGraph, Proposition, ConditionalRule } from "../types/logic-graph";
import type { CheckResult } from "./types";

/**
 * PropositionalChecker — Verifies propositional logic within a LogicGraph.
 *
 * Checks:
 * 1. Contradiction (P ∧ ¬P): same subject+predicate, opposite truth values
 * 2. Broken Conditional: P→Q, P is true, but Q is false (subsumes MP and MT violations — they're the same error)
 * 3. Affirming the Consequent (fallacy): conclusion uses this invalid inference
 * 4. Denying the Antecedent (fallacy): conclusion uses this invalid inference
 * 5. Unsupported Conclusion: conclusion with no premises
 */
export function checkPropositional(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkContradictions(graph.propositions));
  results.push(...checkConditionalRules(graph.propositions, graph.rules));
  results.push(...checkConclusions(graph));

  return results;
}

/**
 * Check 1: Direct Contradictions (P ∧ ¬P)
 * Group propositions by (subject, predicate), find groups with both true and false.
 */
function checkContradictions(propositions: Proposition[]): CheckResult[] {
  const results: CheckResult[] = [];
  const groups = new Map<string, Proposition[]>();

  for (const prop of propositions) {
    const key = `${prop.subject.toLowerCase()}::${prop.predicate.toLowerCase()}`;
    const group = groups.get(key);
    if (group) {
      group.push(prop);
    } else {
      groups.set(key, [prop]);
    }
  }

  for (const [, group] of groups) {
    const trueProps = group.filter(p => p.truth === true);
    const falseProps = group.filter(p => p.truth === false);

    if (trueProps.length > 0 && falseProps.length > 0) {
      // Only flag contradictions where propositions co-occur at the same
      // narrative location. If they're at different locations, this is
      // likely a state change over time (handled by the temporal checker).
      for (const trueP of trueProps) {
        for (const falseP of falseProps) {
          // Skip if both have the exact same text (LLM extraction duplicate)
          if (trueP.text === falseP.text) continue;

          // Check if locations overlap (same paragraph, sentence, or unspecified)
          if (locationsOverlap(trueP.location, falseP.location)) {
            results.push({
              checker: "PropositionalChecker",
              rule: "contradiction",
              severity: "error",
              message:
                `Contradiction (P ∧ ¬P): "${trueP.text}" (${trueP.location}) ` +
                `contradicts "${falseP.text}" (${falseP.location}).`,
              evidence: [trueP.id, falseP.id],
            });
            // Only report one contradiction per group to avoid noise
            break;
          }
        }
        if (results.length > 0 && results[results.length - 1].evidence.includes(trueProps[0].id)) {
          break;
        }
      }
    }
  }

  return results;
}

/**
 * Determines if two location strings refer to the same narrative point.
 * Returns true if they're at the same location (= real contradiction)
 * or if either location is too vague to determine (= flag conservatively).
 *
 * Examples:
 *   "paragraph 1" vs "paragraph 1" → true (same location)
 *   "paragraph 1" vs "paragraph 3" → false (state change)
 *   "sentence 1" vs "sentence 1" → true
 *   "" vs "" → true (no location info, flag conservatively)
 */
function locationsOverlap(a: string, b: string): boolean {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();

  // If either location is empty/unknown, flag conservatively
  if (!la || !lb) return true;

  // Extract paragraph numbers
  const paraA = la.match(/paragraph\s*(\d+)/)?.[1];
  const paraB = lb.match(/paragraph\s*(\d+)/)?.[1];
  if (paraA && paraB) {
    return paraA === paraB;
  }

  // Extract sentence numbers
  const sentA = la.match(/sentence\s*(\d+)/)?.[1];
  const sentB = lb.match(/sentence\s*(\d+)/)?.[1];
  if (sentA && sentB) {
    return sentA === sentB;
  }

  // If locations are identical strings, they overlap
  if (la === lb) return true;

  // Different location formats that we can't compare — flag conservatively
  return true;
}

/**
 * Check 2 & 3: Conditional Rule Validation
 *
 * For each rule P→Q (or P↔Q):
 *   - Modus Ponens: if P is true, Q must be true
 *   - Modus Tollens: if Q is false, P must be false
 *
 * For biconditional (P↔Q), also check the reverse direction (Q→P).
 */
function checkConditionalRules(
  propositions: Proposition[],
  rules: ConditionalRule[]
): CheckResult[] {
  const results: CheckResult[] = [];
  const propById = new Map<string, Proposition>();
  for (const p of propositions) {
    propById.set(p.id, p);
  }

  for (const rule of rules) {
    const antecedent = propById.get(rule.antecedent);
    const consequent = propById.get(rule.consequent);

    // Only check if both propositions exist and are different (P→P is a tautology)
    if (antecedent && consequent && rule.antecedent !== rule.consequent
        && antecedent.text !== consequent.text) {
      // Forward direction: P→Q
      results.push(...checkDirection(antecedent, consequent, rule));

      // Reverse direction for biconditional: Q→P
      if (rule.type === "biconditional") {
        results.push(...checkDirection(consequent, antecedent, rule));
      }
    }
  }

  return results;
}

/**
 * Check one direction of a conditional: antecedent → consequent.
 *
 * Modus Ponens violation: antecedent true, consequent false
 * Modus Tollens violation: consequent false, antecedent true
 *   (Note: MP and MT violations overlap when both conditions are met;
 *    we report MP as the primary violation since MT is the contrapositive.)
 */
function checkDirection(
  antecedent: Proposition,
  consequent: Proposition,
  rule: ConditionalRule
): CheckResult[] {
  const results: CheckResult[] = [];

  // When P is true and Q is false for P→Q, the conditional rule is broken.
  // This is the same violation whether viewed as MP (P,P→Q ⊢ Q but Q is false)
  // or MT (¬Q,P→Q ⊢ ¬P but P is true). Report once as "broken_conditional".
  if (antecedent.truth === true && consequent.truth === false) {
    results.push({
      checker: "PropositionalChecker",
      rule: "broken_conditional",
      severity: "error",
      message:
        `Broken conditional: rule "${rule.id}" states ` +
        `"${antecedent.text}" → "${consequent.text}", ` +
        `but "${antecedent.text}" is true while "${consequent.text}" is false. ` +
        `Either the rule is wrong, or one of the propositions needs to change.`,
      evidence: [antecedent.id, consequent.id, rule.id],
    });
  }

  return results;
}

/**
 * Check 4, 5, 6: Conclusion Validation
 *
 * - Affirming the Consequent: flagged by LLM extraction as inferenceType
 * - Denying the Antecedent: flagged by LLM extraction as inferenceType
 * - Unsupported: conclusion with no premises or marked as "unsupported"
 */
function checkConclusions(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const conclusion of graph.conclusions) {
    // Affirming the Consequent — downgraded to warning.
    // In detective/mystery fiction, abductive reasoning (evidence → hypothesis)
    // has the same logical form as affirming the consequent but is valid
    // investigative reasoning, not a fallacy.
    if (conclusion.inferenceType === "affirming_consequent") {
      results.push({
        checker: "PropositionalChecker",
        rule: "affirming_consequent",
        severity: "warning",
        message:
          `Possible abductive leap at ${conclusion.location}: ` +
          `"${conclusion.claim}". ` +
          `This inference reasons from evidence to hypothesis (P→Q, Q ∴ P), ` +
          `which is acceptable in investigative contexts but not formally valid.`,
        evidence: conclusion.premises,
      });
    }

    // Fallacy: Denying the Antecedent
    if (conclusion.inferenceType === "denying_antecedent") {
      results.push({
        checker: "PropositionalChecker",
        rule: "denying_antecedent",
        severity: "error",
        message:
          `Denying the Antecedent fallacy at ${conclusion.location}: ` +
          `"${conclusion.claim}". ` +
          `From P→Q and ¬P, one cannot conclude ¬Q.`,
        evidence: conclusion.premises,
      });
    }

    // Unsupported conclusion
    if (
      conclusion.inferenceType === "unsupported" ||
      conclusion.premises.length === 0
    ) {
      results.push({
        checker: "PropositionalChecker",
        rule: "unsupported_conclusion",
        severity: "error",
        message:
          `Unsupported conclusion at ${conclusion.location}: ` +
          `"${conclusion.claim}" — no premises provided to justify this claim.`,
        evidence: conclusion.premises,
      });
    }
  }

  return results;
}
