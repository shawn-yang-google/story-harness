import { generateContent, MODELS } from "../llm";

interface CharacterCriticResult {
  label: "good" | "bad";
  score: number;
  reasoning: string;
  flaws: string[];
}

/**
 * Tier 4 Character Craft Critic.
 *
 * Evaluates narrative passages for character craft quality using
 * [MASTER_THEORIST]'s character creation principles as a knowledge base.
 *
 * HIGH-VALUE CHARACTER SKILLS (18):
 * - characterization-vs-true-character: surface traits vs inner truth
 * - principle-of-the-mask: the gap between appearance and reality
 * - choice-under-pressure: true character revealed through dilemmas
 * - unity-of-opposites: contradictory qualities creating depth
 * - defining-dimension: the dominant contradiction in a character
 * - six-types-of-dimensions: intellect, emotion, morality, etc.
 * - sentiment-vs-sentimentality: earned vs unearned emotion
 * - life-in-the-subtext: what lies beneath spoken dialogue
 * - motivation-vs-desire: why characters act vs what they want
 * - conscious-vs-subconscious-desire: stated want vs hidden need
 * - protagonist-design: building the central character
 * - character-arc-and-change: transformation through events
 * - four-levels-of-antagonism: inner/personal/social/cosmic conflict
 * - empathy-vs-sympathy: audience connection mechanisms
 * - plot-is-character: character and plot as unified system
 * - storied-events-and-values: events that change character value states
 * - ten-traits-of-character-depth: complexity markers
 * - three-functions-of-characterization: recognition, reveal, fascination
 *
 * ENRICHMENT CHARACTER SKILLS (20):
 * - cast-map-technique: ensemble character mapping
 * - cast-solar-system: protagonist as center of character gravity
 * - character-and-beauty: aesthetic dimension of character
 * - character-and-empathy: how characters evoke emotional response
 * - character-and-insight: intellectual depth in characters
 * - character-and-time: how characters change over time
 * - character-biography-technique: backstory construction
 * - character-is-destiny: character as fate
 * - character-triangle: protagonist/antagonist/relationship triangle
 * - character-vs-people-core: fictional characters vs real people
 * - comic-cast-design: comedy-specific character design
 * - explicit-and-implicit-traits: visible vs hidden characteristics
 * - four-selves-model: public/private/inner/core self layers
 * - four-steps-of-character-design: systematic character construction
 * - magic-if-technique: empathetic character exploration
 * - major-supporting-characters: secondary character design
 * - narrator-design: narrator as character
 * - observer-and-observed: point of view as characterization
 * - self-story-and-modus-operandi: character's self-narrative
 * - values-and-subtext-in-performance: performed character depth
 */
