/**
 * NarrativeGraph — Structured intermediate representation of narrative craft.
 *
 * Extracted by LLM (Phase A of Tier 2), verified by deterministic code (Phase B).
 * Based on [MASTER_THEORIST]'s story principles: turning values, escalating stakes,
 * protagonist desire, theme delivery, conflict, and premise/counter-premise.
 */

export interface SceneTurningValue {
  scene: string;
  valueBefore: string;
  valueAfter: string;
  changed: boolean;
  location: string;
}

export interface StakeEntry {
  description: string;
  level: "personal" | "professional" | "life_death" | "societal";
  order: number;
  escalatesFromPrevious: boolean;
}

export interface ProtagonistDesire {
  character: string;
  goal: string;
  hasGoal: boolean;
  obstaclePresent: boolean;
}

export interface ThemeDelivery {
  theme: string;
  delivery: "shown" | "stated" | "didactic";
  location: string;
}

export interface ConflictEntry {
  type: "inner" | "personal" | "extra_personal" | "none";
  description: string;
  parties: string[];
  resolved: boolean;
}

export interface PremiseCounterPremise {
  premise: string;
  counterPremise: string;
  counterPresent: boolean;
}

export interface NarrativeGraph {
  turningValues: SceneTurningValue[];
  stakes: StakeEntry[];
  protagonistDesires: ProtagonistDesire[];
  themeDeliveries: ThemeDelivery[];
  conflicts: ConflictEntry[];
  premiseCounterPremise: PremiseCounterPremise[];
}

/** Creates an empty NarrativeGraph with all arrays initialized */
export function createEmptyNarrativeGraph(): NarrativeGraph {
  return {
    turningValues: [],
    stakes: [],
    protagonistDesires: [],
    themeDeliveries: [],
    conflicts: [],
    premiseCounterPremise: [],
  };
}
