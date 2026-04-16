import type { LogicGraph, Obligation, Prohibition, Ability } from "../types/logic-graph";
import type { CheckResult } from "./types";

/**
 * DeonticChecker — Verifies deontic logic (obligations & prohibitions) within a LogicGraph.
 *
 * Checks:
 * 1. Broken obligation: fulfilled === false (agent failed duty with no narrative acknowledgment)
 * 2. Prohibition violated without consequence: violated === true AND consequenceAcknowledged === false
 * 3. Ought-implies-can: obligation for an action the agent cannot perform (established: "never")
 */
export function checkDeontic(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkObligations(graph.obligations));
  results.push(...checkProhibitions(graph.prohibitions));
  results.push(...checkOughtImpliesCan(graph.obligations, graph.abilities));

  return results;
}

/**
 * Check 1: Broken Obligations
 *
 * An obligation where fulfilled === false means the agent failed their duty
 * with no narrative acknowledgment. fulfilled === null means unresolved (OK).
 */
function checkObligations(obligations: Obligation[]): CheckResult[] {
  const results: CheckResult[] = [];

  for (const obligation of obligations) {
    if (obligation.fulfilled === false) {
      results.push({
        checker: "DeonticChecker",
        rule: "broken_obligation",
        severity: "error",
        message:
          `Broken obligation: ${obligation.agent} was obligated to ` +
          `"${obligation.must}" (${obligation.source}), but failed without ` +
          `narrative consequence or acknowledgment.`,
        evidence: [obligation.agent, obligation.must],
      });
    }
  }

  return results;
}

/**
 * Check 2: Prohibition Violated Without Consequence
 *
 * A prohibition where violated === true AND consequenceAcknowledged === false
 * means the agent broke a rule and the narrative ignored it.
 */
function checkProhibitions(prohibitions: Prohibition[]): CheckResult[] {
  const results: CheckResult[] = [];

  // Trivial sources (social norms, etiquette) are downgraded to warnings.
  // Plot-critical prohibitions (forensic procedure, law, protocol) remain errors.
  const trivialSources = new Set(["social_norms", "etiquette", "custom", "courtesy"]);

  for (const prohibition of prohibitions) {
    if (prohibition.violated === true && prohibition.consequenceAcknowledged === false) {
      const isTrivial = trivialSources.has(prohibition.source.toLowerCase());
      results.push({
        checker: "DeonticChecker",
        rule: "prohibition_violated",
        severity: isTrivial ? "warning" : "error",
        message:
          `Prohibition violated without consequence: ${prohibition.agent} ` +
          `was forbidden from "${prohibition.mustNot}" (${prohibition.source}), ` +
          `violated the prohibition, but no consequence was acknowledged.`,
        evidence: [prohibition.agent, prohibition.mustNot],
      });
    }
  }

  return results;
}

/**
 * Check 3: Ought-Implies-Can
 *
 * An obligation where the agent's abilities show established: "never" for
 * the obligated action. You cannot obligate the impossible.
 */
function checkOughtImpliesCan(
  obligations: Obligation[],
  abilities: Ability[]
): CheckResult[] {
  const results: CheckResult[] = [];

  for (const obligation of obligations) {
    const impossibleAbility = abilities.find(
      (a) => a.agent === obligation.agent && a.can === obligation.must && a.established === "never"
    );

    if (impossibleAbility) {
      results.push({
        checker: "DeonticChecker",
        rule: "ought_implies_can",
        severity: "warning",
        message:
          `Ought-implies-can violation: ${obligation.agent} is obligated to ` +
          `"${obligation.must}" (${obligation.source}), but their abilities ` +
          `show this action as impossible (established: "never").`,
        evidence: [obligation.agent, obligation.must],
      });
    }
  }

  return results;
}
