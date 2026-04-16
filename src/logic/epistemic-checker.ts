import type { LogicGraph, KnowledgeEntry, Ability, TemporalEvent } from "../types/logic-graph";
import type { CheckResult } from "./types";

/**
 * EpistemicChecker — Verifies epistemic logic (knowledge & abilities) within a LogicGraph.
 *
 * Checks:
 * 1. Psychic Knowledge: KnowledgeEntry with how: "unexplained" (no explained source)
 * 2. Knowledge Before Learning: agent uses knowledge before the learning event
 * 3. Unestablished Ability: Ability with established: "never" that the agent exercises
 */
export function checkEpistemic(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkPsychicKnowledge(graph.knowledge));
  results.push(...checkKnowledgeBeforeLearning(graph.knowledge, graph.events));
  results.push(...checkUnestablishedAbilities(graph.abilities, graph.events));

  return results;
}

/**
 * Check 1: Psychic Knowledge
 * Any KnowledgeEntry with how: "unexplained" is an error — the agent acts on
 * information with no explained source.
 */
function checkPsychicKnowledge(knowledge: KnowledgeEntry[]): CheckResult[] {
  const results: CheckResult[] = [];

  for (const entry of knowledge) {
    if (entry.how === "unexplained") {
      results.push({
        checker: "EpistemicChecker",
        rule: "psychic_knowledge",
        severity: "error",
        message:
          `Psychic knowledge: "${entry.agent}" knows "${entry.knows}" ` +
          `but the source is unexplained. ` +
          `The agent acts on information with no narrative justification.`,
        evidence: [entry.since],
      });
    }
  }

  return results;
}

/**
 * Check 2: Knowledge Before Learning
 * If a KnowledgeEntry's `since` event has a higher order than an event where
 * the agent uses that knowledge, flag it.
 *
 * Cross-references knowledge entries with events to detect temporal violations:
 * build an event order map, then check if any event by the same agent that
 * references the knowledge content occurs before the learning event.
 */
function checkKnowledgeBeforeLearning(
  knowledge: KnowledgeEntry[],
  events: TemporalEvent[]
): CheckResult[] {
  const results: CheckResult[] = [];

  // Build event lookup: id → TemporalEvent
  const eventById = new Map<string, TemporalEvent>();
  for (const event of events) {
    eventById.set(event.id, event);
  }

  for (const entry of knowledge) {
    // Skip unexplained knowledge — already caught by psychic check
    if (entry.how === "unexplained") continue;

    const learningEvent = eventById.get(entry.since);
    if (!learningEvent) continue;

    // Find events by the same agent that reference the knowledge content
    // and occur before the learning event
    for (const event of events) {
      if (event.agent !== entry.agent) continue;
      if (event.id === entry.since) continue;

      // Check if the event description references the knowledge
      const knowledgeTerms = entry.knows.toLowerCase();
      const eventDesc = event.description.toLowerCase();

      if (eventDesc.includes(knowledgeTerms) && event.order < learningEvent.order) {
        results.push({
          checker: "EpistemicChecker",
          rule: "knowledge_before_learning",
          severity: "error",
          message:
            `Knowledge before learning: "${entry.agent}" uses knowledge of ` +
            `"${entry.knows}" at event "${event.id}" (order ${event.order}), ` +
            `but only learns it at event "${entry.since}" (order ${learningEvent.order}).`,
          evidence: [event.id, entry.since],
        });
      }
    }
  }

  return results;
}

/**
 * Check 3: Unestablished Ability
 * Any Ability with established: "never" where the agent uses that ability
 * in an event is an error.
 *
 * Cross-references abilities with events: checks if any event by the same agent
 * references the ability in its description.
 */
function checkUnestablishedAbilities(
  abilities: Ability[],
  events: TemporalEvent[]
): CheckResult[] {
  const results: CheckResult[] = [];

  for (const ability of abilities) {
    if (ability.established !== "never") continue;

    // Find events where this agent exercises the ability
    const abilityTerms = ability.can.toLowerCase();

    for (const event of events) {
      if (event.agent !== ability.agent) continue;

      const eventDesc = event.description.toLowerCase();
      if (eventDesc.includes(abilityTerms)) {
        results.push({
          checker: "EpistemicChecker",
          rule: "unestablished_ability",
          severity: "error",
          message:
            `Unestablished ability: "${ability.agent}" uses ability ` +
            `"${ability.can}" at event "${event.id}", ` +
            `but this ability was never established in the narrative.`,
          evidence: [event.id],
        });
      }
    }
  }

  return results;
}
