import type { LogicGraph, StateChange, TemporalEvent, WorldRule } from "../types/logic-graph";
import type { CheckResult } from "./types";

/**
 * WorldKnowledgeChecker — Verifies statements against common-sense physical reality.
 *
 * Checks:
 * 1. Instant state transitions: physically implausible instant changes (weather, injury, temperature)
 * 2. Physical impossibility: actions/descriptions that defy basic physics
 * 3. Missing causal mechanism: state changes that occur without any causal event
 */
export function checkWorldKnowledge(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const eventById = new Map<string, TemporalEvent>();
  for (const e of graph.events) {
    eventById.set(e.id, e);
  }

  results.push(...checkInstantTransitions(graph.stateChanges, eventById, graph.worldRules));
  results.push(...checkPhysicalImpossibility(graph));
  results.push(...checkMissingCausalMechanism(graph.stateChanges, eventById));

  return results;
}

/**
 * Physical attribute categories that cannot change instantly in the real world.
 */
const PHYSICAL_ATTRIBUTES = new Set([
  "condition", "weather", "injury", "health", "temperature",
  "wound", "damage", "physical_state",
]);

/**
 * Implausible instant transition patterns.
 * Each entry: [fromPattern, toPattern] — if a state change matches both,
 * it's flagged as physically implausible.
 */
const IMPLAUSIBLE_TRANSITIONS: Array<{ from: RegExp; to: RegExp; description: string }> = [
  // Weather
  { from: /rain|storm|snow|cloud|overcast/, to: /sun|clear|bright/, description: "weather" },
  { from: /sun|clear|bright/, to: /rain|storm|snow/, description: "weather" },
  // Injury/healing
  { from: /broken|wounded|injured|hurt|damaged/, to: /heal|healthy|fixed|mended|whole/, description: "injury" },
  { from: /sick|ill|poisoned/, to: /healthy|cured|well/, description: "illness" },
  // Temperature
  { from: /freezing|cold|frozen|icy/, to: /hot|boiling|warm|burning/, description: "temperature" },
  { from: /hot|boiling|burning/, to: /freezing|cold|frozen|icy/, description: "temperature" },
];

/**
 * Patterns that indicate instant/sudden change in event descriptions.
 */
const INSTANT_INDICATORS = /\b(instant|sudden|immediate|abrupt|moment|blink|once|right away)\w*\b/i;

/**
 * Physical impossibility patterns in text.
 */
const IMPOSSIBILITY_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /rain\s+(stopped|ended|ceased)\s+instant/i, description: "Rain cannot stop instantly" },
  { pattern: /sun\s+came\s+out\s+instant/i, description: "Sun cannot appear instantly after rain" },
  { pattern: /wound[s]?\s+(healed|closed|mended)\s+instant/i, description: "Wounds cannot heal instantly" },
  { pattern: /broken\s+\w+\s+healed\s+instant/i, description: "Broken bones cannot heal instantly" },
  { pattern: /healed?\s+instant/i, description: "Healing cannot occur instantly" },
  { pattern: /instantly\s+(healed|mended|cured|fixed)/i, description: "Instant healing is physically impossible" },
  { pattern: /rain\s+stopped\s+instantly/i, description: "Rain cannot stop instantly" },
  { pattern: /temperature\s+(changed|shifted|went)\s+instant/i, description: "Temperature cannot change instantly" },
  { pattern: /freezing\s+to\s+(hot|boiling)/i, description: "Temperature cannot jump from freezing to hot" },
];

/**
 * Check 1: Instant state transitions.
 *
 * For each state change in a physical attribute category, check if:
 * - The from→to transition matches an implausible pattern
 * - The associated event description contains instant/sudden indicators
 * - No world rule exists that would justify the instant transition
 */
