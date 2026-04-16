import type { HarnessContext } from "../types";

const FENCE = "`" + "`" + "`";

/**
 * Builds the LLM extraction prompt for dialogue analysis (Phase A of Tier 2).
 *
 * This prompt instructs Flash-Lite to parse a narrative draft into a structured
 * DialogueGraph JSON — extracting speeches, subtext, exposition, voice profiles,
 * conflicts, and flagging problematic patterns (chitchat, monologues, on-the-nose,
 * cliches).
 *
 * Based on [MASTER_THEORIST]'s dialogue principles: text vs subtext, verbal action,
 * voice distinctiveness, and exposition-as-ammunition.
 */
export function buildDialogueExtractionPrompt(
  draft: string,
  context: HarnessContext
): string {
  const loreSection =
    Object.keys(context.loreDb).length > 0
      ? [
          "",
          "## Lore Database (established world facts)",
          FENCE + "json",
          JSON.stringify(context.loreDb, null, 2),
          FENCE,
          "",
          "Cross-reference character voices and exposition with these lore entries.",
        ].join("\n")
      : "";

  const beatsSection =
    context.previousBeats.length > 0
      ? [
          "",
          "## Previous Story Beats",
          ...context.previousBeats.map((b, i) => (i + 1) + ". " + b),
          "",
          "Dialogue should build on knowledge established in previous beats.",
        ].join("\n")
      : "";

  const schemaExample = [
    FENCE + "json",
    JSON.stringify(
      {
        speeches: [
          {
            id: "s1",
            speaker: "...",
            text: "...",
            wordCount: 0,
            order: 1,
            location: "...",
          },
        ],
        subtext: [
          {
            speechId: "s1",
            surfaceMeaning: "...",
            hiddenMeaning: "...",
            type: "irony",
          },
        ],
        exposition: [
          {
            speechId: "s1",
            content: "...",
            type: "natural",
          },
        ],
        voices: [
          {
            character: "...",
            vocabulary: "formal",
            avgSentenceLength: 0,
            distinctiveTraits: ["..."],
            distinctFromOthers: true,
          },
        ],
        conflicts: [
          {
            speechId: "s1",
            type: "disagreement",
          },
        ],
        chitchatSpeeches: [],
        monologueSpeeches: [],
        onTheNoseSpeeches: [],
        clicheSpeeches: [],
      },
      null,
      2
    ),
    FENCE,
  ].join("\n");

  const fewShotExample = [
    FENCE + "json",
    JSON.stringify(
      {
        speeches: [
          {
            id: "s1",
            speaker: "Anna",
            text: "What a lovely day for a walk, isn't it?",
            wordCount: 9,
            order: 1,
            location: "paragraph 1",
          },
          {
            id: "s2",
            speaker: "Mark",
            text: "If you say so.",
            wordCount: 4,
            order: 2,
            location: "paragraph 2",
          },
        ],
        subtext: [
          {
            speechId: "s1",
            surfaceMeaning: "commenting on the weather",
            hiddenMeaning: "attempting to ease tension after an argument",
            type: "evasion",
          },
          {
            speechId: "s2",
            surfaceMeaning: "passive agreement",
            hiddenMeaning: "resentment; refusing to engage",
            type: "irony",
          },
        ],
        exposition: [],
        voices: [
          {
            character: "Anna",
            vocabulary: "colloquial",
            avgSentenceLength: 9,
            distinctiveTraits: ["uses questions to deflect"],
            distinctFromOthers: true,
          },
          {
            character: "Mark",
            vocabulary: "terse",
            avgSentenceLength: 4,
            distinctiveTraits: ["clipped responses", "passive-aggressive"],
            distinctFromOthers: true,
          },
        ],
        conflicts: [
          {
            speechId: "s2",
            type: "evasion",
          },
        ],
        chitchatSpeeches: [],
        monologueSpeeches: [],
        onTheNoseSpeeches: [],
        clicheSpeeches: [],
      },
      null,
      2
    ),
    FENCE,
  ].join("\n");

  return [
    "You are a dialogue craft analyst for narrative text. Your task is to extract ALL dialogue elements from the draft below into a structured JSON object called a DialogueGraph.",
    "",
    "## Instructions",
    "",
    "Read the draft carefully and extract EVERY instance of the following:",
    "",
    "### 1. Speeches",
    "- Extract EVERY line of dialogue as a Speech entry.",
    "- Assign each a unique id (s1, s2, ...).",
    "- Count words accurately (contractions count as one word).",
    "- Order numbers reflect the sequence of dialogue in the draft (starting from 1).",
    "- Include the speaker's name and the location in the text (paragraph or sentence reference).",
    "",
    "### 2. Subtext",
    "- For EVERY speech, analyze: what is the character REALLY saying beneath the surface words?",
    "- surfaceMeaning: the literal content of the line.",
    "- hiddenMeaning: the true intention, emotion, or agenda behind it.",
    "- Classify the type:",
    '  - "irony": saying the opposite of what is meant',
    '  - "evasion": avoiding the real topic',
    '  - "deflection": redirecting attention away from the truth',
    '  - "double_meaning": words carry two valid interpretations',
    '  - "none": the line is straightforward with no subtext',
    '- CRITICAL: Most good dialogue has subtext. If you find every line is "none", the dialogue may be on-the-nose.',
    "",
    "### 3. Exposition",
    "- Identify any speech that delivers background information, world-building, or character history.",
    "- Classify the exposition type:",
    '  - "natural": information emerges organically from conflict or character need',
    '  - "as_you_know_bob": character tells another character something they both already know',
    '  - "info_dump": large block of information delivered without dramatic justification',
    '  - "weaponized": exposition used as ammunition in conflict (the best kind)',
    '- CRITICAL: Watch for the "As you know, Bob..." pattern. If a character explains something to someone who should already know it, that is a craft flaw.',
    "",
    "### 4. Character Voices",
    "- For EACH speaking character, build a voice profile.",
    "- vocabulary: the register of their language (formal/colloquial/technical/poetic/terse).",
    "- avgSentenceLength: average word count per sentence across all their speeches.",
    "- distinctiveTraits: specific speech patterns, verbal tics, sentence structures, or word choices unique to this character.",
    "- distinctFromOthers: could you tell this character's lines apart from other characters if the speaker tags were removed?",
    "- CRITICAL: If all characters sound the same (same vocabulary, same sentence length, no distinctive traits), set distinctFromOthers=false for all.",
    "",
    "### 5. Conflicts",
    "- For each speech, classify the conflict dynamic:",
    '  - "agreement": speakers are aligned (low dramatic value)',
    '  - "disagreement": speakers oppose each other',
    '  - "evasion": one party avoids direct engagement',
    '  - "confrontation": direct, high-stakes opposition',
    '  - "negotiation": parties seek resolution through exchange',
    "- Not every speech needs a conflict entry. Only tag speeches that participate in a discernible conflict dynamic.",
    "",
    "### 6. Problem Flags",
    "",
    "#### chitchatSpeeches",
    '- List the ids of speeches that are pure filler: greetings, weather chat, "How are you?" exchanges that add nothing to plot, character, or theme.',
    "",
    "#### monologueSpeeches",
    "- List the ids of speeches exceeding 100 words with no interruption or response from other characters. Long unbroken speeches often lose dramatic tension.",
    "",
    "#### onTheNoseSpeeches",
    "- List the ids of speeches where characters directly state their emotions instead of showing them through action or subtext. E.g., \"I'm so angry right now!\" instead of slamming a fist on the table.",
    "",
    "#### clicheSpeeches",
    "- List the ids of speeches using stock/cliche dialogue phrases: \"We're not so different, you and I\", \"I didn't sign up for this\", \"It's not what it looks like\", etc.",
    loreSection,
    beatsSection,
    "",
    "## Draft to Analyze",
    "---",
    draft,
    "---",
    "",
    "## Output Format",
    "Respond with ONLY a JSON object matching this exact schema. Do not include any text before or after the JSON.",
    "",
    schemaExample,
    "",
    "## Example",
    "",
    "\"What a lovely day for a walk, isn't it?\" Anna said, picking at a thread on her sleeve. Mark stared at the wall. \"If you say so.\"",
    "",
    "**Output:**",
    fewShotExample,
    "",
    "Be exhaustive. Every line of dialogue must be captured. Missing a speech means subtext and craft flaws go undetected.",
  ].join("\n");
}
