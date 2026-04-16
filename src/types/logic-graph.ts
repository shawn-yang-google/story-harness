/**
 * LogicGraph — Structured intermediate representation of narrative logic.
 *
 * Extracted by LLM (Phase A of Tier 2), verified by deterministic code (Phase B).
 * This is the "AST" of narrative logic — the bridge between natural language
 * understanding and formal verification.
 */

// === Propositional Logic ===

export interface Proposition {
  /** Unique identifier, e.g. "p1" */
  id: string;
  /** Human-readable statement: "Elara is afraid of the dark" */
  text: string;
  /** The entity this proposition is about */
  subject: string;
  /** Normalized predicate key: "afraid_of_dark" */
  predicate: string;
  /** true = asserted, false = negated */
  truth: boolean;
  /** Where in text: "paragraph 2, sentence 1" */
  location: string;
}

export interface ConditionalRule {
  id: string;
  /** Proposition id or description of the antecedent (P in P→Q) */
  antecedent: string;
  /** Proposition id or description of the consequent (Q in P→Q) */
  consequent: string;
  /** "conditional" = P→Q, "biconditional" = P↔Q */
  type: "conditional" | "biconditional";
  /** Where this rule originates */
  source: "narrative" | "lore" | "world_rule";
  location: string;
}

export interface Conclusion {
  /** What is being concluded */
  claim: string;
  /** Proposition ids used as supporting premises */
  premises: string[];
  /** The type of inference used */
  inferenceType:
    | "modus_ponens"
    | "modus_tollens"
    | "affirming_consequent"
    | "denying_antecedent"
    | "disjunctive_syllogism"
    | "hypothetical_syllogism"
    | "unsupported"
    | "other";
  location: string;
}

// === Temporal Logic ===

export interface TemporalEvent {
  id: string;
  description: string;
  /** The agent performing/experiencing this event */
  agent: string;
  /** Sequential position in narrative (1-based) */
  order: number;
  location: string;
}

export interface TemporalConstraint {
  /** Event id that must come first */
  before: string;
  /** Event id that must come second */
  after: string;
  type: "causal" | "prerequisite" | "explicit";
  /** Whether the constraint is satisfied by the event ordering */
  satisfied: boolean;
}

export interface StateChange {
  entity: string;
  attribute: string;
  from: string | boolean | number;
  to: string | boolean | number;
  /** Event id at which this change occurs */
  atEvent: string;
}

// === Epistemic Logic (Knowledge & Abilities) ===

export interface KnowledgeEntry {
  agent: string;
  /** What the agent knows (proposition id or description) */
  knows: string;
  /** Event id when the agent learned this */
  since: string;
  /** How the agent learned this */
  how: "witnessed" | "told" | "deduced" | "unexplained";
}

export interface Ability {
  agent: string;
  /** What the agent can do: "swim", "cast fire magic" */
  can: string;
  /** When established: event id, "backstory", or "never" */
  established: string;
}

// === Deontic Logic (Obligations & Prohibitions) ===

export interface Obligation {
  agent: string;
  /** What the agent must do */
  must: string;
  /** Where this obligation originates: "sworn oath in paragraph 1" */
  source: string;
  /** null = not yet resolved in the narrative */
  fulfilled: boolean | null;
}

export interface Prohibition {
  agent: string;
  /** What the agent must not do */
  mustNot: string;
  source: string;
  /** null = not yet resolved in the narrative */
  violated: boolean | null;
  /** If violated, was there narrative consequence? */
  consequenceAcknowledged: boolean;
}

// === Modal Logic (World Rules) ===

export interface WorldRule {
  /** The rule statement: "Only dragonfire can melt adamantine" */
  rule: string;
  /** "necessary" = must be true, "impossible" = cannot happen, "conditional" = depends */
  type: "necessary" | "impossible" | "conditional";
  /** Origin: "lore", "paragraph 3", etc. */
  source: string;
}

// === Entity State Tracking ===

export interface InventoryItem {
  agent: string;
  item: string;
  /** Event id when acquired */
  acquiredAt: string;
  /** Event id when used/lost (optional) */
  usedAt?: string;
  status: "held" | "used" | "lost" | "given_away";
}

export interface LocationEntry {
  agent: string;
  location: string;
  /** Event id when the agent is at this location */
  atEvent: string;
}

export interface StatusEntry {
  agent: string;
  /** e.g. "alive", "dead", "unconscious", "poisoned" */
  state: string;
  /** Event id since which this status applies */
  since: string;
}

// === The Complete Graph ===

export interface LogicGraph {
  propositions: Proposition[];
  rules: ConditionalRule[];
  conclusions: Conclusion[];
  events: TemporalEvent[];
  temporalConstraints: TemporalConstraint[];
  stateChanges: StateChange[];
  knowledge: KnowledgeEntry[];
  abilities: Ability[];
  obligations: Obligation[];
  prohibitions: Prohibition[];
  worldRules: WorldRule[];
  inventory: InventoryItem[];
  locations: LocationEntry[];
  statuses: StatusEntry[];
}

/** Creates an empty LogicGraph with all arrays initialized */
export function createEmptyLogicGraph(): LogicGraph {
  return {
    propositions: [],
    rules: [],
    conclusions: [],
    events: [],
    temporalConstraints: [],
    stateChanges: [],
    knowledge: [],
    abilities: [],
    obligations: [],
    prohibitions: [],
    worldRules: [],
    inventory: [],
    locations: [],
    statuses: [],
  };
}
