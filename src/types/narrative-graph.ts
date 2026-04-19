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

export interface MoralChoice {
  character: string;
  /** Description of the moral dilemma */
  dilemma: string;
  /** Where in the story this occurs */
  location: string;
  /** Is this near the climax? */
  nearClimax: boolean;
}

export type JourneyStageName =
  | "ordinary_world"
  | "call_to_adventure"
  | "refusal"
  | "meeting_mentor"
  | "crossing_threshold"
  | "tests_allies_enemies"
  | "approach"
  | "ordeal"
  | "reward"
  | "road_back"
  | "resurrection"
  | "return_with_elixir";

export interface JourneyStage {
  stage: JourneyStageName;
  /** Brief description of how this stage manifests in the story */
  description: string;
  /** Where in the story this stage occurs */
  location: string;
}

export interface NarrativeGraph {
  turningValues: SceneTurningValue[];
  stakes: StakeEntry[];
  protagonistDesires: ProtagonistDesire[];
  themeDeliveries: ThemeDelivery[];
  conflicts: ConflictEntry[];
  premiseCounterPremise: PremiseCounterPremise[];
  moralChoices: MoralChoice[];
  /** Whether the story builds to an emotional release */
  catharsisPresent: boolean;
  /** A universal insight beyond the personal arc */
  thematicRevelation?: string;
  journeyStages: JourneyStage[];
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
    moralChoices: [],
    catharsisPresent: true,
    journeyStages: [],
  };
}
