import { generateContent, MODELS } from "../llm";
import { GENRES, TONES, STYLES, AUDIENCE_AGES, EMPHASES } from "./index";
import { getDefaultReferenceLevel } from "./persona-config";
import type { ReferenceLevel } from "../reference/reference-level";

export interface PersonaSuggestion {
  genre: string;
  tone: string;
  style: string;
  audienceAge: string;
  emphasis?: string[];
  /** Optional 1-5 enforcement level for reference checking. */
  referenceLevel?: ReferenceLevel;
  reasons: {
    genre: string;
    tone: string;
    style: string;
    audienceAge: string;
    emphasis: string;
    /** Optional reasoning for the suggested referenceLevel. */
    referenceLevel?: string;
  };
}

/**
 * Uses an LLM to suggest the best genre, tone, style, and audience
 * for a given persona name, along with one-sentence reasons for each.
 */
export async function suggestPersonaDefaults(personaName: string): Promise<PersonaSuggestion> {
  const prompt = [
    "You are a writing consultant. Given a writer persona name, suggest the best defaults for story generation.",
    "",
    "Persona name: " + JSON.stringify(personaName),
    "",
    "Available genres: " + GENRES.join(", "),
    "Available tones: " + TONES.join(", "),
    "Available styles: " + STYLES.join(", "),
    "Available audiences: " + AUDIENCE_AGES.join(", "),
    "Available emphasis priorities: " + EMPHASES.join(", "),
    "",
    "Reference enforcement levels (1-5) — pick the rigor level appropriate for this persona:",
    "  1 = scan: only obvious factual errors. For comedy, children's stories.",
    "  2 = validate: standard fact-checking. For fantasy, light fiction.",
    "  3 = scrutinize (default): skeptical, requires explicit reasoning.",
    "  4 = investigate: extracts implicit claims, suggests enrichment. For biographers, serious historical fiction.",
    "  5 = research: research-consultant mode, treats every claim as needs-research. For journalists, academic-grade nonfiction.",
    "",
    "You may also suggest a CUSTOM value not in the lists above if none fit well.",
    "For emphasis, pick 2-4 from the available list that best fit this persona.",
    "",
    "Return a JSON object (no markdown fences) with exactly this structure:",
    '{',
    '  "genre": "...",',
    '  "tone": "...",',
    '  "style": "...",',
    '  "audienceAge": "...",',
    '  "emphasis": ["...", "..."],',
    '  "referenceLevel": 3,',
    '  "reasons": {',
    '    "genre": "One sentence explaining why this genre fits.",',
    '    "tone": "One sentence explaining why this tone fits.",',
    '    "style": "One sentence explaining why this style fits.",',
    '    "audienceAge": "One sentence explaining why this audience fits.",',
    '    "emphasis": "One sentence explaining why these emphasis priorities fit.",',
    '    "referenceLevel": "One sentence explaining why this enforcement level fits."',
    '  }',
    '}',
  ].join("\n");

  const response = await generateContent(MODELS.EVALUATOR, prompt);
  if (!response) {
    return fallback(personaName);
  }

  try {
    let cleaned = response.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(cleaned);
    const genre = String(parsed.genre || "literary-fiction");
    const referenceLevel = parseReferenceLevel(parsed.referenceLevel, genre);
    return {
      genre,
      tone: String(parsed.tone || "neutral"),
      style: String(parsed.style || "balanced"),
      audienceAge: String(parsed.audienceAge || "general"),
      emphasis: Array.isArray(parsed.emphasis) ? parsed.emphasis.map(String) : undefined,
      referenceLevel,
      reasons: {
        genre: String(parsed.reasons?.genre || "Best match for this persona."),
        tone: String(parsed.reasons?.tone || "Best match for this persona."),
        style: String(parsed.reasons?.style || "Best match for this persona."),
        audienceAge: String(parsed.reasons?.audienceAge || "Best match for this persona."),
        emphasis: String(parsed.reasons?.emphasis || "Best match for this persona."),
        referenceLevel: String(
          parsed.reasons?.referenceLevel ||
          `Default level for genre "${genre}".`
        ),
      },
    };
  } catch {
    return fallback(personaName);
  }
}

/**
 * Validates the LLM-supplied referenceLevel. If it's not a 1-5 integer,
 * falls back to the per-genre default (e.g., historical → 4, comedy → 1).
 */
function parseReferenceLevel(raw: unknown, genre: string): ReferenceLevel {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return n as ReferenceLevel;
  return getDefaultReferenceLevel(genre);
}

function fallback(_personaName: string): PersonaSuggestion {
  return {
    genre: "literary-fiction",
    tone: "neutral",
    style: "balanced",
    audienceAge: "general",
    referenceLevel: getDefaultReferenceLevel("literary-fiction"),
    reasons: {
      genre: "Default fallback — LLM suggestion unavailable.",
      tone: "Default fallback — LLM suggestion unavailable.",
      style: "Default fallback — LLM suggestion unavailable.",
      audienceAge: "Default fallback — LLM suggestion unavailable.",
      emphasis: "Default fallback — LLM suggestion unavailable.",
      referenceLevel: "Default fallback — LLM suggestion unavailable.",
    },
  };
}
