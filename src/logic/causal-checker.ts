import type { LogicGraph, WorldRule, TemporalEvent } from "../types/logic-graph";
import type { HarnessContext } from "../types";
import type { CheckResult } from "./types";

/**
 * CausalChecker — Verifies causal consistency within a LogicGraph.
 *
 * Checks:
 * 1. World rule violation (impossible): events that match an "impossible" world rule
 * 2. World rule violation (necessary): missing preconditions for "necessary" world rules
 * 3. Lore contradiction: inventory/status mismatches against context.loreDb
 */
export function checkCausal(graph: LogicGraph, context: HarnessContext): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkImpossibleWorldRules(graph.worldRules, graph.events));
  results.push(...checkNecessaryWorldRules(graph.worldRules, graph.events));
  results.push(...checkLoreContradictions(graph, context));

  return results;
}

/**
 * Extract key terms from a world rule statement.
 *
 * Strips common stop words and returns lowercased content words (length >= 3).
 */
function extractKeyTerms(rule: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "cannot", "could", "not",
    "and", "but", "or", "nor", "for", "yet", "so", "if", "then", "that",
    "this", "these", "those", "with", "without", "from", "into", "onto",
    "upon", "about", "only", "also", "very", "too", "just", "any", "all",
    "each", "every", "both", "either", "neither", "no", "of", "in", "on",
    "at", "to", "by",
  ]);

  return rule
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopWords.has(word));
}

/**
 * Check if a key term fuzzy-matches any word in the description.
 *
 * Handles basic morphological variations:
 * - Plural/singular: "mortals" ↔ "mortal"
 * - Tense variations: "fly" ↔ "flew" (via shared prefix)
 * - Direct substring: "sword" in "swordfight"
 */
function termMatchesDescription(term: string, descWords: string[]): boolean {
  for (const word of descWords) {
    // Direct substring match (either direction)
    if (word.includes(term) || term.includes(word)) return true;

    // Shared prefix match (minimum 3 chars) for morphological variations
    const minLen = Math.min(term.length, word.length);
    if (minLen >= 3) {
      const prefixLen = Math.min(minLen, Math.max(3, Math.floor(minLen * 0.6)));
      if (term.substring(0, prefixLen) === word.substring(0, prefixLen)) return true;
    }
  }
  return false;
}

/**
 * Check 1: Impossible world rule violations.
 *
 * If a WorldRule with type "impossible" has its key terms matched
 * by an event description, flag as error.
 */
function checkImpossibleWorldRules(
  worldRules: WorldRule[],
  events: TemporalEvent[]
): CheckResult[] {
  const results: CheckResult[] = [];
  const impossibleRules = worldRules.filter(r => r.type === "impossible");

  for (const rule of impossibleRules) {
    const keyTerms = extractKeyTerms(rule.rule);
    if (keyTerms.length === 0) continue;

    for (const event of events) {
      const descWords = event.description.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
      const matchCount = keyTerms.filter(term => termMatchesDescription(term, descWords)).length;
      const matchRatio = matchCount / keyTerms.length;

      // Require majority of key terms to match to avoid false positives
      if (matchRatio >= 0.5) {
        results.push({
          checker: "CausalChecker",
          rule: "world_rule_violated",
          severity: "error",
          message:
            `Impossible world rule violated: "${rule.rule}" (source: ${rule.source}). ` +
            `Event "${event.description}" (${event.location}) appears to contradict this rule.`,
          evidence: [event.id],
        });
      }
    }
  }

  return results;
}

/**
 * Check 2: Necessary world rule violations.
 *
 * If a WorldRule with type "necessary" describes a precondition,
 * check that events related to the rule have the precondition met
 * by a prior event.
 */
function checkNecessaryWorldRules(
  worldRules: WorldRule[],
  events: TemporalEvent[]
): CheckResult[] {
  const results: CheckResult[] = [];
  const necessaryRules = worldRules.filter(r => r.type === "necessary");

  for (const rule of necessaryRules) {
    const keyTerms = extractKeyTerms(rule.rule);
    if (keyTerms.length === 0) continue;

    // Find events related to this rule
    const relatedEvents: TemporalEvent[] = [];
    for (const event of events) {
      const descWords = event.description.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
      const matchCount = keyTerms.filter(term => termMatchesDescription(term, descWords)).length;
      const matchRatio = matchCount / keyTerms.length;

      if (matchRatio >= 0.3) {
        relatedEvents.push(event);
      }
    }

    // If there are related events, check that the rule's necessary condition
    // is evidenced in a prior event
    if (relatedEvents.length > 0) {
      const allDescriptions = events.map(e => e.description.toLowerCase()).join(" ");
      const conditionTerms = keyTerms;
      const conditionMet = conditionTerms.every(term => allDescriptions.includes(term));

      if (!conditionMet) {
        results.push({
          checker: "CausalChecker",
          rule: "necessary_precondition_missing",
          severity: "warning",
          message:
            `Necessary precondition may be missing: "${rule.rule}" (source: ${rule.source}). ` +
            `Related events found but the required precondition is not evidenced.`,
          evidence: relatedEvents.map(e => e.id),
        });
      }
    }
  }

  return results;
}

