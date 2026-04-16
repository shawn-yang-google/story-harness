import { generateContent, MODELS } from "../llm";

interface DialogueCriticResult {
  label: "good" | "bad";
  score: number;
  reasoning: string;
  flaws: string[];
}

/**
 * Tier 4 Dialogue Craft Critic.
 *
 * Evaluates narrative passages for dialogue craft quality using
 * [MASTER_THEORIST]'s dialogue principles as a knowledge base.
 *
 * HIGH-VALUE DIALOGUE SKILLS (17):
 * - action-vs-activity: dramatic action vs purposeless filler
 * - dialogue-as-action: every line of dialogue must DO something
 * - cliches-and-neutral-language: avoiding stock phrases
 * - exposition-in-dialogue: handling backstory in speech
 * - exposition-as-ammunition: exposition weaponized under pressure
 * - empty-and-emotive-talk: unearned emotion in dialogue
 * - excuses-vs-motivation: neat self-explanations vs true motives
 * - balanced-conflict: opposing desires in every exchange
 * - duelogue-and-trialogue: two-person and three-person dynamics
 * - backstory-and-revelations: earned reveals vs info-dumps
 * - economy-and-pause: cutting filler, using silence
 * - knowing-and-perceptive-talk: characters with impossible self-awareness
 * - monologue-fallacy: uninterrupted speeches without listener reaction
 * - melodrama: expression intensity exceeding motivation/stakes
 * - ostentatious-and-arid-language: showy or flat language extremes
 * - figurative-language: dead metaphors and clichéd tropes
 * - misshapen-scenes: scenes without turning points
 *
 * ENRICHMENT DIALOGUE SKILLS (29):
 * - text-and-subtext: gap between said and meant
 * - the-said: spoken words as surface
 * - the-unsaid: what characters withhold
 * - the-unsayable: what cannot be articulated
 * - verbal-action: dialogue as tactical maneuver
 * - writing-on-the-nose: directly stating feelings
 * - characterization-through-dialogue: voice as identity
 * - indirect-dialogue: reported speech techniques
 * - showing-vs-telling: dramatized vs narrated dialogue
 * - indirect-conflict: prose-specific layered description vs dialogue
 * - minimal-conflict: power of the unsaid and subtext economy
 * - narrative-drive: revelation timing for forward momentum
 * - narratized-dialogue: POV shifts and addressee awareness
 * - line-design: periodic/cumulative/balanced sentence structure
 * - locution-and-culture: cultural icons shaping speech patterns
 * - film-dialogue-form: medium-specific naturalism
 * - incredibility: dialogue ringing false due to consistency/subtext failure
 * - paralanguage: nonverbal dimensions enhancing or contradicting speech
 * - prose-dialogue-form: six in-character prose dialogue tactics
 * - reflexive-conflict: inner self-to-self warfare expressed through narratized dialogue
 * - repetition-flaw: same dramatic beat repeated in different words
 * - scene-design-components: story design architecture beneath dialogue
 * - the-case-for-silence: silence and physical action as dramatic turning points
 * - vocabulary-and-characterization: inside-out method for character-specific vocabulary
 * - word-choice-preferences: concrete/active/direct over abstract/passive/circumlocutory
 * - write-in-character: the Magic If for inhabiting character voice
 * - two-talents: story talent vs literary talent balance
 * - tv-dialogue-form: television intimacy and close-up conversation
 * - stage-dialogue-form: theatrical poetic license and heightened language
 */
