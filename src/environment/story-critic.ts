import { generateContent, MODELS } from "../llm";

interface StoryCriticResult {
  label: "good" | "bad";
  score: number;
  reasoning: string;
  flaws: string[];
}

/**
 * Tier 4 Narrative Craft Critic.
 *
 * Evaluates narrative passages for storytelling craft quality using
 * [MASTER_THEORIST]'s story principles as a knowledge base:
 *
 * Directly checkable criteria:
 * - Scene turning values: every scene must turn a value (+/−)
 * - Story events and values: meaningful change expressed through conflict
 * - Controlling idea: value+cause thread expressed through climax
 * - Meaning through climax: theme shown through structure, not stated
 * - Premise and counter-premise: both sides of argument dramatized
 * - Character vs characterization: pressure reveals true character
 * - The protagonist: clear conscious desire, possible unconscious desire
 * - Closed vs open endings: appropriately resolved
 * - Genre conventions: story meets genre obligations
 * - Audience respect: no condescension, no over-explanation
 * - Creative limitation: focused world over diffuse world
 * - Four dimensions of setting: period, duration, location, conflict level
 * - Archplot classical design: active protagonist, causal, closed ending
 * - Law of conflict: nothing moves without conflict
 *
 * Holistic judgment criteria:
 * - Story as metaphor for life, literary vs story talent, originality,
 *   story triangle, miniplot, antiplot, research, the gap, character arc,
 *   progressive complication, inciting incident, obligatory scene,
 *   story spine, archetypes not stereotypes
 */
