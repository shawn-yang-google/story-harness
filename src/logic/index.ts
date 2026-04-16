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
 * Runs all 9 logic checker modules against a LogicGraph.
 *
 * Returns the combined array of all CheckResults (errors + warnings).
 * The caller can filter by severity to determine pass/fail.
 */
export function runAllCheckers(
  graph: LogicGraph,
  context: HarnessContext
): CheckResult[] {
  return [
    ...checkPropositional(graph),
    ...checkTemporal(graph),
    ...checkEpistemic(graph),
    ...checkDeontic(graph),
    ...checkEntity(graph),
    ...checkCausal(graph, context),
    ...checkSoundness(graph),
    ...checkWorldKnowledge(graph),
    ...checkJustification(graph),
  ];
}
