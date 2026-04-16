/**
 * DialogueGraph — Structured intermediate representation of dialogue craft.
 *
 * Extracted by LLM (Phase A of Tier 2), verified by deterministic code (Phase B).
 * This is the "AST" of dialogue quality — the bridge between natural language
 * understanding and formal verification based on [MASTER_THEORIST]'s dialogue principles.
 */

export interface Speech {
  id: string;
  speaker: string;
  text: string;
  wordCount: number;
  order: number;
  location: string;
}

export interface SubtextEntry {
  speechId: string;
  surfaceMeaning: string;
  hiddenMeaning: string;
  type: "irony" | "evasion" | "deflection" | "double_meaning" | "none";
}

export interface ExpositionLine {
  speechId: string;
  content: string;
  type: "natural" | "as_you_know_bob" | "info_dump" | "weaponized";
}

export interface CharacterVoice {
  character: string;
  vocabulary: "formal" | "colloquial" | "technical" | "poetic" | "terse";
  avgSentenceLength: number;
  distinctiveTraits: string[];
  distinctFromOthers: boolean;
}

export interface DialogueConflict {
  speechId: string;
  type: "agreement" | "disagreement" | "evasion" | "confrontation" | "negotiation";
}

export interface DialogueGraph {
  speeches: Speech[];
  subtext: SubtextEntry[];
  exposition: ExpositionLine[];
  voices: CharacterVoice[];
  conflicts: DialogueConflict[];
  /** Speech ids that are pure filler */
  chitchatSpeeches: string[];
  /** Speech ids over 100 words with no interruption */
  monologueSpeeches: string[];
  /** Speech ids directly stating emotions */
  onTheNoseSpeeches: string[];
  /** Speech ids using dialogue cliches */
  clicheSpeeches: string[];
}

/** Creates an empty DialogueGraph with all arrays initialized */
export function createEmptyDialogueGraph(): DialogueGraph {
  return {
    speeches: [],
    subtext: [],
    exposition: [],
    voices: [],
    conflicts: [],
    chitchatSpeeches: [],
    monologueSpeeches: [],
    onTheNoseSpeeches: [],
    clicheSpeeches: [],
  };
}