export async function evaluateNarrativeCraft(
  text: string,
  targetAudience: string = "general"
): Promise<StoryCriticResult> {
  const prompt = `
You are an expert narrative craft editor trained in [MASTER_THEORIST]'s story principles.
Your task is to evaluate a story excerpt for NARRATIVE CRAFT QUALITY.

Target Audience: ${targetAudience}

## Your Knowledge Base ([MASTER_THEORIST]'s Story Principles)

### DIRECTLY CHECKABLE CRITERIA

#### Scene Turning Values (scene-turning-values)
Every scene MUST turn at least one value from positive to negative or negative to positive.
A scene that ends in the same emotional/dramatic state as it began is a NON-EVENT.
Value examples: life/death, love/hate, freedom/slavery, truth/lie, hope/despair,
courage/cowardice, loyalty/betrayal, justice/injustice.

#### Story Events and Values (story-event-and-values)
A true story event requires THREE elements:
1. Meaningful change in a character's life situation
2. That change expressed in terms of a VALUE (not just activity)
3. That change achieved through CONFLICT (not handed to the character)
Activity (going to work, eating dinner) is not a story event unless it turns a value.

#### Controlling Idea (controlling-idea)
The story should have a single controlling idea—a value + cause statement.
Example: "Justice triumphs because the protagonist is willing to sacrifice more than the antagonist."
This should emerge through the story's climactic structure, NOT be stated explicitly.

#### Meaning Through Climax (meaning-through-climax)
Theme must be SHOWN through the structure of events culminating in the climax.
NEVER stated didactically by the narrator or characters.
"The moral of the story is..." = immediate failure.
"This showed that..." = didactic failure.

#### Premise and Counter-Premise (premise-and-counter-premise)
Both sides of the thematic argument MUST be dramatized convincingly.
If the hero's worldview faces NO genuine challenge, the story is propaganda, not drama.
The antagonistic force must make a compelling case for its values.
One-sided narratives where obstacles are trivially overcome fail this test.

#### Character vs Characterization (character-vs-characterization)
CHARACTERIZATION = observable traits (appearance, mannerisms, speech patterns).
TRUE CHARACTER = revealed only under pressure, through choices made in dilemmas.
A story that only shows surface traits without revealing true character under pressure
is superficial.

#### The Protagonist (the-protagonist)
The protagonist MUST have a clear CONSCIOUS DESIRE—a specific want or goal.
Optionally, an UNCONSCIOUS DESIRE that contradicts the conscious one adds depth.
A protagonist who wanders without desire, want, or need is not a protagonist.

#### Closed vs Open Endings (closed-vs-open-endings)
Closed ending: all questions answered, values resolved.
Open ending: questions deliberately left for the audience to ponder.
NEITHER is superior, but the story must not simply STOP without resolution or
intentional openness. "Quit mid-story" is failure.

#### Genre Conventions (genre-conventions)
Each genre carries audience expectations (obligations). A thriller must have danger.
A love story must have an obstacle to union. A horror must evoke dread.
Meeting genre conventions is not formulaic—it's fulfilling the story's implicit promise.

#### Audience Respect (audience-respect)
Never condescend to the reader. Never over-explain what is already clear from action
and subtext. Trust the audience's intelligence. Don't repeat information.
Patronizing exposition insults the reader.

#### Creative Limitation (creative-limitation)
A focused, well-defined world is more powerful than a diffuse, everything-goes world.
Constraints breed creativity. A story set everywhere about everything is about nothing.

#### Four Dimensions of Setting (four-dimensions-of-setting)
Period (when), Duration (how long), Location (where), Level of Conflict
(inner/personal/extra-personal/cosmic) should all be defined and consistent.

#### Archplot Classical Design (archplot-classical-design)
If the story follows classical design: active protagonist who pursues desire against
antagonistic forces through continuous time with causally connected events to a
closed ending of absolute, irreversible change.

#### Law of Conflict (law-of-conflict)
NOTHING MOVES WITHOUT CONFLICT. Conflict is to story as sound is to music.
A passage with no conflict—where everyone agrees, nothing opposes the protagonist,
no friction exists—is story death.

### HOLISTIC JUDGMENT CRITERIA

#### Story as Metaphor for Life (story-as-metaphor-for-life)
Overstructured = hollow spectacle (all plot, no meaning).
Understructured = self-indulgent slice-of-life (no plot, all mood).
The ideal story balances both.

#### Literary vs Story Talent (literary-vs-story-talent)
Beautiful prose without story substance = literary talent without story talent.
Gripping events told in pedestrian prose = story talent without literary talent.
The best work has both.

#### Story Originality (story-originality)
Genuine originality: unique expression of universal themes.
Eccentricity: weird for its own sake, mistaking novelty for depth.

#### The Story Triangle (the-story-triangle)
Archplot (classical design) / Miniplot (minimalism) / Antiplot (anti-structure).
The story should sit clearly somewhere in this space.

#### The Gap (the-gap)
When a character acts expecting one response but gets a different one, the GAP
between expectation and result creates surprise and insight.
Without gaps, the story is predictable.

#### Character Arc (character-arc)
Is the character's transformation EARNED through progressive complications
and genuine choices, or does it happen arbitrarily?

#### Progressive Complication (progressive-complication)
Do stakes and complications ESCALATE? Each obstacle should be more challenging
than the last. Flat or diminishing stakes drain momentum.

#### Inciting Incident (inciting-incident)
Is there a clear disruption of the protagonist's routine that starts the story?

#### Obligatory Scene (obligatory-scene)
Does the climax deliver what the inciting incident promised?

#### Story Spine (story-spine)
Is there a unifying through-line connecting events?

#### Archetypes Not Stereotypes (archetypes-not-stereotypes)
Universal human experience expressed through unique, specific characters = archetype.
Flat, predictable stock characters = stereotype.

#### Hero's Journey Stages
A well-structured narrative should contain identifiable journey stages. Not all 12 are
required, but a structural backbone should be present:
- CALL TO ADVENTURE: the event that disrupts the ordinary world
- TESTS, ALLIES, ENEMIES: the hero encounters challenges and builds relationships
- ORDEAL: the central crisis where the hero faces their greatest fear
- REWARD/ELIXIR: what the hero gains from surviving the ordeal
- RESURRECTION: the final test where the hero proves transformation is permanent
- RETURN WITH ELIXIR: the hero brings something back to share with the community
A story that lacks any identifiable journey structure may feel episodic rather than purposeful.

#### The Plan (plan)
The protagonist must have an active STRATEGY to achieve their desire—not just react to
events. The plan focuses the narrative and creates dramatic irony when it fails. A hero
who only reacts is passive; a hero with a plan who must adapt reveals character.

#### The Battle (battle)
The climactic confrontation between hero and opponent must reveal the truth about both
characters. The final battle should be the LAST place the hero wants to be, fighting the
LAST person they want to fight. Victory through superior force alone is unsatisfying—the
hero should win through self-knowledge gained during the journey.

#### Self-Revelation (self-revelation)
The hero's moment of truth—seeing themselves honestly, often for the first time. Must be
BOTH psychological (understanding self) AND moral (understanding how they've hurt others).
A self-revelation without the moral dimension feels incomplete.

#### New Equilibrium (new-equilibrium)
The story should end with the hero at a DIFFERENT level of existence—higher (comedy/triumph)
or lower (tragedy/decline). If the world returns to exactly where it started with no
permanent change, the journey was pointless.

#### Slavery to Freedom World-Arc (slavery-to-freedom)
The best stories track TWO parallel arcs: the hero's personal transformation AND the world's
transformation. As the hero changes internally, the world around them should change too—
from slavery/oppression to freedom, or from order to chaos. This parallel gives the story
resonance beyond the personal.

#### Moral Choice (moral-choice)
Near the climax, the hero should face a genuine moral dilemma—a choice between two positive
outcomes (sacrifice one good for another) or two negative outcomes (choose the lesser evil).
A story without a defining moral choice at its peak moment lacks thematic weight.

#### Catharsis (catharsis)
The emotional purging experienced by the audience at the story's most intense moments.
True catharsis requires setup: the audience must be deeply connected to the hero's struggle
so that the resolution—whether triumph or tragedy—releases accumulated emotional tension.

## What to Check

1. Does each scene/passage TURN a value (positive↔negative)?
2. Is there genuine CONFLICT driving the narrative?
3. Does the protagonist have a clear DESIRE or GOAL?
4. Is theme SHOWN through events, never STATED didactically?
5. Are both sides of the thematic argument dramatized (premise vs counter-premise)?
6. Do stakes ESCALATE progressively?
7. Is characterization revealed through PRESSURE and CHOICES, not just description?
8. Does the audience's intelligence appear respected?
9. Is the world focused and well-defined?
10. Are characters archetypes (unique expressions of universal experience) or stereotypes?
11. Are identifiable JOURNEY STAGES present (call, ordeal, reward, return)?
12. Does the hero have an active PLAN (not just react)?
13. Does the climactic BATTLE reveal character truth through self-knowledge?
14. Is there a SELF-REVELATION with both psychological and moral dimensions?
15. Does the story end at a NEW EQUILIBRIUM (different level of existence)?
16. Is there a defining MORAL CHOICE near the climax?
17. Does the story build to CATHARSIS (emotional release)?

## Output Format

Output valid JSON only with the following schema:
{
  "label": "good" | "bad",
  "score": number,  // 0.0 to 1.0 (1.0 = masterful narrative craft)
  "reasoning": string,  // brief explanation referencing specific [MASTER_THEORIST] principles
  "flaws": string[]  // specific flaw tags, empty if good. Use tags like:
    // "non_turning_scene", "no_value_change", "didactic_theme",
    // "one_sided_argument", "no_protagonist_desire", "stakes_flat",
    // "no_inciting_incident", "missing_obligatory_scene",
    // "condescending_exposition", "diffuse_world", "surface_characterization",
    // "no_gap", "stereotypical", "quit_mid_story",
    // "no_journey_structure", "passive_no_plan", "battle_lacks_revelation",
    // "no_self_revelation", "no_new_equilibrium", "no_moral_choice",
    // "no_catharsis", "no_world_arc"
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

    const result = JSON.parse(cleanResponse) as StoryCriticResult;

    if (
      !["good", "bad"].includes(result.label) ||
      typeof result.score !== "number" ||
      typeof result.reasoning !== "string" ||
      !Array.isArray(result.flaws)
    ) {
      throw new Error("Invalid schema returned by Story Critic LLM");
    }

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Story Critic evaluation failed: ${message}`);
  }
}
