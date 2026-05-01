import type { WriterPersona, Genre } from "./index";

/** All known harness files in the harnesses/ directory. */
export const ALL_HARNESS_FILES = [
  // Tier 1: Code harnesses
  "StyleHarness.ts",
  "StructureHarness.ts",
  "EmotionHarness.ts",
  "TensionHarness.ts",
  "LogicHarness.ts",
  "ReferenceHarness.ts",
  // Tier 2: Hybrid harnesses
  "LogicCraftHarness.hybrid.json",
  "CharacterCraftHarness.hybrid.json",
  "DialogueCraftHarness.hybrid.json",
  "NarrativeCraftHarness.hybrid.json",
  "ReferenceCraftHarness.hybrid.json",
  // Tier 3: Prompt harnesses
  "ReaderExperience.prompt.txt",
] as const;

export type HarnessFileName = (typeof ALL_HARNESS_FILES)[number];

/**
 * Genre-to-harness mapping.
 *
 * Each genre defines which harnesses are ENABLED. Unlisted harnesses are disabled.
 * StructureHarness.ts is always enabled as a baseline.
 */
const GENRE_HARNESS_MAP: Record<Genre, HarnessFileName[]> = {
  "literary-fiction": [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "EmotionHarness.ts",
    "LogicHarness.ts",
    "ReferenceHarness.ts",
    "LogicCraftHarness.hybrid.json",
    "CharacterCraftHarness.hybrid.json",
    "DialogueCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReferenceCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  thriller: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "TensionHarness.ts",
    "LogicHarness.ts",
    "LogicCraftHarness.hybrid.json",
    "CharacterCraftHarness.hybrid.json",
    "DialogueCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  mystery: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "LogicHarness.ts",
    "LogicCraftHarness.hybrid.json",
    "CharacterCraftHarness.hybrid.json",
    "DialogueCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  horror: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "EmotionHarness.ts",
    "TensionHarness.ts",
    "LogicHarness.ts",
    "LogicCraftHarness.hybrid.json",
    "CharacterCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  comedy: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "DialogueCraftHarness.hybrid.json",
    "CharacterCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  romance: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "EmotionHarness.ts",
    "CharacterCraftHarness.hybrid.json",
    "DialogueCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  "sci-fi": [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "LogicHarness.ts",
    "ReferenceHarness.ts",
    "LogicCraftHarness.hybrid.json",
    "CharacterCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReferenceCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  fantasy: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "EmotionHarness.ts",
    "CharacterCraftHarness.hybrid.json",
    "DialogueCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  children: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "EmotionHarness.ts",
    "CharacterCraftHarness.hybrid.json",
  ],
  historical: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "LogicHarness.ts",
    "ReferenceHarness.ts",
    "LogicCraftHarness.hybrid.json",
    "CharacterCraftHarness.hybrid.json",
    "DialogueCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReferenceCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
  drama: [
    "StyleHarness.ts",
    "StructureHarness.ts",
    "EmotionHarness.ts",
    "CharacterCraftHarness.hybrid.json",
    "DialogueCraftHarness.hybrid.json",
    "NarrativeCraftHarness.hybrid.json",
    "ReaderExperience.prompt.txt",
  ],
};