function checkInstantTransitions(
  stateChanges: StateChange[],
  eventById: Map<string, TemporalEvent>,
  worldRules: WorldRule[]
): CheckResult[] {
  const results: CheckResult[] = [];

  for (const sc of stateChanges) {
    const attr = sc.attribute.toLowerCase();

    // Only check physical attributes
    if (!PHYSICAL_ATTRIBUTES.has(attr)) continue;

    const fromStr = String(sc.from).toLowerCase();
    const toStr = String(sc.to).toLowerCase();

    // Check against implausible transition patterns
    for (const transition of IMPLAUSIBLE_TRANSITIONS) {
      if (transition.from.test(fromStr) && transition.to.test(toStr)) {
        // Check if the event description indicates instant change
        const event = eventById.get(sc.atEvent);
        const eventDesc = event?.description?.toLowerCase() ?? "";
        const isInstant = INSTANT_INDICATORS.test(eventDesc);

        // Check if a world rule justifies this transition
        const justified = isJustifiedByWorldRule(sc, event, worldRules);

        if (!justified && (isInstant || !event)) {
          results.push({
            checker: "WorldKnowledgeChecker",
            rule: "instant_state_transition",
            severity: "warning",
            message:
              `Physically implausible instant ${transition.description} transition: ` +
              `"${sc.entity}" changed from "${sc.from}" to "${sc.to}" ` +
              `${event ? `at "${event.description}" (${event.location})` : "(no associated event)"}. ` +
              `This type of transition requires time in the real world.`,
            evidence: event ? [event.id] : [],
          });
          break; // Only flag once per state change
        }
      }
    }
  }

  return results;
}

/**
 * Check whether a world rule (e.g., magic system) justifies an instant transition.
 */
function isJustifiedByWorldRule(
  sc: StateChange,
  event: TemporalEvent | undefined,
  worldRules: WorldRule[]
): boolean {
  if (worldRules.length === 0) return false;

  const eventDesc = event?.description?.toLowerCase() ?? "";
  const scFrom = String(sc.from).toLowerCase();
  const scTo = String(sc.to).toLowerCase();

  for (const rule of worldRules) {
    const ruleText = rule.rule.toLowerCase();

    // Check if the rule mentions relevant terms from the state change or event
    const mentionsTransition =
      (ruleText.includes(scFrom) || ruleText.includes(scTo) ||
       ruleText.includes(sc.attribute.toLowerCase()) ||
       ruleText.includes("instant") || ruleText.includes("magic") ||
       ruleText.includes("heal") || ruleText.includes("spell"));

    // Check if the event mentions magic or similar mechanism
    const eventMentionsMagic =
      /\b(magic|spell|enchant|divine|miracle|potion|rune|ritual)\b/i.test(eventDesc);

    if (mentionsTransition && eventMentionsMagic) return true;
  }

  return false;
}

/**
 * Check 2: Physical impossibility in propositions and events.
 *
 * Scan proposition texts and event descriptions for patterns
 * that describe physically impossible scenarios.
 */
function checkPhysicalImpossibility(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];
  const flaggedTexts = new Set<string>();

  // Check propositions (at most one finding per proposition)
  for (const prop of graph.propositions) {
    if (flaggedTexts.has(`prop:${prop.id}`)) continue;
    for (const pattern of IMPOSSIBILITY_PATTERNS) {
      if (pattern.pattern.test(prop.text)) {
        flaggedTexts.add(`prop:${prop.id}`);
        results.push({
          checker: "WorldKnowledgeChecker",
          rule: "physical_impossibility",
          severity: "warning",
          message:
            `Physical impossibility at ${prop.location}: "${prop.text}" — ` +
            `${pattern.description}.`,
          evidence: [prop.id],
        });
        break; // One finding per proposition
      }
    }
  }

  // Check events (at most one finding per event)
  for (const event of graph.events) {
    if (flaggedTexts.has(`event:${event.id}`)) continue;
    for (const pattern of IMPOSSIBILITY_PATTERNS) {
      if (pattern.pattern.test(event.description)) {
        flaggedTexts.add(`event:${event.id}`);
        results.push({
          checker: "WorldKnowledgeChecker",
          rule: "physical_impossibility",
          severity: "warning",
          message:
            `Physical impossibility at ${event.location}: "${event.description}" — ` +
            `${pattern.description}.`,
          evidence: [event.id],
        });
        break; // One finding per event
      }
    }
  }

  return results;
}

/**
 * Check 3: Missing causal mechanism.
 *
 * State changes should reference a valid event id. If the referenced event
 * doesn't exist, the state change lacks a causal mechanism.
 */
function checkMissingCausalMechanism(
  stateChanges: StateChange[],
  eventById: Map<string, TemporalEvent>
): CheckResult[] {
  const results: CheckResult[] = [];

  for (const sc of stateChanges) {
    if (!eventById.has(sc.atEvent)) {
      results.push({
        checker: "WorldKnowledgeChecker",
        rule: "missing_causal_mechanism",
        severity: "warning",
        message:
          `Missing causal mechanism: "${sc.entity}" changed "${sc.attribute}" ` +
          `from "${sc.from}" to "${sc.to}" at event "${sc.atEvent}", ` +
          `but no such event exists in the graph.`,
        evidence: [sc.atEvent],
      });
    }
  }

  return results;
}