export async function evaluateDialogueCraft(
  text: string,
  targetAudience: string = "general"
): Promise<DialogueCriticResult> {
  const prompt = `
You are an expert dialogue craft editor trained in [MASTER_THEORIST]'s dialogue principles.
Your task is to evaluate a story excerpt for DIALOGUE CRAFT QUALITY.

Target Audience: ${targetAudience}

## Your Knowledge Base ([MASTER_THEORIST]'s Dialogue Principles)

### HIGH-VALUE CRITERIA (11 Skills)

#### Action vs Activity (action-vs-activity)
ACTION = dialogue that changes the dynamic between characters, shifts power, reveals truth.
ACTIVITY = dialogue that fills space without consequence (greetings, small talk, pleasantries).
Every line must DO something: threaten, seduce, confess, accuse, deflect, reveal, conceal.
If a line can be removed without changing the scene, it is activity—cut it.

#### Dialogue as Action (dialogue-as-action)
Dialogue is not conversation—it is VERBAL ACTION.
Each utterance is a tactical move in a conflict: attack, parry, feint, retreat, surprise.
Characters use words the way warriors use weapons—to advance their desire against opposition.
Dialogue without tactical purpose is dead weight.

#### Clichés and Neutral Language (cliches-and-neutral-language)
Clichéd dialogue ("We need to talk," "It's not what it looks like") signals a writer
reaching for stock phrases rather than finding the character's unique voice.
Every character must speak in their own idiom—shaped by class, education, region, era.
Neutral language (generic, interchangeable speech) erases character identity.

#### Exposition in Dialogue (exposition-in-dialogue)
Characters should NEVER tell each other things they both already know.
"As you know, Bob" exposition is the cardinal sin of dialogue craft.
Exposition must be HIDDEN inside conflict—slipped in when the audience is distracted by drama.
The best exposition is delivered when the audience WANTS it, not when the writer needs to dump it.

#### Exposition as Ammunition (exposition-as-ammunition)
Information becomes dramatic when it is WEAPONIZED—used as a tool in conflict.
A secret revealed under pressure is a grenade. A fact stated calmly is a lecture.
Backstory should be revealed only when it can wound, change, or destroy.
The timing of a revelation is as important as its content.

#### Empty and Emotive Talk (empty-and-emotive-talk)
Characters who directly announce their emotional states ("I am angry," "I feel sad")
produce EMPTY TALK—words that carry no dramatic charge.
EMOTIVE TALK overloads dialogue with unearned sentiment—sobbing declarations, passionate speeches.
Both drain scenes of power. Emotion should emerge from ACTION, not declaration.

#### Excuses vs Motivation (excuses-vs-motivation)
Characters who neatly explain their own motivations ("The reason I did that is...")
are EXCUSING, not revealing. Real people rarely understand their own drives.
True motivation emerges from the GAP between what characters say and what they do.
Self-aware psychological explanations are the enemy of subtext.

#### Balanced Conflict (balanced-conflict)
In a well-crafted dialogue exchange, BOTH sides must have genuine power and legitimate desires.
If one character dominates while the other merely agrees, there is no conflict—only monologue.
The balance should shift moment to moment: attack, counterattack, reversal.
Every exchange must be a negotiation where neither side fully controls the outcome.

#### Duelogue and Trialogue (duelogue-and-trialogue)
DUELOGUE = two characters in direct conflict, each line a thrust or parry.
TRIALOGUE = three characters, where the third introduces indirection and complexity.
In trialogue, character A may address B to actually wound C.
The geometry of dialogue (who speaks to whom, who overhears) creates dramatic richness.

#### Backstory and Revelations (backstory-and-revelations)
Backstory must be EARNED—revealed only when dramatic pressure demands it.
An unearned revelation (facts shared without stakes) is an info-dump, not drama.
The best revelations are SURPRISES that reframe everything the audience thought they knew.
Backstory delivered as a lecture to the audience through a character's mouth is the weakest form.

#### Economy and Pause (economy-and-pause)
Every word must earn its place. Cut anything that doesn't advance conflict or reveal character.
PAUSE is as powerful as speech—silence communicates what words cannot.
Dialogue should be LEAN: short lines, interrupted thoughts, incomplete sentences.
Overwritten dialogue (long speeches, multiple clauses) signals the writer, not the character.

#### Knowing and Perceptive Talk (knowing-and-perceptive-talk)
Characters who display the AUTHOR'S knowledge or clinical self-insight are PHONY.
A peasant explaining geopolitics, or a character calmly diagnosing their own trauma = author intrusion.
Real people have BLIND SPOTS. They are wrong about themselves. Self-insight is EARNED through arc.
Characters should be trapped in their own limited perspective, never the author's bird's-eye view.

#### Monologue Fallacy (monologue-fallacy)
Uninterrupted speeches of 50+ words without listener reaction are LIFELESS.
Human interaction is constant ACTION/REACTION—even a pause is a reaction.
Long speeches must be broken into tactical BEATS where the speaker shifts strategy.
If the listener is passive during a monologue, the scene has lost its dramatic pulse.

#### Melodrama (melodrama)
Melodrama = expression intensity EXCEEDING the motivation provided by stakes.
Screaming over trivialities, purple declarations for low-stakes conflicts = melodrama.
The fix is NOT in word choice—it's in STRUCTURE: raise stakes or lower volume.
UNDERSTATEMENT in high-stakes moments is often more powerful than overstatement.

#### Ostentatious and Arid Language (ostentatious-and-arid-language)
OSTENTATIOUS = self-conscious literary swagger where the "hand of the author" is visible.
Lines so "clever" the reader admires the phrasing instead of feeling the character.
ARID = dry, Latinate, clinical language that reads like a legal brief.
Both extremes break the bond of belief. Aim for TRANSPARENCY—words disappear, character remains.

#### Figurative Language (figurative-language)
DEAD METAPHORS ("raining cats and dogs") carry zero sensory impact—they are verbal wallpaper.
ALIVE METAPHORS shock the senses and condense enormous meaning into a single image.
A character's figurative language should reflect their BACKGROUND (a sailor uses sea imagery).
Cosmic metaphors for minor inconveniences = melodrama. Match figurative stakes to dramatic stakes.

#### Misshapen Scenes (misshapen-scenes)
A scene must contain a TURNING POINT where the value at stake changes charge.
If a scene ends with values exactly where they started, it is a NONEVENT.
Turning point too early = anticlimactic slide. Too late = predictable drag. Absent = no scene.
Don't fix shapeless scenes with better words—fix the STORY DESIGN (stakes, motivation, turn).

### ENRICHMENT CRITERIA (17 Skills)

#### Text and Subtext (text-and-subtext)
TEXT = the words spoken aloud.
SUBTEXT = the true meaning beneath the words.
The richest dialogue has maximum gap between text and subtext.
When text and subtext align (on-the-nose), dialogue dies.

#### The Said, The Unsaid, The Unsayable
- THE SAID: surface-level communication (what characters explicitly state).
- THE UNSAID: what characters deliberately withhold (secrets, fears, desires).
- THE UNSAYABLE: what cannot be expressed in words (trauma, profound love, existential dread).
Great dialogue operates on all three levels simultaneously.

#### Verbal Action (verbal-action)
Every line of dialogue is an ACTION with a VERB: to threaten, to seduce, to console, to dismiss.
Identifying the verbal action of each line reveals whether the dialogue is working.
Lines without clear verbal actions are padding.

#### Writing on the Nose (writing-on-the-nose)
On-the-nose dialogue occurs when characters say EXACTLY what they mean.
Real people deflect, lie, change the subject, talk about the weather when they mean goodbye.
The cure for on-the-nose writing is to ask: what would the character say INSTEAD of the truth?

#### Characterization Through Dialogue (characterization-through-dialogue)
Each character must have a DISTINCTIVE VOICE—vocabulary, rhythm, syntax, idiom.
If dialogue tags were removed, readers should still identify who is speaking.
Speech patterns reveal education, class, region, era, psychology, and emotional state.

#### Indirect Dialogue (indirect-dialogue)
INDIRECT DIALOGUE = reported speech ("She told him she was leaving").
Used strategically, it can compress time, create distance, or imply unreliable narration.
Overuse strips emotional immediacy from scenes.

#### Showing vs Telling (showing-vs-telling)
SHOWING = dramatized scenes with real-time dialogue and action.
TELLING = summary narration that reports what was said.
Crucial moments must be SHOWN, not told. Transitions may be told.
The ratio of showing to telling determines the scene's emotional impact.

#### Indirect Conflict (indirect-conflict)
In prose, conflict can operate THROUGH description layered over polite dialogue.
Characters speak pleasantly while the narrative reveals "tense shoulders" or "cold eyes."
What is NOT said is more important than what is. Objects reflect tension (a glass breaking).
Politeness as a MASK—characters perform for each other while conflict simmers beneath.

#### Minimal Conflict (minimal-conflict)
Minimal conflict achieves maximum emotional impact through ECONOMY of language.
Simple text, complex subtext. Past SHADOWS press on every word of the present.
Trust the audience to FEEL the tension—if a character says "I'm sad," the minimal is lost.
Challenge: express pivotal emotion in five words or fewer per character.

#### Narrative Drive (narrative-drive)
Narrative drive = the force that makes readers ask "What happens next?"
Properly timed REVELATIONS create hooks—each new fact changes the character's tactical situation.
Exposition becomes invisible when the reader WANTS the information to solve a mystery.
If exposition doesn't raise stakes or change the plan, it's not contributing to drive.

#### Narratized Dialogue (narratized-dialogue)
Characters may step outside the scene to address the reader, the audience, or themselves.
Language changes depending on ADDRESSEE: self-to-self is raw; to-reader is performative.
Narratized dialogue can provide TRUTH that contradicts dramatized actions.
Define the target clearly—the character must know who they are addressing.

#### Line Design (line-design)
PERIODIC sentence: withholds the core word until the end (builds suspense, best for punchlines).
CUMULATIVE sentence: core word first, then modifiers (conversational, natural).
BALANCED sentence: core word in the middle (intellectual control, stability).
Mix designs for natural rhythm. Never put a word after the shock or the laugh.

#### Locution and Culture (locution-and-culture)
Characters speak from the CENTER of an absorbed culture—media, hobbies, religion, profession.
Cultural ICONS provide analogies: a farmer uses earth imagery, a programmer uses code metaphors.
Instead of "He's really big," use a cultural comparison: "He's the [MONSTER_FILM] of the mailroom."
Generic speech erases character. Cultural specificity creates voice.

#### Film Dialogue Form (film-dialogue-form)
The camera MAGNIFIES falsity—film demands naturalism more than theatre.
If a LOOK can say it, delete the line. Ground speech in physical activity.
Three exceptions to naturalism: stylized realism, nonrealism, extreme characters.
Scripted naturalism is a constructed illusion—not improvisation, but the impression of life.

#### Incredibility (incredibility)
Credibility = FICTIONAL AUTHENTICITY (true to character and world), not mimicking real speech.
Adding "um" and "uh" doesn't fix incredibility—it just makes dialogue messy.
Causes: exposition on the nose, consistency failure, lack of subtext.
The test: "Would THIS character say this NOW?"—not "Would a person say this?"

#### Paralanguage (paralanguage)
Paralanguage = gesture, body language, tone, proximity that ENHANCES or CONTRADICTS spoken words.
Contradiction creates subtext: a nod with "No" or a fist clench with "I'm fine."
Generic beats ("he sighed," "she smiled") are filler—find specific, character-driven actions.
Every character should have a nonverbal TELL when lying, stressed, or attracted.

#### Reflexive Conflict (reflexive-conflict)
Reflexive conflict = a character's consciousness SPLITS into warring selves.
Not just thinking—internal warfare where competing drives argue, confess, deny, and plead.
Stream of consciousness or direct confession: both must contain genuine resistance.
If the character agrees with themselves too quickly, there is no conflict.

#### Repetition Flaw (repetition-flaw)
If a character begs three times in different words, that is ONE beat repeated three times.
The law of diminishing returns: each repetition weakens the impact.
Write every option, then choose the SINGLE strongest version and cut the rest.
"Real people repeat themselves" is no defense—fiction must be life with the boring parts cut.

#### Scene Design Components (scene-design-components)
Dialogue is the SKIN of a story. If the skeleton (story design) is broken, the skin sags.
Every scene needs: an inciting incident, a value at stake, a desire complex, forces of antagonism.
If dialogue feels repetitive, the STORY isn't progressing—you're circling the same conflict.
Fix the design (desire, antagonism, turn) before fixing the words.

#### The Case for Silence (the-case-for-silence)
Silence is the ultimate economy. The choice to remain silent can be the most dramatic action.
Replace talk with OBJECTS: a character handing something says more than words.
Silence is most effective when it follows intense verbal conflict—EARN the silence.
The "Mute Test": if you turned off the sound, would you understand the emotional core?

#### Vocabulary and Characterization (vocabulary-and-characterization)
NOUNS and VERBS express knowledge. MODIFIERS express personality.
The Inside-Out Method: start within the character's history, profession, and obsession.
A botanist says "Hydrangea macrophylla," not "flower." A carpenter says "badly sanded," not "rough."
The more RESTRICTED a character's vocabulary, the more brilliant the feat of expression.

#### Word Choice Preferences (word-choice-preferences)
Eight preferences: Concrete > Abstract, Familiar > Exotic, Short > Long, Direct > Circumlocution,
Active > Passive, Short speeches > Long, Expressive > Mimicry, Eliminate clutter.
Germanic words (short, punchy) carry EMOTION. Latinate words carry INTELLECT.
Only deviate from these rules when you have a specific CHARACTER reason to do so.

#### Write in Character (write-in-character)
The writer is the FIRST ACTOR—slipping into each role to see the world from their POV.
The Magic If: "If I were this character, in these circumstances, what would I say?"
Outside-In = research and observation. Inside-Out = inhabitation and emotional truth.
When dialogue feels false, the problem is usually insufficient INHABITATION, not word choice.

#### Two Talents (two-talents)
Story Talent (inner design) + Literary Talent (verbal finish) = quality dialogue.
Dialogue failures are often STORY DESIGN failures, not vocabulary failures.
The Iceberg: only 10% of the character's reality is spoken. 90% is subtext.
If you speak the subtext, you MELT the iceberg. Keep the subtext deep.

#### Prose Dialogue Form (prose-dialogue-form)
Prose can move seamlessly between external speech and internal thought.
Six tactics: direct dialogue, indirect dialogue, free indirect speech, internal monologue,
stream of consciousness, and mental dialogue (character arguing with imagined other).
Free indirect style blurs narrator and character—the narrator ADOPTS the character's idiom.

#### TV/Film/Stage Forms (media-specific)
Each medium demands different dialogue conventions based on its relationship to image and voice.
Film MAGNIFIES falsity—if a look can say it, delete the line.
TV favors INTIMACY and face-to-face close-ups over spectacle.
Stage licenses HEIGHTENED, poetic language that would feel false in naturalistic media.

## What to Check

1. Does every line of dialogue perform a DRAMATIC ACTION (not just fill space)?
2. Is dialogue free of CLICHÉD stock phrases?
3. Is exposition HIDDEN inside conflict, not dumped through "as you know"?
4. Do characters SHOW emotion through action rather than STATING it directly?
5. Is there genuine CONFLICT with pushback in every exchange?
6. Is backstory WEAPONIZED under pressure, not delivered as lectures?
7. Does dialogue have SUBTEXT (gap between said and meant)?
8. Are character VOICES distinctive and individual?
9. Is there ECONOMY (every word earns its place, silence used effectively)?
10. Do power dynamics SHIFT during the exchange?
11. Are characters limited to their OWN knowledge (no author intrusion or impossible self-insight)?
12. Are long speeches broken into BEATS with listener reaction (no monologue fallacy)?
13. Is emotional intensity PROPORTIONAL to the stakes (no melodrama)?
14. Is language TRANSPARENT (neither ostentatiously literary nor clinically arid)?
15. Are metaphors ALIVE and sensory (no dead metaphors or clichéd figures)?
16. Does the scene contain a TURNING POINT where values change charge (no shapeless nonevents)?
17. Is text different from subtext (no on-the-nose writing where characters say exactly what they mean)?
18. Is each dramatic beat used ONCE with maximum impact (no repetition flaw)?
19. Do characters SHOW through action rather than TELL through explanation?
20. Is language CONCRETE, ACTIVE, and DIRECT (no abstract/passive/circumlocutory speech)?
21. Do different characters have DISTINCTIVE VOICES (no indistinct vocabulary overlap)?

## Output Format

Output valid JSON only with the following schema:
{
  "label": "good" | "bad",
  "score": number,  // 0.0 to 1.0 (1.0 = masterful dialogue craft)
  "reasoning": string,  // brief explanation referencing specific [MASTER_THEORIST] dialogue principles
  "flaws": string[]  // specific flaw tags, empty if good. Use tags like:
    // "purposeless_chitchat", "dialogue_cliche", "as_you_know_bob",
    // "on_the_nose_emotion", "no_dialogue_conflict", "unweaponized_exposition",
    // "flat_duelogue", "info_dump", "redundant_recap",
    // "disproportionate_emotion", "no_power_shift", "missing_subtext_action",
    // "filler_talk", "neat_self_explanation",
    // "knowing_talk", "author_intrusion", "monologue_fallacy",
    // "melodramatic_expression", "ostentatious_language", "arid_language",
    // "dead_metaphor", "shapeless_scene", "no_turning_point",
    // "incredibility", "consistency_failure",
    // "on_the_nose_writing", "repetition_flaw", "telling_not_showing",
    // "abstract_language", "passive_voice", "indistinct_voices",
    // "no_paralanguage", "generic_beats"
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

    const result = JSON.parse(cleanResponse) as DialogueCriticResult;

    if (
      !["good", "bad"].includes(result.label) ||
      typeof result.score !== "number" ||
      typeof result.reasoning !== "string" ||
      !Array.isArray(result.flaws)
    ) {
      throw new Error("Invalid schema returned by Dialogue Critic LLM");
    }

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Dialogue Critic evaluation failed: ${message}`);
  }
}