export async function evaluateCharacterCraft(
  text: string,
  targetAudience: string = "general"
): Promise<CharacterCriticResult> {
  const prompt = `
You are an expert character craft editor trained in [MASTER_THEORIST]'s character creation principles.
Your task is to evaluate a story excerpt for CHARACTER CRAFT QUALITY.

Target Audience: ${targetAudience}

## Your Knowledge Base ([MASTER_THEORIST]'s Character Principles)

### HIGH-VALUE CRITERIA (18 Skills)

#### Characterization vs True Character (characterization-vs-true-character)
CHARACTERIZATION = observable, surface traits (appearance, mannerisms, speech).
TRUE CHARACTER = what is revealed ONLY under pressure, through choices in dilemmas.
A "cement block" character is the same inside as outside—no gap between mask and reality.
Surface adjective lists without pressure-testing are shallow characterization, not character.

#### Principle of the Mask (principle-of-the-mask)
Every compelling character wears a MASK—a public persona that conceals inner truth.
The story's job is to strip the mask through escalating pressure.
Characters without masks are transparent and uninteresting.
The gap between the mask and what lies beneath is where drama lives.

#### Choice Under Pressure (choice-under-pressure)
True character emerges ONLY through choices made under pressure.
A genuine dilemma has TWO equally weighted options, each with real consequences.
Choices without cost reveal nothing. The stakes must be real.
The harder the choice, the more character is revealed.

#### Unity of Opposites (unity-of-opposites)
Compelling characters contain CONTRADICTORY qualities.
Brave but fearful. Kind but cruel. Loyal but deceitful.
These contradictions create depth, unpredictability, and fascination.
Purely good or purely evil characters are flat and uninteresting.

#### Defining Dimension (defining-dimension)
Every complex character has ONE dominant contradiction—the defining dimension.
This is the primary tension that drives their behavior and arc.
It distinguishes them from every other character in the story.

#### Six Types of Dimensions (six-types-of-dimensions)
Characters gain complexity through contradictions across six dimensions:
1. Intellectual (smart but foolish in certain areas)
2. Emotional (controlled but explosive under pressure)
3. Moral (principled but capable of transgression)
4. Physical (strong but vulnerable)
5. Social (confident but isolated)
6. Psychological (stable but harboring hidden trauma)

#### Sentiment vs Sentimentality (sentiment-vs-sentimentality)
SENTIMENT = emotion EARNED through proportionate stakes and events.
SENTIMENTALITY = emotion UNEARNED—excessive reaction to trivial triggers.
Tears over a lost kingdom = sentiment. Sobbing over a wilted flower = sentimentality.
The emotion must match the weight of what has been established.

#### Life in the Subtext (life-in-the-subtext)
In life, people rarely say exactly what they mean.
Dialogue should have a gap between what is SAID and what is MEANT.
"On-the-nose" dialogue ("I am angry at you") kills subtext.
True dialogue lives in what is implied, deflected, avoided, or contradicted by action.

#### Motivation vs Desire (motivation-vs-desire)
MOTIVATION = the deep psychological WHY (rooted in backstory and values).
DESIRE = the specific WHAT—the concrete goal the character pursues.
Both must be present. A character with motivation but no specific desire drifts.
A character with desire but no motivation feels mechanical.

#### Conscious vs Subconscious Desire (conscious-vs-subconscious-desire)
CONSCIOUS DESIRE = what the character openly wants (the stated goal).
SUBCONSCIOUS DESIRE = what the character truly needs (often contradicts the conscious want).
The gap between these two desires creates inner conflict and depth.
The richest characters pursue one thing while needing another.

#### Protagonist Design (protagonist-design)
The protagonist must have WILLPOWER to pursue desire against opposition.
They must be EMPATHETIC (the audience must understand their motivation).
They must have the CAPACITY to pursue their object of desire.
A passive protagonist who wants nothing is not a protagonist.

#### Character Arc and Change (character-arc-and-change)
Character transformation must be EARNED through progressive complications.
Arbitrary change (villain suddenly becomes good) is false.
The arc should feel inevitable in retrospect but surprising in the moment.
Static characters can work if their constancy is tested by escalating pressure.

#### Four Levels of Antagonism (four-levels-of-antagonism)
1. INNER CONFLICT: character vs self (doubt, fear, desire)
2. PERSONAL CONFLICT: character vs another person (rival, loved one)
3. SOCIAL/INSTITUTIONAL CONFLICT: character vs system (law, society, organization)
4. COSMIC/ENVIRONMENTAL CONFLICT: character vs fate, nature, time, death
The most complex characters face antagonism at multiple levels simultaneously.

#### Empathy vs Sympathy (empathy-vs-sympathy)
EMPATHY = the audience UNDERSTANDS the character's perspective (even if they disagree).
SYMPATHY = the audience FEELS SORRY for the character.
Empathy is essential; sympathy is optional.
A character can be morally reprehensible but still empathetic if their logic is clear.

#### Plot is Character (plot-is-character)
Plot events and character choices are ONE UNIFIED SYSTEM.
Plot reveals character; character drives plot.
A plot that works independently of who the characters are is mechanical.
Character-driven events feel organic; externally imposed events feel contrived.

#### Storied Events and Values (storied-events-and-values)
Events that matter are events that change a character's VALUE STATE.
Life/death, love/hate, freedom/slavery, truth/lie.
Events that don't change a value state are activities, not story events.

#### Ten Traits of Character Depth (ten-traits-of-character-depth)
Backstory, psychology, social context, physical presence, speech patterns,
emotional range, moral complexity, relationship patterns, self-awareness level,
and capacity for change all contribute to dimensional characters.

#### Three Functions of Characterization (three-functions-of-characterization)
1. RECOGNITION: the audience identifies the character type instantly
2. REVELATION: the story strips away surface to show hidden truth
3. FASCINATION: contradictions and depth sustain audience interest

### ENRICHMENT CRITERIA (20 Skills)

#### Cast Design Principles
- Cast Map Technique: ensemble characters should create a constellation of contrasts.
- Cast Solar System: protagonist at center, others defined by relationship to protagonist.
- Character Triangle: protagonist/antagonist/catalyst create dynamic tension.
- Comic Cast Design: comedy requires exaggerated traits with internal logic.
- Major Supporting Characters: secondary characters need their own desires and contradictions.

#### Character Psychology
- Four Selves Model: public self, private self, inner self, core self—each character has layers.
- Self-Story and Modus Operandi: each character has a narrative they tell about themselves.
- Character Biography Technique: backstory informs but should not dominate the narrative.
- Character is Destiny: character traits inevitably lead to specific outcomes.
- Character vs People Core: fictional characters must be MORE focused than real people.

#### Character Expression
- Explicit and Implicit Traits: some traits are shown directly, others emerge gradually.
- Observer and Observed: POV character shapes how other characters are perceived.
- Narrator Design: the narrator is a character with biases and limitations.
- Values and Subtext in Performance: actors reveal character through what they withhold.
- Magic If Technique: imagining oneself in the character's situation for authenticity.

#### Character and Dimensions
- Character and Beauty: aesthetic sensibility as characterization.
- Character and Empathy: specific techniques for building audience connection.
- Character and Insight: intellectual depth and perception as character trait.
- Character and Time: how characters relate to past, present, future.
- Nature vs Nurture: the interplay of inherent traits and life experience.

## What to Check

1. Is there a gap between the character's MASK and TRUE SELF?
2. Are characters tested under GENUINE PRESSURE with real dilemmas?
3. Do characters display DIMENSIONAL CONTRADICTIONS (unity of opposites)?
4. Is emotion EARNED through proportionate stakes (not sentimentality)?
5. Does dialogue have SUBTEXT (not on-the-nose)?
6. Do characters have clear CONSCIOUS DESIRE?
7. Is there evidence of SUBCONSCIOUS DESIRE contradicting conscious want?
8. Does the character ARC feel earned through progressive complications?
9. Are antagonistic forces present at multiple levels?
10. Is the character an ARCHETYPE (unique expression of universals) or a STEREOTYPE?

## Output Format

Output valid JSON only with the following schema:
{
  "label": "good" | "bad",
  "score": number,  // 0.0 to 1.0 (1.0 = masterful character craft)
  "reasoning": string,  // brief explanation referencing specific [MASTER_THEORIST] character principles
  "flaws": string[]  // specific flaw tags, empty if good. Use tags like:
    // "cement_block_character", "no_pressure_choice", "flat_no_contradiction",
    // "unearned_emotion", "on_the_nose_dialogue", "no_character_desire",
    // "static_no_arc", "no_subtext", "stereotypical_traits", "missing_mask",
    // "single_dimension", "monotone_arc", "disproportionate_emotion",
    // "no_antagonism_layers"
}

Excerpt to evaluate:
---
${text}
---
`;

  try {
    const response = await generateContent(
      MODELS.CRITIC,
      prompt,
      "You are a JSON-only API. Respond with raw JSON, no markdown blocks."
    );

    // Parse the JSON, cleaning markdown blocks if the model ignored instructions
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
    } else if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();
    }

    const result = JSON.parse(cleanResponse) as CharacterCriticResult;

    if (
      !["good", "bad"].includes(result.label) ||
      typeof result.score !== "number" ||
      typeof result.reasoning !== "string" ||
      !Array.isArray(result.flaws)
    ) {
      throw new Error("Invalid schema returned by Character Critic LLM");
    }

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Character Critic evaluation failed: ${message}`);
  }
}
