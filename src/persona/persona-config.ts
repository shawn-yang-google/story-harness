// TODO: Add rule-level toggles (66 rules, not just 12 checker toggles)
// TODO: Add tone/style-specific threshold adjustments (not just genre)
// TODO: Add 'edit-persona' CLI command for interactive editing of existing persona files
import type { WriterPersona } from "./index";
import type { ReferenceLevel } from "../reference/reference-level";

/**
 * Fine-grained checker and threshold configuration derived from a WriterPersona.
 *
 * This is the bridge between the high-level persona (genre/tone/style) and
 * the low-level checker modules. Each checker can be individually enabled/disabled,
 * and harness thresholds can be tuned per-persona.
 */
export interface PersonaConfig {
  /** Which individual checkers are enabled. */
  enabledCheckers: CheckerFlags;
  /** Tunable thresholds for code harnesses and checkers. */
  thresholds: ThresholdConfig;
  /** Reference enforcement depth: 1 (scan) to 5 (research). Default: 3. */
  referenceLevel: ReferenceLevel;
}

/** Individual checker toggle flags. */
export interface CheckerFlags {
  // Logic domain (9 checkers)
  propositional: boolean;
  temporal: boolean;
  epistemic: boolean;
  deontic: boolean;
  entity: boolean;
  causal: boolean;
  soundness: boolean;
  worldKnowledge: boolean;
  justification: boolean;
  // Other domains (1 checker each)
  character: boolean;
  dialogue: boolean;
  narrative: boolean;
  reference: boolean;
}

/** Tunable thresholds that code harnesses read from context. */
export interface ThresholdConfig {
  // StyleHarness
  maxExclamationMarks: number;
  maxFillerWordOccurrences: number;
  minAvgSentenceLength: number;
  maxAvgSentenceLength: number;
  maxParagraphLengthWords: number;
  // StructureHarness
  minWords: number;
  minLength: number;
  // EmotionHarness
  minDetectedKeywords: number;
  // TensionHarness
  minTensionKeywords: number;
  // DialogueChecker
  maxChitchatRatio: number;
  // NarrativeChecker
  minJourneyStages: number;
}

/** All checkers on, strict thresholds. */
const ALL_CHECKERS_ON: CheckerFlags = {
  propositional: true,
  temporal: true,
  epistemic: true,
  deontic: true,
  entity: true,
  causal: true,
  soundness: true,
  worldKnowledge: true,
  justification: true,
  character: true,
  dialogue: true,
  narrative: true,
  reference: true,
};

/** Strict thresholds for literary/serious fiction. */
const STRICT_THRESHOLDS: ThresholdConfig = {
  maxExclamationMarks: 2,
  maxFillerWordOccurrences: 2,
  minAvgSentenceLength: 8,
  maxAvgSentenceLength: 30,
  maxParagraphLengthWords: 200,
  minWords: 500,
  minLength: 100,
  minDetectedKeywords: 1,
  minTensionKeywords: 2,
  maxChitchatRatio: 0.3,
  minJourneyStages: 4,
};

type GenrePreset = {
  checkers: Partial<CheckerFlags>;
  thresholds: Partial<ThresholdConfig>;
  referenceLevel?: ReferenceLevel;
};

/**
 * Genre-specific presets that override the defaults.
 * Only the overrides are listed; everything else stays at ALL_ON / STRICT.
 */
const GENRE_PRESETS: Record<string, GenrePreset> = {
  "literary-fiction": {
    checkers: {},
    thresholds: {},
  },
  thriller: {
    checkers: {},
    thresholds: {
      minTensionKeywords: 4,
    },
  },
  mystery: {
    checkers: {},
    thresholds: {
      minTensionKeywords: 3,
    },
  },
  horror: {
    checkers: {},
    thresholds: {
      maxExclamationMarks: 5,
      minTensionKeywords: 4,
      minDetectedKeywords: 2,
    },
  },
  comedy: {
    checkers: {
      soundness: false,
      justification: false,
      worldKnowledge: false,
      deontic: false,
    },
    thresholds: {
      maxExclamationMarks: 8,
      maxFillerWordOccurrences: 5,
      minTensionKeywords: 0,
      maxChitchatRatio: 0.5,
    },
    referenceLevel: 1,
  },
  romance: {
    checkers: {
      soundness: false,
      justification: false,
    },
    thresholds: {
      maxExclamationMarks: 4,
      minDetectedKeywords: 2,
      minTensionKeywords: 1,
    },
  },
  "sci-fi": {
    checkers: {},
    thresholds: {
      minTensionKeywords: 2,
    },
  },
  fantasy: {
    checkers: {
      worldKnowledge: false, // Magic breaks real-world physics checks
    },
    thresholds: {
      maxExclamationMarks: 4,
      minDetectedKeywords: 1,
    },
    referenceLevel: 2,
  },
  children: {
    checkers: {
      soundness: false,
      justification: false,
      deontic: false,
      worldKnowledge: false,
      epistemic: false,
    },
    thresholds: {
      maxExclamationMarks: 6,
      maxFillerWordOccurrences: 4,
      minAvgSentenceLength: 5,
      maxAvgSentenceLength: 20,
      minWords: 200,
      minLength: 50,
      minTensionKeywords: 0,
      minDetectedKeywords: 1,
      maxChitchatRatio: 0.5,
      minJourneyStages: 2,
    },
    referenceLevel: 1,
  },
  historical: {
    checkers: {},
    thresholds: {
      minTensionKeywords: 1,
    },
    referenceLevel: 4,
  },
  drama: {
    checkers: {},
    thresholds: {
      minDetectedKeywords: 2,
      minTensionKeywords: 1,
    },
  },
};

