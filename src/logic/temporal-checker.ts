import type {
  LogicGraph,
  TemporalEvent,
  TemporalConstraint,
  StateChange,
} from "../types/logic-graph";
import type { CheckResult } from "./types";

/**
 * TemporalChecker — Verifies temporal logic within a LogicGraph.
 *
 * Checks:
 * 1. Ordering violations: constraint says A before B, but A.order > B.order
 * 2. Simultaneity conflicts: same agent at two different locations at same order
 * 3. State persistence: contradictory state changes without intervening change
 * 4. Cycle detection: temporal constraints form a cycle (via DFS)
 */
export function checkTemporal(graph: LogicGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const eventById = new Map<string, TemporalEvent>();
  for (const event of graph.events) {
    eventById.set(event.id, event);
  }

  results.push(...checkOrderingViolations(graph.temporalConstraints, eventById));
  results.push(...checkSimultaneityConflicts(graph, eventById));
  results.push(...checkStatePersistence(graph.stateChanges, eventById));
  results.push(...checkCycles(graph.temporalConstraints));

  return results;
}

/**
 * Check 1: Ordering Violations
 *
 * For each constraint (A before B), verify A.order <= B.order.
 * If A.order > B.order, report an ordering_violation.
 */
function checkOrderingViolations(
  constraints: TemporalConstraint[],
  eventById: Map<string, TemporalEvent>
): CheckResult[] {
  const results: CheckResult[] = [];

  for (const constraint of constraints) {
    const beforeEvent = eventById.get(constraint.before);
    const afterEvent = eventById.get(constraint.after);

    if (beforeEvent && afterEvent && beforeEvent.order > afterEvent.order) {
      results.push({
        checker: "TemporalChecker",
        rule: "ordering_violation",
        severity: "error",
        message:
          `Ordering violation: "${beforeEvent.description}" (order ${beforeEvent.order}) ` +
          `is constrained to occur before "${afterEvent.description}" (order ${afterEvent.order}), ` +
          `but its order is later.`,
        evidence: [constraint.before, constraint.after],
      });
    }
  }

  return results;
}

/**
 * Check 2: Simultaneity Conflicts
 *
 * Group events by (agent, order). If the same agent appears at two different
 * locations at the same order, cross-referencing via the locations array,
 * report a simultaneity_conflict.
 */
function checkSimultaneityConflicts(
  graph: LogicGraph,
  eventById: Map<string, TemporalEvent>
): CheckResult[] {
  const results: CheckResult[] = [];

  // Build a map of eventId -> location from the locations array
  const locationByEvent = new Map<string, string>();
  for (const loc of graph.locations) {
    locationByEvent.set(loc.atEvent, loc.location);
  }

  // Group events by (agent, order)
  const groups = new Map<string, TemporalEvent[]>();
  for (const event of graph.events) {
    const key = `${event.agent.toLowerCase()}::${event.order}`;
    const group = groups.get(key);
    if (group) {
      group.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    // Collect distinct locations for events in this group
    const locatedEvents: Array<{ event: TemporalEvent; location: string }> = [];
    for (const event of group) {
      const loc = locationByEvent.get(event.id);
      if (loc) {
        locatedEvents.push({ event, location: loc });
      }
    }

    // Check for distinct locations among located events
    for (let i = 0; i < locatedEvents.length; i++) {
      for (let j = i + 1; j < locatedEvents.length; j++) {
        const a = locatedEvents[i]!;
        const b = locatedEvents[j]!;
        if (a.location !== b.location) {
          results.push({
            checker: "TemporalChecker",
            rule: "simultaneity_conflict",
            severity: "error",
            message:
              `Simultaneity conflict: agent "${a.event.agent}" is at ` +
              `"${a.location}" (${a.event.description}) and ` +
              `"${b.location}" (${b.event.description}) at the same time (order ${a.event.order}).`,
            evidence: [a.event.id, b.event.id],
          });
        }
      }
    }
  }

  return results;
}

/**
 * Check 3: State Persistence Violations
 *
 * Sort state changes by event order. For each (entity, attribute) pair,
 * if consecutive changes contradict (the 'from' of a later change does not
 * match the 'to' of the previous change), flag it.
 */
function checkStatePersistence(
  stateChanges: StateChange[],
  eventById: Map<string, TemporalEvent>
): CheckResult[] {
  const results: CheckResult[] = [];

  // Attach order to each state change
  const changesWithOrder = stateChanges
    .map(sc => ({
      ...sc,
      order: eventById.get(sc.atEvent)?.order ?? 0,
    }))
    .sort((a, b) => a.order - b.order);

  // Group by (entity, attribute)
  const groups = new Map<string, typeof changesWithOrder>();
  for (const sc of changesWithOrder) {
    const key = `${sc.entity.toLowerCase()}::${sc.attribute.toLowerCase()}`;
    const group = groups.get(key);
    if (group) {
      group.push(sc);
    } else {
      groups.set(key, [sc]);
    }
  }

  for (const [, group] of groups) {
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1]!;
      const curr = group[i]!;

      // The 'from' of the current change should match the 'to' of the previous
      if (curr.from !== prev.to) {
        results.push({
          checker: "TemporalChecker",
          rule: "state_persistence_violation",
          severity: "error",
          message:
            `State persistence violation: ${curr.entity}.${curr.attribute} was set to ` +
            `"${prev.to}" at event "${prev.atEvent}", but the next change at event ` +
            `"${curr.atEvent}" expects it to be "${curr.from}".`,
          evidence: [prev.atEvent, curr.atEvent],
        });
      }
    }
  }

  return results;
}

/**
 * Check 4: Cycle Detection
 *
 * Build a directed graph from temporal constraints and detect cycles using DFS.
 * A cycle means the constraints are unsatisfiable (A before B before C before A).
 */
function checkCycles(constraints: TemporalConstraint[]): CheckResult[] {
  const results: CheckResult[] = [];

  if (constraints.length === 0) return results;

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  const allNodes = new Set<string>();

  for (const constraint of constraints) {
    allNodes.add(constraint.before);
    allNodes.add(constraint.after);

    const neighbors = adjacency.get(constraint.before);
    if (neighbors) {
      neighbors.push(constraint.after);
    } else {
      adjacency.set(constraint.before, [constraint.after]);
    }
  }

  // DFS-based cycle detection
  const WHITE = 0; // unvisited
  const GRAY = 1;  // in current path
  const BLACK = 2; // fully processed

  const color = new Map<string, number>();
  for (const node of allNodes) {
    color.set(node, WHITE);
  }

  const cycleNodes: string[] = [];

  function dfs(node: string, path: string[]): boolean {
    color.set(node, GRAY);
    path.push(node);

    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      const neighborColor = color.get(neighbor) ?? WHITE;
      if (neighborColor === GRAY) {
        // Found a cycle — extract the cycle from path
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycleNodes.push(...cycle);
        return true;
      }
      if (neighborColor === WHITE) {
        if (dfs(neighbor, path)) return true;
      }
    }

    path.pop();
    color.set(node, BLACK);
    return false;
  }

  for (const node of allNodes) {
    if (color.get(node) === WHITE) {
      if (dfs(node, [])) {
        break;
      }
    }
  }

  if (cycleNodes.length > 0) {
    results.push({
      checker: "TemporalChecker",
      rule: "temporal_cycle",
      severity: "error",
      message:
        `Temporal cycle detected: constraints form a cycle among events ` +
        `[${cycleNodes.join(" → ")}], making the ordering unsatisfiable.`,
      evidence: cycleNodes,
    });
  }

  return results;
}
