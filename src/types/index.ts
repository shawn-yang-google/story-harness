export type {
  LogicGraph,
  Proposition,
  ConditionalRule,
  Conclusion,
  TemporalEvent,
  TemporalConstraint,
  StateChange,
  KnowledgeEntry,
  Ability,
  Obligation,
  Prohibition,
  WorldRule,
  InventoryItem,
  LocationEntry,
  StatusEntry,
} from "./logic-graph";
export { createEmptyLogicGraph } from "./logic-graph";

export type {
  DialogueGraph,
  Speech,
  SubtextEntry,
  ExpositionLine,
  CharacterVoice,
  DialogueConflict,
} from "./dialogue-graph";
export { createEmptyDialogueGraph } from "./dialogue-graph";

export type {
  NarrativeGraph,
  SceneTurningValue,
  StakeEntry,
  ProtagonistDesire,
  ThemeDelivery,
  ConflictEntry,
  PremiseCounterPremise,
} from "./narrative-graph";
export { createEmptyNarrativeGraph } from "./narrative-graph";

export type { CharacterGraph } from "./character-graph";
export { createEmptyCharacterGraph } from "./character-graph";

export type SynthesisMode = "code" | "prompt" | "hybrid";

export interface HarnessContext {
  loreDb: Record<string, any>;
  previousBeats: string[];
  targetAudience: string;
}

export interface HarnessResult {
  valid: boolean;
  feedback: string[];
  rewrittenDraft?: string;
  /** Extracted knowledge graphs keyed by domain (e.g., "logic", "dialogue") */
  graphs?: Record<string, unknown>;
}

export type NarrativeHarness = (draft: string, context: HarnessContext) => Promise<HarnessResult>;

export interface Trajectory {
  text: string;
  label: "good" | "bad";
  score?: number; // 0.0-1.0 optional continuous score for future flexibility
  flaws?: string[]; // e.g., ["plot_hole", "passive_voice"]
}

export interface FailedExample {
  trajectory: string;
  expected: string;
  actual: string;
  feedback: string;
}