/**
 * Resolves a WriterPersona into concrete checker flags and thresholds.
 *
 * Lookup order:
 * 1. Genre preset (from GENRE_PRESETS)
 * 2. Defaults (ALL_CHECKERS_ON + STRICT_THRESHOLDS)
 * 3. Custom genres fall back to literary-fiction defaults
 */
export function resolvePersonaConfig(persona: WriterPersona): PersonaConfig {
  const preset = GENRE_PRESETS[persona.genre] ?? GENRE_PRESETS["literary-fiction"]!;

  return {
    enabledCheckers: {
      ...ALL_CHECKERS_ON,
      ...preset.checkers,
    },
    thresholds: {
      ...STRICT_THRESHOLDS,
      ...preset.thresholds,
    },
    referenceLevel: preset.referenceLevel ?? 3,
  };
}

/**
 * Returns the default reference enforcement level for a given genre.
 *
 * Looks up the per-genre preset (e.g., historical → 4, comedy/children → 1,
 * fantasy → 2). For unknown or custom genres, returns the global default of 3.
 *
 * Used by `suggestPersonaDefaults` to derive a sensible level when the LLM
 * either doesn't supply one or supplies an invalid value.
 */
export function getDefaultReferenceLevel(genre: string): ReferenceLevel {
  const preset = GENRE_PRESETS[genre];
  return (preset?.referenceLevel ?? 3) as ReferenceLevel;
}

/** What each checker validates and how many rules it contains. */
const CHECKER_INFO: Record<string, { description: string; rules: number }> = {
  propositional:  { description: "Contradictions, conditional logic, biconditionals", rules: 5 },
  temporal:       { description: "Event ordering, simultaneity conflicts, temporal cycles", rules: 4 },
  epistemic:      { description: "Psychic knowledge, unestablished abilities", rules: 3 },
  deontic:        { description: "Broken obligations, violated prohibitions, ought-implies-can", rules: 3 },
  entity:         { description: "Item tracking, location teleportation, status violations", rules: 3 },
  causal:         { description: "World rule violations, missing preconditions, lore contradictions", rules: 3 },
  soundness:      { description: "Circular reasoning, tautologies, non-sequiturs", rules: 3 },
  worldKnowledge: { description: "Instant state transitions, physical impossibilities", rules: 3 },
  justification:  { description: "Absurd causal claims, tautological explanations, category errors", rules: 3 },
  character:      { description: "Depth, pressure choices, dimensions, arcs, allies, archetypes", rules: 11 },
  dialogue:       { description: "Chitchat ratio, subtext, exposition, conflict, voice, clichés", rules: 8 },
  narrative:      { description: "Stakes, goals, theme, catharsis, journey stages, editorializing ending", rules: 12 },
};

/** Genre-specific reasons why a checker is disabled. */
const CHECKER_EXCLUSION_REASONS: Record<string, Record<string, string>> = {
  comedy: {
    soundness: "Comedy intentionally bends logic for humor — strict reasoning checks would reject jokes",
    justification: "Absurd justifications are a comedy feature, not a flaw",
    worldKnowledge: "Comedy often exaggerates reality — physics checks don't apply",
    deontic: "Comedy breaks social rules for laughs — obligation checks would over-flag",
  },
  children: {
    soundness: "Children's stories use simplified logic — adult reasoning rigor is too strict",
    justification: "Simple causal explanations are appropriate for young readers",
    deontic: "Social obligation logic is too abstract for children's narratives",
    worldKnowledge: "Children's stories feature talking animals and magic — physics don't apply",
    epistemic: "Characters in children's stories often know things intuitively — that's part of the charm",
  },
  romance: {
    soundness: "Romance prioritizes emotional truth over logical rigor",
    justification: "Love doesn't need logical justification",
  },
  fantasy: {
    worldKnowledge: "Magic systems intentionally break real-world physics",
  },
};

export interface ExcludedChecker {
  checker: string;
  description: string;
  rules: number;
  reason: string;
}

/**
 * Returns disabled checkers with descriptions, rule counts, and reasons.
 */
export function getExcludedCheckers(persona: WriterPersona): ExcludedChecker[] {
  const config = resolvePersonaConfig(persona);
  const genreReasons = CHECKER_EXCLUSION_REASONS[persona.genre] ?? {};
  const excluded: ExcludedChecker[] = [];

  for (const [key, enabled] of Object.entries(config.enabledCheckers)) {
    if (!enabled) {
      const info = CHECKER_INFO[key] ?? { description: "Unknown checker", rules: 0 };
      excluded.push({
        checker: key,
        description: info.description,
        rules: info.rules,
        reason: genreReasons[key] ?? "Not required for this genre",
      });
    }
  }

  return excluded;
}

/**
 * Returns the total number of rules across all enabled checkers.
 */
export function countEnabledRules(persona: WriterPersona): { enabled: number; total: number } {
  const config = resolvePersonaConfig(persona);
  let enabled = 0;
  let total = 0;
  for (const [key, isEnabled] of Object.entries(config.enabledCheckers)) {
    const info = CHECKER_INFO[key];
    if (info) {
      total += info.rules;
      if (isEnabled) enabled += info.rules;
    }
  }
  return { enabled, total };
}
