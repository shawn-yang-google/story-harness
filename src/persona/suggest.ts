import { generateContent, MODELS } from "../llm";
import { GENRES, TONES, STYLES, AUDIENCE_AGES, EMPHASES } from "./index";

export interface PersonaSuggestion {
  genre: string;
  tone: string;
  style: string;
  audienceAge: string;
  emphasis?: string[];
  reasons: {
    genre: string;
    tone: string;
    style: string;
    audienceAge: string;
    emphasis: string;
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
    '  "reasons": {',
    '    "genre": "One sentence explaining why this genre fits.",',
    '    "tone": "One sentence explaining why this tone fits.",',
    '    "style": "One sentence explaining why this style fits.",',
    '    "audienceAge": "One sentence explaining why this audience fits.",',
    '    "emphasis": "One sentence explaining why these emphasis priorities fit."',
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
    return {
      genre: String(parsed.genre || "literary-fiction"),
      tone: String(parsed.tone || "neutral"),
      style: String(parsed.style || "balanced"),
      audienceAge: String(parsed.audienceAge || "general"),
      emphasis: Array.isArray(parsed.emphasis) ? parsed.emphasis.map(String) : undefined,
      reasons: {
        genre: String(parsed.reasons?.genre || "Best match for this persona."),
        tone: String(parsed.reasons?.tone || "Best match for this persona."),
        style: String(parsed.reasons?.style || "Best match for this persona."),
        audienceAge: String(parsed.reasons?.audienceAge || "Best match for this persona."),
        emphasis: String(parsed.reasons?.emphasis || "Best match for this persona."),
      },
    };
  } catch {
    return fallback(personaName);
  }
}

function fallback(_personaName: string): PersonaSuggestion {
  return {
    genre: "literary-fiction",
    tone: "neutral",
    style: "balanced",
    audienceAge: "general",
    reasons: {
      genre: "Default fallback — LLM suggestion unavailable.",
      tone: "Default fallback — LLM suggestion unavailable.",
      style: "Default fallback — LLM suggestion unavailable.",
      audienceAge: "Default fallback — LLM suggestion unavailable.",
      emphasis: "Default fallback — LLM suggestion unavailable.",
    },
  };
}
