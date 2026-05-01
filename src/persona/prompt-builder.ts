import type { WriterPersona } from "./index";

/** Style-specific writing guidance. */
const STYLE_GUIDANCE: Record<string, string> = {
  minimalist:
    "Use short, declarative sentences. Avoid adjectives and adverbs. Let action and dialogue carry the weight. Leave space for the reader's imagination.",
  ornate:
    "Use rich, layered prose with vivid imagery and sensory detail. Employ metaphor, simile, and rhythmic sentence structures. Every paragraph should be a pleasure to read aloud.",
  conversational:
    "Write as if telling the story to a friend. Use natural, flowing language. Contractions are encouraged. Avoid formal or academic phrasing.",
  journalistic:
    "Write with clarity and precision. Lead with the most interesting element. Short paragraphs. Active voice. Facts before feelings.",
  "stream-of-consciousness":
    "Write in the character's unfiltered inner voice. Thoughts flow freely, interrupted by sensory impressions and memories. Punctuation is flexible.",
  balanced:
    "Use a well-rounded prose style that blends description, dialogue, and action. Vary sentence length for rhythm. Aim for clarity without sacrificing elegance.",
};

/** Tone-specific writing guidance. */
const TONE_GUIDANCE: Record<string, string> = {
  dark: "The atmosphere should feel oppressive, shadowed, or morally ambiguous. Let the darkness emerge from situation and character, not from gratuitous description.",
  humorous:
    "Find the absurdity in situations. Use wit, timing, and misdirection. The humor should emerge naturally from character and circumstance, not from forced jokes.",
  lyrical:
    "The prose itself should sing. Pay attention to the sound and rhythm of language. Every sentence should contribute to the mood and music of the narrative.",
  gritty:
    "Ground the story in the harsh textures of reality. Unflinching detail. Characters are weathered. Settings have grime under their fingernails.",
  whimsical:
    "Infuse the story with wonder, playfulness, and a sense of possibility. The ordinary becomes extraordinary. Surprise the reader with delightful turns.",
  suspenseful:
    "Build unease through pacing and withholding. Every scene should raise a question. Control information release to keep the reader on the edge.",
  melancholic:
    "Let a quiet sadness suffuse the narrative. Explore loss, longing, and the bittersweet nature of memory. Beauty and sorrow coexist.",
  neutral:
    "Maintain an even, observational tone. Neither overly emotional nor detached. Let events speak for themselves.",
  playful:
    "Approach the narrative with a light touch. Break conventions when it serves the story. Engage the reader as a co-conspirator in the fun.",
  ironic:
    "Maintain a gap between surface and meaning. The narrator sees more than the characters. Understatement is preferred over overstatement.",
};

/** Audience-specific content guidance. */
const AUDIENCE_GUIDANCE: Record<string, string> = {
  children:
    "Use simple vocabulary and short sentences. No violence, explicit content, or complex moral ambiguity. Characters should be relatable to young readers. Include wonder and discovery.",
  "young-adult":
    "Address themes of identity, belonging, and coming-of-age. Characters should face meaningful choices. Some complexity is appropriate but avoid gratuitous darkness.",
  adult:
    "Full range of themes, language, and content complexity. No restrictions on subject matter. Treat the reader as sophisticated and capable of handling nuance.",
  general:
    "Write for a broad audience. Avoid content that would be inappropriate for younger readers while maintaining enough depth for adult engagement.",
};

/**
 * Builds a system prompt / generation instruction based on a WriterPersona.
 *
 * This prompt is intended to be used as the system instruction for the LLM
 * that generates story drafts, giving it a specific "voice" and set of priorities.
 */
export function buildGenerationPrompt(persona: WriterPersona): string {
  const lines: string[] = [];

  lines.push("You are a skilled fiction writer with a distinctive voice. Write in the following persona:");
  lines.push("");
  lines.push("## Persona: " + persona.name);
  lines.push("");

  // Genre
  lines.push("### Genre");
  lines.push("Write in the **" + persona.genre + "** genre. Follow the conventions and reader expectations of this genre while bringing originality to the execution.");
  lines.push("");

  // Tone
  lines.push("### Tone");
  const toneGuide = TONE_GUIDANCE[persona.tone] ?? TONE_GUIDANCE.neutral;
  lines.push("Tone: **" + persona.tone + "**");
  lines.push(toneGuide);
  lines.push("");

  // Style
  lines.push("### Style");
  const styleGuide = STYLE_GUIDANCE[persona.style] ?? STYLE_GUIDANCE.balanced;
  lines.push("Style: **" + persona.style + "**");
  lines.push(styleGuide);
  lines.push("");

  // Audience
  lines.push("### Target Audience");
  const audienceGuide = AUDIENCE_GUIDANCE[persona.audienceAge] ?? AUDIENCE_GUIDANCE.general;
  lines.push("Audience: **" + persona.audienceAge + "**");
  lines.push(audienceGuide);
  lines.push("");

  // Emphasis
  if (persona.emphasis && persona.emphasis.length > 0) {
    lines.push("### Priority Areas");
    lines.push("Pay special attention to the following craft elements:");
    for (const e of persona.emphasis) {
      lines.push("- **" + e + "**");
    }
    lines.push("");
  }

  // Custom system prompt
  if (persona.systemPrompt) {
    lines.push("### Additional Instructions");
    lines.push(persona.systemPrompt);
    lines.push("");
  }

  const nl = "\n";
  return lines.join(nl);
}