/**
 * Check 3: Lore contradictions.
 *
 * Cross-reference entity data from loreDb with the graph's inventory and statuses.
 * Recursively walks loreDb to find leaf values and matches them against
 * inventory items and status entries.
 */
function checkLoreContradictions(
  graph: LogicGraph,
  context: HarnessContext
): CheckResult[] {
  const results: CheckResult[] = [];
  const { loreDb } = context;

  if (!loreDb || typeof loreDb !== "object") return results;

  // Build lookup maps for inventory and statuses by agent (case-insensitive)
  const inventoryByAgent = new Map<string, string[]>();
  for (const inv of graph.inventory) {
    const key = inv.agent.toLowerCase();
    const items = inventoryByAgent.get(key);
    if (items) {
      items.push(inv.item);
    } else {
      inventoryByAgent.set(key, [inv.item]);
    }
  }

  const statusesByAgent = new Map<string, string[]>();
  for (const status of graph.statuses) {
    const key = status.agent.toLowerCase();
    const states = statusesByAgent.get(key);
    if (states) {
      states.push(status.state);
    } else {
      statusesByAgent.set(key, [status.state]);
    }
  }

  // Recursively walk the loreDb
  walkLoreDb(loreDb, [], inventoryByAgent, statusesByAgent, results);

  return results;
}

/**
 * Recursively traverse loreDb. At each leaf, if the path includes
 * a character name and a category like "weapon"/"item"/"status",
 * cross-reference against graph data.
 */
function walkLoreDb(
  node: Record<string, any>,
  path: string[],
  inventoryByAgent: Map<string, string[]>,
  statusesByAgent: Map<string, string[]>,
  results: CheckResult[]
): void {
  for (const [key, value] of Object.entries(node)) {
    const currentPath = [...path, key];

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      walkLoreDb(value, currentPath, inventoryByAgent, statusesByAgent, results);
    } else if (typeof value === "string") {
      // Leaf string value — attempt cross-reference
      // The first element of the path is typically the character name
      const characterName = currentPath[0];
      const attribute = currentPath[currentPath.length - 1].toLowerCase();
      const agentKey = characterName.toLowerCase();

      // Check inventory-related attributes
      const inventoryAttrs = new Set(["weapon", "item", "armor", "shield", "tool", "accessory"]);
      if (inventoryAttrs.has(attribute)) {
        const agentItems = inventoryByAgent.get(agentKey);
        if (agentItems && agentItems.length > 0) {
          const loreValue = value.toLowerCase();
          const hasMatch = agentItems.some(item => item.toLowerCase() === loreValue);
          if (!hasMatch) {
            results.push({
              checker: "CausalChecker",
              rule: "lore_contradiction",
              severity: "error",
              message:
                `Lore contradiction for "${characterName}": lore says ${attribute} is "${value}", ` +
                `but inventory shows [${agentItems.join(", ")}].`,
              evidence: [characterName, attribute, value],
            });
          }
        }
      }

      // Check status-related attributes
      const statusAttrs = new Set(["status", "state", "condition"]);
      if (statusAttrs.has(attribute)) {
        const agentStatuses = statusesByAgent.get(agentKey);
        if (agentStatuses && agentStatuses.length > 0) {
          const loreValue = value.toLowerCase();
          const hasMatch = agentStatuses.some(s => s.toLowerCase() === loreValue);
          if (!hasMatch) {
            results.push({
              checker: "CausalChecker",
              rule: "lore_contradiction",
              severity: "error",
              message:
                `Lore contradiction for "${characterName}": lore says ${attribute} is "${value}", ` +
                `but statuses show [${agentStatuses.join(", ")}].`,
              evidence: [characterName, attribute, value],
            });
          }
        }
      }
    }
  }
}
