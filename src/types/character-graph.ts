/**
 * CharacterGraph — Structured intermediate representation of character craft.
 *
 * Extracted by LLM (Phase A of Tier 2), verified by deterministic code (Phase B).
 * Based on [MASTER_THEORIST]'s character principles: mask vs true character, choice under
 * pressure, dimensional contradiction, earned emotion, and conscious desire.
 */

export interface Character {
  name: string;
  /** Public persona: "brave warrior" */
  mask: string;
  /** Inner reality: "terrified of failure" */
  trueNature: string;
  /** true = cement-block character (bad) — no gap between mask and truth */
  maskMatchesTruth: boolean;
  /** Backstory wound that haunts the character: "lost his family in a fire" */
  ghost?: string;
  /** What the character ultimately realizes about themselves or the world */
  selfRevelation?: string;
  /** A character flaw or moral/psychological weakness */
  weakness?: string;
  /** What the character truly needs (distinct from conscious desire) */
  need?: string;
  /** Archetypal role in the story: hero, mentor, threshold_guardian, etc. */
  archetypeRole?: "hero" | "mentor" | "threshold_guardian" | "herald" | "shapeshifter" | "shadow" | "ally" | "trickster";
  /** true = character appears to be an ally but is secretly working against the protagonist */
  fakeAlly?: boolean;
  /** Description of the event where the fake ally is unmasked/exposed */
  revealEvent?: string;
}

export interface AllyEntry {
  character: string;
  /** The narrative function the ally serves */
  function?: "sounding_board" | "subplot" | "humanizing_hero" | "comic_relief" | "thematic_mirror";
  /** Does this ally serve a discernible purpose in the story? */
  hasFunction: boolean;
}

export interface PressureChoice {
  character: string;
  /** The pressure situation: "facing execution" */
  pressure: string;
  /** First option: "betray friend" */
  choiceA: string;
  /** Second option: "face death" */
  choiceB: string;
  /** Which option was chosen */
  chosen: string;
  /** Both options have real cost */
  isGenuineDilemma: boolean;
  /** Choice reveals true nature */
  revealsCharacter: boolean;
}

export interface DimensionalContradiction {
  character: string;
  /** The dimension axis: "courage vs cowardice" */
  dimension: string;
  /** Positive pole: "fights for others" */
  positive: string;
  /** Negative pole: "runs from own problems" */
  negative: string;
  /** true = character has this dimension */
  present: boolean;
}

export interface EmotionalMoment {
  character: string;
  emotion: string;
  /** What caused the emotion */
  trigger: string;
  /** Was it set up properly? */
  earned: boolean;
  /** Is the emotional response proportionate? */
  proportionate: boolean;
}

export interface DesireEntry {
  character: string;
  /** What they say they want */
  consciousDesire: string;
  /** What they actually need (may be empty) */
  subconsciousDesire: string;
  /** Does this character have any drive? */
  hasDesire: boolean;
}

export interface CharacterGraph {
  characters: Character[];
  pressureChoices: PressureChoice[];
  dimensions: DimensionalContradiction[];
  emotionalMoments: EmotionalMoment[];
  desires: DesireEntry[];
  allies: AllyEntry[];
}

/** Creates an empty CharacterGraph with all arrays initialized */
export function createEmptyCharacterGraph(): CharacterGraph {
  return {
    characters: [],
    pressureChoices: [],
    dimensions: [],
    emotionalMoments: [],
    desires: [],
    allies: [],
  };
}
