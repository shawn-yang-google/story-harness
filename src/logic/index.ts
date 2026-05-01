/**
 * Logic Verification Pipeline — Barrel Export
 *
 * Aggregates all 9 checker modules into a single `runAllCheckers()` function.
 * Each checker operates on the LogicGraph independently and returns CheckResult[].
 */

export type { CheckResult } from "./types";
export { checkPropositional } from "./propositional-checker";
export { checkTemporal } from "./temporal-checker";
export { checkEpistemic } from "./epistemic-checker";
export { checkDeontic } from "./deontic-checker";
export { checkEntity } from "./entity-checker";
export { checkCausal } from "./causal-checker";
export { checkSoundness } from "./soundness-checker";
export { checkWorldKnowledge } from "./world-knowledge-checker";
export { checkJustification } from "./justification-checker";

import type { LogicGraph } from "../types/logic-graph";
import type { HarnessContext } from "../types";
import type { CheckResult } from "./types";
import { checkPropositional } from "./propositional-checker";
import { checkTemporal } from "./temporal-checker";
import { checkEpistemic } from "./epistemic-checker";
import { checkDeontic } from "./deontic-checker";
import { checkEntity } from "./entity-checker";
import { checkCausal } from "./causal-checker";
import { checkSoundness } from "./soundness-checker";
import { checkWorldKnowledge } from "./world-knowledge-checker";
import { checkJustification } from "./justification-checker";

/**
 * Runs logic checker modules against a LogicGraph.
 *
 * If context.personaConfig is set, only runs checkers that are enabled
 * in personaConfig.enabledCheckers. Otherwise runs all 9 checkers.
 *
 * Returns the combined array of all CheckResults (errors + warnings).
 * The caller can filter by severity to determine pass/fail.
 */
export function runAllCheckers(
  graph: LogicGraph,
  context: HarnessContext
): CheckResult[] {
  const flags = context.personaConfig?.enabledCheckers;
  const results: CheckResult[] = [];

  if (!flags || flags.propositional) results.push(...checkPropositional(graph));
  if (!flags || flags.temporal)      results.push(...checkTemporal(graph));
  if (!flags || flags.epistemic)     results.push(...checkEpistemic(graph));
  if (!flags || flags.deontic)       results.push(...checkDeontic(graph));
  if (!flags || flags.entity)        results.push(...checkEntity(graph));
  if (!flags || flags.causal)        results.push(...checkCausal(graph, context));
  if (!flags || flags.soundness)     results.push(...checkSoundness(graph));
  if (!flags || flags.worldKnowledge) results.push(...checkWorldKnowledge(graph));
  if (!flags || flags.justification) results.push(...checkJustification(graph));

  return results;
}
