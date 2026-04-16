import type { NarrativeGraph } from "../types/narrative-graph";
import type { CheckResult } from "../logic/types";

/**
 * NarrativeChecker — Verifies narrative craft within a NarrativeGraph.
 *
 * Checks (based on [MASTER_THEORIST]'s story principles):
 * 1. non_turning_scene — Scene with no value change
 * 2. flat_stakes — Stakes don't escalate
 * 3. no_protagonist_goal — Protagonist lacks a clear goal
 * 4. no_obstacle — Goal present but no obstacle blocking it
 * 5. didactic_theme — Theme stated directly instead of shown
 * 6. no_conflict — No conflict present in the narrative
 * 7. no_counter_premise — One-sided argument without genuine opposition
 */
export function checkNarrative(graph: NarrativeGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkTurningValues(graph));
  results.push(...checkStakes(graph));
  results.push(...checkProtagonistDesires(graph));
  results.push(...checkThemeDeliveries(graph));
  results.push(...checkConflicts(graph));
  results.push(...checkPremiseCounterPremise(graph));

  return results;
}

/**
 * Check 1: Non-Turning Scenes
 * A scene where the value doesn't change means nothing happens narratively.
 */
function checkTurningValues(graph: NarrativeGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const tv of graph.turningValues) {
    if (!tv.changed) {
      results.push({
        checker: "NarrativeChecker",
        rule: "non_turning_scene",
        severity: "error",
        message:
          `Scene "${tv.scene}" at ${tv.location}: ` +
          `scene has no value change — nothing happens ` +
          `(value stays "${tv.valueBefore}").`,
        evidence: [tv.location],
      });
    }
  }

  return results;
}

/**
 * Check 2: Flat Stakes
 * If there are multiple stakes but none escalate, the story feels static.
 */
function checkStakes(graph: NarrativeGraph): CheckResult[] {
  const results: CheckResult[] = [];

  if (
    graph.stakes.length > 1 &&
    !graph.stakes.some(s => s.escalatesFromPrevious)
  ) {
    results.push({
      checker: "NarrativeChecker",
      rule: "flat_stakes",
      severity: "warning",
      message:
        "Stakes don't escalate — none of the stake entries build on previous ones. " +
        "The narrative risks feeling static without rising tension.",
      evidence: graph.stakes.map(s => s.description),
    });
  }

  return results;
}

/**
 * Check 3 & 4: Protagonist Desires
 * 3. no_protagonist_goal — hasGoal is false
 * 4. no_obstacle — hasGoal is true but obstaclePresent is false
 */
function checkProtagonistDesires(graph: NarrativeGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const desire of graph.protagonistDesires) {
    if (!desire.hasGoal) {
      results.push({
        checker: "NarrativeChecker",
        rule: "no_protagonist_goal",
        severity: "error",
        message:
          `"${desire.character}" lacks clear goal — ` +
          `protagonist without desire cannot drive the story.`,
        evidence: [desire.character],
      });
    } else if (!desire.obstaclePresent) {
      results.push({
        checker: "NarrativeChecker",
        rule: "no_obstacle",
        severity: "warning",
        message:
          `"${desire.character}" wants "${desire.goal}" but faces no obstacle — ` +
          `goal without obstacle = no tension.`,
        evidence: [desire.character],
      });
    }
  }

  return results;
}

/**
 * Check 5: Didactic Theme
 * Theme stated directly instead of shown through story is heavy-handed.
 */
function checkThemeDeliveries(graph: NarrativeGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const td of graph.themeDeliveries) {
    if (td.delivery === "didactic") {
      results.push({
        checker: "NarrativeChecker",
        rule: "didactic_theme",
        severity: "error",
        message:
          `Theme "${td.theme}" at ${td.location}: ` +
          `theme stated directly instead of shown through story.`,
        evidence: [td.location],
      });
    }
  }

  return results;
}

/**
 * Check 6: No Conflict
 * If all conflicts have type "none" or the array is empty, there's no drama.
 */
function checkConflicts(graph: NarrativeGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const hasRealConflict = graph.conflicts.some(c => c.type !== "none");

  if (!hasRealConflict) {
    results.push({
      checker: "NarrativeChecker",
      rule: "no_conflict",
      severity: "error",
      message:
        "No conflict present — story without conflict has no drama. " +
        "Every scene needs some form of inner, personal, or extra-personal conflict.",
      evidence: [],
    });
  }

  return results;
}

/**
 * Check 7: No Counter-Premise
 * A story's argument needs genuine opposition to be compelling.
 */
function checkPremiseCounterPremise(graph: NarrativeGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const pcp of graph.premiseCounterPremise) {
    if (!pcp.counterPresent) {
      results.push({
        checker: "NarrativeChecker",
        rule: "no_counter_premise",
        severity: "warning",
        message:
          `Premise "${pcp.premise}": one-sided argument without genuine opposition — ` +
          `the story's thesis is never truly challenged.`,
        evidence: [pcp.premise],
      });
    }
  }

  return results;
}
