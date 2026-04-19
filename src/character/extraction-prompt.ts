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
            ghost: "...",
            selfRevelation: "...",
            weakness: "...",
            need: "...",
            archetypeRole: "hero",
            fakeAlly: false,
            revealEvent: "...",
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
        allies: [
          {
            character: "...",
            function: "sounding_board",
            hasFunction: true,
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
            ghost: "lost an entire platoon in a failed operation two years ago",
            selfRevelation: "realizes that leadership means accepting loss, not preventing it",
            weakness: "drinks to suppress guilt, refuses to delegate",
            need: "to forgive herself for the soldiers she could not save",
            archetypeRole: "hero",
            fakeAlly: false,
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
        allies: [
          {
            character: "Sergeant Diaz",
            function: "sounding_board",
            hasFunction: true,
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
    "",
    "### 6. Ghost (Backstory Wound)",
    "- For the protagonist (hero), identify the GHOST — a past event or trauma that haunts them.",
    "- ghost: a brief description of the backstory wound (e.g., \"lost his family in a fire\"). Set to empty string if no ghost is evident.",
    "- CRITICAL: The ghost is the source of the character's deepest motivation and weakness. It creates the internal conflict that drives the character arc. A protagonist without a ghost often lacks emotional depth.",
    "",
    "### 7. Self-Revelation, Weakness, and Need",
    "- selfRevelation: what the character ultimately realizes about themselves or the world (may be empty if not yet revealed).",
    "- weakness: a character flaw or moral/psychological weakness (e.g., \"cowardice\", \"selfishness\"). Set to empty string if none evident.",
    "- need: what the character truly needs to grow (distinct from conscious desire). Set to empty string if none evident.",
    "- CRITICAL: A self-revelation without a prior weakness or need is UNEARNED. The revelation must transform something — if there is nothing to transform from, the insight feels hollow.",
    "",
    "### 8. Archetypal Role",
    "- archetypeRole: assign each character one of these roles if applicable: \"hero\", \"mentor\", \"threshold_guardian\", \"herald\", \"shapeshifter\", \"shadow\", \"ally\", \"trickster\".",
    "- Leave undefined if the character does not clearly fit an archetype.",
    "- CRITICAL: A well-designed cast includes essential archetypal functions. The mentor guides the hero's growth. The shadow embodies the hero's greatest fear or dark reflection. Stories with 4+ characters that lack both mentor and shadow roles may have an incomplete dramatic ecosystem.",
    "",
    "### 9. Fake Ally Detection",
    "- fakeAlly: set to true if a character APPEARS to be an ally but is secretly working against the protagonist.",
    "- revealEvent: if fakeAlly is true, describe the event where the fake ally is unmasked/exposed. Set to empty string if the unmasking never occurs in the draft.",
    "- CRITICAL: A fake ally who is set up but never exposed is a dangling setup — the audience expects payoff that never arrives.",
    "",
    "### 10. Ally Function",
    "- For each character with archetypeRole=\"ally\", add an entry to the allies array.",
    "- function: the narrative purpose the ally serves: \"sounding_board\" (someone the hero talks through problems with), \"subplot\" (drives a secondary storyline), \"humanizing_hero\" (shows the hero's softer side), \"comic_relief\" (provides humor), \"thematic_mirror\" (reflects the theme through contrast).",
    "- hasFunction: does this ally serve any discernible narrative purpose? An ally with no function is dead weight in the cast.",
    "- CRITICAL: Every character must earn their place in the story. Allies who merely exist without contributing to the hero's journey, theme, or subplot should be cut.",
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
