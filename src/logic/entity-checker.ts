import type {
  LogicGraph,
  InventoryItem,
  LocationEntry,
  StatusEntry,
  TemporalEvent,
} from "../types/logic-graph";
import type { CheckResult } from "./types";

/**
 * EntityChecker — Verifies entity-state consistency within a LogicGraph.
 *
 * Checks:
 * 1. Used after consumed — item with terminal status appears again in a later event
 * 2. Location teleportation — agent changes location between consecutive events with no travel
 * 3. Status violation — dead/unconscious agent performs actions after the status event
 */
export function checkEntity(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkUsedAfterConsumed(graph.inventory, graph.events));
  results.push(...checkLocationTeleport(graph.locations, graph.events));
  results.push(...checkStatusViolation(graph.statuses, graph.events));

  return results;
}

/**
 * Check 1: Used After Consumed
 *
 * Group inventory entries by (agent, item). Sort by event order.
 * If an entry with a terminal status (used/lost/given_away) is followed
 * by another entry referencing a later event, flag as error.
 */
function checkUsedAfterConsumed(
  inventory: InventoryItem[],
  events: TemporalEvent[]
): CheckResult[] {
  const results: CheckResult[] = [];
  const eventOrder = new Map<string, number>();
  for (const event of events) {
    eventOrder.set(event.id, event.order);
  }

  const terminalStatuses = new Set(["used", "lost", "given_away"]);

  // Group inventory by (agent, item)
  const groups = new Map<string, InventoryItem[]>();
  for (const entry of inventory) {
    const key = `${entry.agent.toLowerCase()}::${entry.item.toLowerCase()}`;
    const group = groups.get(key);
    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  for (const [, group] of groups) {
    // Sort entries by the order of their usedAt event (or acquiredAt if no usedAt)
    const sorted = group
      .filter(entry => entry.usedAt !== undefined)
      .sort((a, b) => {
        const orderA = eventOrder.get(a.usedAt!) ?? 0;
        const orderB = eventOrder.get(b.usedAt!) ?? 0;
        return orderA - orderB;
      });

    // Find the first terminal entry, then flag any subsequent entries
    let consumedAt: string | null = null;
    let consumedOrder = -1;

    for (const entry of sorted) {
      const entryOrder = eventOrder.get(entry.usedAt!) ?? 0;

      if (consumedAt !== null && entryOrder > consumedOrder) {
        results.push({
          checker: "EntityChecker",
          rule: "item_already_consumed",
          severity: "error",
          message:
            `Item "${entry.item}" owned by "${entry.agent}" was already ` +
            `consumed at event "${consumedAt}" but appears again at event "${entry.usedAt}".`,
          evidence: [consumedAt, entry.usedAt!],
        });
        break; // One error per item group is sufficient
      }

      if (terminalStatuses.has(entry.status) && consumedAt === null) {
        consumedAt = entry.usedAt!;
        consumedOrder = entryOrder;
      }
    }
  }

  return results;
}

/**
 * Check 2: Location Teleportation
 *
 * Group locations by agent. Sort by event order.
 * If consecutive entries have different locations, flag as warning.
 */
function checkLocationTeleport(
  locations: LocationEntry[],
  events: TemporalEvent[]
): CheckResult[] {
  const results: CheckResult[] = [];
  const eventOrder = new Map<string, number>();
  for (const event of events) {
    eventOrder.set(event.id, event.order);
  }

  // Group by agent
  const groups = new Map<string, LocationEntry[]>();
  for (const entry of locations) {
    const key = entry.agent.toLowerCase();
    const group = groups.get(key);
    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  for (const [, group] of groups) {
    // Sort by event order
    const sorted = [...group].sort((a, b) => {
      const orderA = eventOrder.get(a.atEvent) ?? 0;
      const orderB = eventOrder.get(b.atEvent) ?? 0;
      return orderA - orderB;
    });

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (prev.location.toLowerCase() !== curr.location.toLowerCase()) {
        results.push({
          checker: "EntityChecker",
          rule: "location_teleport",
          severity: "warning",
          message:
            `Agent "${curr.agent}" teleported from "${prev.location}" ` +
            `(event "${prev.atEvent}") to "${curr.location}" ` +
            `(event "${curr.atEvent}") with no travel event in between.`,
          evidence: [prev.atEvent, curr.atEvent],
        });
      }
    }
  }

  return results;
}

/**
 * Check 3: Status Violation
 *
 * For each status entry where state is "dead" or "unconscious",
 * find events by the same agent that occur AFTER the status event.
 * Flag each as an error.
 */
function checkStatusViolation(
  statuses: StatusEntry[],
  events: TemporalEvent[]
): CheckResult[] {
  const results: CheckResult[] = [];
  const eventOrder = new Map<string, number>();
  for (const event of events) {
    eventOrder.set(event.id, event.order);
  }

  const incapacitatingStates = new Set(["dead", "unconscious"]);

  for (const status of statuses) {
    if (!incapacitatingStates.has(status.state.toLowerCase())) {
      continue;
    }

    const sinceOrder = eventOrder.get(status.since);
    if (sinceOrder === undefined) {
      continue;
    }

    // Find events by the same agent after the status event
    const agentEvents = events.filter(
      e =>
        e.agent.toLowerCase() === status.agent.toLowerCase() &&
        e.order > sinceOrder
    );

    for (const event of agentEvents) {
      results.push({
        checker: "EntityChecker",
        rule: "status_violation",
        severity: "error",
        message:
          `Agent "${status.agent}" is "${status.state}" since event ` +
          `"${status.since}" but performs action at event "${event.id}": ` +
          `"${event.description}".`,
        evidence: [status.since, event.id],
      });
    }
  }

  return results;
}