/** What each harness validates — used for exclusion explanations. */
const HARNESS_DESCRIPTIONS: Record<string, string> = {
  "StyleHarness.ts": "Filler words, exclamation marks, sentence/paragraph length",
  "StructureHarness.ts": "Minimum word count, title presence, basic scene structure",
  "EmotionHarness.ts": "Emotion keyword density (happy, sad, angry, etc.)",
  "TensionHarness.ts": "Tension/suspense keyword density (danger, chase, panic, etc.)",
  "LogicHarness.ts": "Basic draft hygiene (empty/too-short checks)",
  "LogicCraftHarness.hybrid.json": "Deep logic: contradictions, temporal order, causality, epistemics (17 rules)",
  "CharacterCraftHarness.hybrid.json": "Character depth: masks, pressure choices, dimensions, arcs (11 rules)",
  "DialogueCraftHarness.hybrid.json": "Dialogue quality: subtext, exposition, conflict, voice (8 rules)",
  "NarrativeCraftHarness.hybrid.json": "Story structure: stakes, goals, theme, journey stages (11 rules)",
  "ReferenceHarness.ts": "Surface reference checks: anachronisms, impossible dates, misconceptions, placeholder names (5 checks)",
  "ReferenceCraftHarness.hybrid.json": "Deep fact-checking: historical, geographic, cultural, scientific, linguistic accuracy (31 rules across 8 checkers)",
  "ReaderExperience.prompt.txt": "Beta reader simulation: hook, pacing, cringe factor, voice (5 scores)",
};

/** Genre-specific reasons why a harness is excluded. */
const EXCLUSION_REASONS: Record<string, Record<string, string>> = {
  comedy: {
    "EmotionHarness.ts": "Comedy conveys emotion through humor and situation, not keyword density",
    "TensionHarness.ts": "Comedy has different pacing — tension keywords don't apply",
  },
  children: {
    "TensionHarness.ts": "Children's stories don't need thriller-style tension keywords",
    "LogicCraftHarness.hybrid.json": "Complex logic checking is too strict for simple children's narratives",
    "DialogueCraftHarness.hybrid.json": "Children's dialogue follows different rules (simpler, more direct)",
    "NarrativeCraftHarness.hybrid.json": "Hero's Journey structure is too rigid for children's stories",
    "ReaderExperience.prompt.txt": "Beta reader expectations differ for children's literature",
    "ReferenceHarness.ts": "Children's stories prioritize imagination over factual accuracy",
    "ReferenceCraftHarness.hybrid.json": "Deep fact-checking is too strict for children's fiction",
  },
  romance: {
    "TensionHarness.ts": "Romance uses emotional tension, not keyword-based suspense detection",
  },
  historical: {
    "EmotionHarness.ts": "Historical/journalistic writing conveys emotion through events, not explicit emotion words",
    "TensionHarness.ts": "Family history derives tension from generational conflict, not action keywords",
  },
  "sci-fi": {
    "EmotionHarness.ts": "Sci-fi often uses restrained prose; emotion keyword checks would false-positive",
    "TensionHarness.ts": "Sci-fi tension comes from concepts and discoveries, not action keywords",
  },
  drama: {
    "TensionHarness.ts": "Drama uses interpersonal conflict, not thriller-style tension keywords",
  },
};

export interface ExcludedHarness {
  file: string;
  description: string;
  reason: string;
}

/**
 * Returns the list of harness filenames that should be enabled for the given persona.
 *
 * The mapping is primarily driven by genre, with the guarantee that
 * StructureHarness.ts is always included.
 */
export function getEnabledHarnesses(persona: WriterPersona): string[] {
  const genreHarnesses = GENRE_HARNESS_MAP[persona.genre] ?? GENRE_HARNESS_MAP["literary-fiction"];

  // Ensure StructureHarness is always present
  const result = new Set<string>(genreHarnesses);
  result.add("StructureHarness.ts");

  return Array.from(result);
}

/**
 * Returns excluded harnesses with descriptions and reasons.
 */
export function getExcludedHarnesses(persona: WriterPersona): ExcludedHarness[] {
  const enabled = new Set(getEnabledHarnesses(persona));
  const genreReasons = EXCLUSION_REASONS[persona.genre] ?? {};
  const excluded: ExcludedHarness[] = [];

  for (const file of ALL_HARNESS_FILES) {
    if (!enabled.has(file)) {
      excluded.push({
        file,
        description: HARNESS_DESCRIPTIONS[file] ?? "Unknown harness",
        reason: genreReasons[file] ?? "Not required for this genre",
      });
    }
  }

  return excluded;
}
