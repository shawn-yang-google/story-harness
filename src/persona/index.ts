/** Predefined story genres. Custom strings are also accepted. */
export const GENRES = [
  "literary-fiction",
  "thriller",
  "mystery",
  "horror",
  "comedy",
  "romance",
  "sci-fi",
  "fantasy",
  "children",
  "historical",
  "drama",
] as const;
/** A genre can be a predefined value or any custom string. */
export type Genre = (typeof GENRES)[number] | (string & {});

/** Predefined narrative tones. Custom strings are also accepted. */
export const TONES = [
  "dark",
  "humorous",
  "lyrical",
  "gritty",
  "whimsical",
  "suspenseful",
  "melancholic",
  "neutral",
  "playful",
  "ironic",
] as const;
/** A tone can be a predefined value or any custom string. */
export type Tone = (typeof TONES)[number] | (string & {});

/** Predefined writing styles. Custom strings are also accepted. */
export const STYLES = [
  "minimalist",
  "ornate",
  "conversational",
  "journalistic",
  "stream-of-consciousness",
  "balanced",
] as const;
/** A style can be a predefined value or any custom string. */
export type Style = (typeof STYLES)[number] | (string & {});

/** Predefined target audience age groups. Custom strings are also accepted. */
export const AUDIENCE_AGES = [
  "children",
  "young-adult",
  "adult",
  "general",
] as const;
/** An audience age can be a predefined value or any custom string. */
export type AudienceAge = (typeof AUDIENCE_AGES)[number] | (string & {});

/** Predefined emphasis priorities. Custom strings are also accepted. */
export const EMPHASES = [
  "character-depth",
  "subtext",
  "emotional-arc",
  "plot-twists",
  "worldbuilding",
  "dialogue-quality",
  "pacing",
  "atmosphere",
  "humor",
  "tension",
] as const;
export type Emphasis = (typeof EMPHASES)[number] | (string & {});

import type { PersonaConfig } from "./persona-config";

/**
 * A WriterPersona encodes the style, tone, genre, and validation preferences
 * for a particular kind of story generation.
 */
export interface WriterPersona {
  /** Display name for this persona (e.g., "Noir Detective Writer"). */
  name: string;
  /** The primary genre this persona writes in. */
  genre: Genre;
  /** The dominant tone of the writing. */
  tone: Tone;
  /** The prose style to aim for. */
  style: Style;
  /** Target audience age group. */
  audienceAge: AudienceAge;
  /** Optional custom system prompt appended to the LLM generation instruction. */
  systemPrompt?: string;
  /** Optional emphasis priorities — areas the persona cares most about. */
  emphasis?: Emphasis[];
  /** Which harness files are enabled. Resolved from genre if not set. */
  enabledHarnesses?: string[];
  /** Fine-grained checker flags and thresholds. Resolved from genre if not set. */
  checkerConfig?: PersonaConfig;
}

export interface CreatePersonaInput {
  name: string;
  genre: Genre;
  tone: Tone;
  style: Style;
  audienceAge: AudienceAge;
  systemPrompt?: string;
  emphasis?: Emphasis[];
  enabledHarnesses?: string[];
  checkerConfig?: PersonaConfig;
}

/**
 * Creates a WriterPersona from the given input.
 */
export function createPersona(input: CreatePersonaInput): WriterPersona {
  return {
    name: input.name,
    genre: input.genre,
    tone: input.tone,
    style: input.style,
    audienceAge: input.audienceAge,
    systemPrompt: input.systemPrompt,
    emphasis: input.emphasis,
    enabledHarnesses: input.enabledHarnesses,
    checkerConfig: input.checkerConfig,
  };
}
