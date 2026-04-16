import type { HarnessContext } from "../types";

const FENCE = "`" + "`" + "`";

/**
 * Builds the LLM extraction prompt for character analysis (Phase A of Tier 2).
 *
 * This prompt instructs Flash-Lite to parse a narrative draft into a structured
 * CharacterGraph JSON — extracting characters (mask vs true nature), pressure
 * choices, dimensional contradictions, emotional moments, and desires.
 *
 * Based on [MASTER_THEORIST]'s character principles: the mask principle, choice under
 * pressure, dimensional contradiction, earned emotion, and conscious vs
 * subconscious desire.
 */
export function buildCharacterExtractionPrompt(
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
          "Cross-reference character traits and backstory with these lore entries.",
        ].join("\n")
      : "";

  const beatsSection =
    context.previousBeats.length > 0
      ? [
          "",
          "## Previous Story Beats",
          ...context.previousBeats.map((b, i) => (i + 1) + ". " + b),
          "",
          "Character arcs and choices established in previous beats carry forward.",
        ].join("\n")
      : "";

  const schemaExample = [
    FENCE + "json",
    JSON.stringify(
      {
        characters: [
          {
            name: "...",
            mask: "...",
            trueNature: "...",
            maskMatchesTruth: false,
          },
        ],
        pressureChoices: [
          {
            character: "...",
            pressure: "...",
            choiceA: "...",
            choiceB: "...",
            chosen: "...",
            isGenuineDilemma: true,
            revealsCharacter: true,
          },
        ],
        dimensions: [
          {
            character: "...",
            dimension: "...",
            positive: "...",
            negative: "...",
            present: true,
          },
        ],
        emotionalMoments: [
          {
            character: "...",
            emotion: "...",
            trigger: "...",
            earned: true,
            proportionate: true,
          },
        ],
        desires: [
          {
            character: "...",
            consciousDesire: "...",
            subconsciousDesire: "...",
            hasDesire: true,
          },
        ],
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
        characters: [
          {
            name: "Captain Reyes",
            mask: "fearless military leader",
            trueNature: "haunted by guilt over soldiers lost under her command",
            maskMatchesTruth: false,
          },
        ],
        pressureChoices: [
          {
            character: "Captain Reyes",
            pressure: "ambush — outnumbered, no reinforcements coming",
            choiceA: "sacrifice the rear guard to save the convoy",
            choiceB: "hold position and risk losing everyone",
            chosen: "sacrifice the rear guard to save the convoy",
            isGenuineDilemma: true,
            revealsCharacter: true,
          },
        ],
        dimensions: [
          {
            character: "Captain Reyes",
            dimension: "courage vs guilt",
            positive: "leads from the front, never flinches",
            negative: "privately tormented, drinks to forget",
            present: true,
          },
        ],
        emotionalMoments: [
          {
            character: "Captain Reyes",
            emotion: "grief",
            trigger: "finding Private Torres's letter to his daughter",
            earned: true,
            proportionate: true,
          },
        ],
        desires: [
          {
            character: "Captain Reyes",
            consciousDesire: "complete the mission and bring the convoy home",
            subconsciousDesire: "redemption for past failures",
            hasDesire: true,
          },
        ],
      },
      null,
      2
    ),
    FENCE,
  ].join("\n");

  return [
    "You are a character craft analyst for narrative text. Your task is to extract ALL character elements from the draft below into a structured JSON object called a CharacterGraph.",
    "",
    "## Instructions",
    "",
    "Read the draft carefully and extract EVERY instance of the following:",
    "",
    "### 1. Characters (Mask vs True Nature)",
    "- For EVERY named character, identify their public persona (mask) and their inner reality (true nature).",
    "- mask: how the character APPEARS to the world — their social presentation, reputation, or self-image.",
    "- trueNature: who the character truly IS — revealed through choices under pressure, private moments, or contradictions.",
    "- maskMatchesTruth: set to true if the mask and true nature are identical (a \"cement-block\" character with no gap between appearance and reality). This is typically a craft weakness — interesting characters have a gap between mask and truth.",
    "- CRITICAL ([MASTER_THEORIST]'s Mask Principle): Great characters wear masks. The gap between what a character appears to be and what they truly are is the source of dramatic fascination. If mask equals truth, the character lacks depth.",
    "",
    "### 2. Pressure Choices",
    "- Identify every moment where a character faces a decision under pressure.",
    "- pressure: the situation forcing the choice.",
    "- choiceA and choiceB: the two options available.",
    "- chosen: which option was selected.",
    "- isGenuineDilemma: BOTH options must have real, meaningful cost. If one choice is obviously correct with no downside, it is NOT a genuine dilemma.",
    "- revealsCharacter: does the choice reveal something about who the character truly is (beyond their mask)?",
    "- CRITICAL: True character is revealed in the choices a person makes under pressure. Easy choices reveal nothing. Only dilemmas where BOTH options carry real cost expose the character beneath the mask.",
    "",
    "### 3. Dimensional Contradictions",
    "- For each character, identify axes of internal contradiction.",
    "- dimension: the axis of contradiction (e.g., \"courage vs cowardice\", \"loyalty vs self-interest\").",
    "- positive: the admirable pole of the dimension (e.g., \"fights for others\").",
    "- negative: the shadow pole of the dimension (e.g., \"runs from own problems\").",
    "- present: set to true if the character demonstrates BOTH poles in the draft.",
    "- CRITICAL: Flat characters have only positive or only negative traits. Dimensional characters contain contradictions — they are brave AND afraid, generous AND selfish. Look for evidence of opposing qualities within the same character.",
    "",
    "### 4. Emotional Moments",
    "- Identify every significant emotional moment for each character.",
    "- emotion: what the character feels (grief, joy, rage, shame, etc.).",
    "- trigger: what event or revelation caused the emotion.",
    "- earned: was the emotional moment properly set up by preceding events? An earned emotion has groundwork laid earlier in the narrative. An unearned emotion appears without adequate preparation.",
    "- proportionate: is the emotional response proportionate to the trigger? Over-reaction or under-reaction without justification is a craft issue.",
    "- CRITICAL: Emotion must be EARNED through story structure, not manufactured through manipulation. If a character weeps but we have no reason to care, the emotion is unearned.",
    "",
    "### 5. Desires",
    "- For each significant character, identify their conscious and subconscious desires.",
    "- consciousDesire: what the character explicitly wants or states as their goal.",
    "- subconsciousDesire: what the character truly needs but may not recognize (may be empty if not evident).",
    "- hasDesire: does this character have any discernible drive, want, or goal? A character without desire is a character without a story.",
    "- CRITICAL: The gap between conscious desire (what I want) and subconscious desire (what I need) is a primary engine of character depth. Characters who want the wrong thing, or who do not know what they truly need, create compelling drama.",
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
    "Captain Reyes barked orders with unflinching confidence as bullets shattered the windows. \"Hold the line!\" But when the fire stopped and the dust settled, she sat alone in the supply room, hands trembling around a flask. Private Torres's letter — the one to his daughter — lay open beside her. She had chosen to sacrifice the rear guard. It was the right call. It was the only call. She would never believe that.",
    "",
    "**Output:**",
    fewShotExample,
    "",
    "Be exhaustive. Every character, every choice, every emotional beat must be captured. Missing an element means a character flaw goes undetected.",
  ].join("\n");
}
