import type { HarnessContext } from "../types";

const FENCE = "`" + "`" + "`";

/**
 * Builds the LLM extraction prompt for narrative structure analysis (Phase A of Tier 2).
 *
 * This prompt instructs Flash-Lite to parse a narrative draft into a structured
 * NarrativeGraph JSON — extracting turning values, stakes, protagonist desires,
 * theme deliveries, conflicts, and premise/counter-premise pairs.
 *
 * Based on [MASTER_THEORIST]'s story principles: every scene must turn a value, stakes must
 * escalate, theme is shown not stated, and conflict is the engine of story.
 */
export function buildNarrativeExtractionPrompt(
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
          "Cross-reference narrative events and world rules with these lore entries.",
        ].join("\n")
      : "";

  const beatsSection =
    context.previousBeats.length > 0
      ? [
          "",
          "## Previous Story Beats",
          ...context.previousBeats.map((b, i) => (i + 1) + ". " + b),
          "",
          "Stakes and conflicts established in previous beats carry forward. Values should build on prior turning points.",
        ].join("\n")
      : "";

  const schemaExample = [
    FENCE + "json",
    JSON.stringify(
      {
        turningValues: [
          {
            scene: "...",
            valueBefore: "...",
            valueAfter: "...",
            changed: true,
            location: "...",
          },
        ],
        stakes: [
          {
            description: "...",
            level: "personal",
            order: 1,
            escalatesFromPrevious: false,
          },
        ],
        protagonistDesires: [
          {
            character: "...",
            goal: "...",
            hasGoal: true,
            obstaclePresent: true,
          },
        ],
        themeDeliveries: [
          {
            theme: "...",
            delivery: "shown",
            location: "...",
          },
        ],
        conflicts: [
          {
            type: "inner",
            description: "...",
            parties: ["..."],
            resolved: false,
          },
        ],
        premiseCounterPremise: [
          {
            premise: "...",
            counterPremise: "...",
            counterPresent: true,
          },
        ],
        moralChoices: [
          {
            character: "...",
            dilemma: "...",
            location: "...",
            nearClimax: true,
          },
        ],
        catharsisPresent: true,
        thematicRevelation: "...",
        journeyStages: [
          {
            stage: "call_to_adventure",
            description: "...",
            location: "...",
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
        turningValues: [
          {
            scene: "The courtroom verdict",
            valueBefore: "hope",
            valueAfter: "despair",
            changed: true,
            location: "paragraph 3",
          },
          {
            scene: "[CHARACTER_NAME_ELENA] discovers the evidence",
            valueBefore: "ignorance",
            valueAfter: "knowledge",
            changed: true,
            location: "paragraph 5",
          },
        ],
        stakes: [
          {
            description: "[CHARACTER_NAME_ELENA] risks losing her law license",
            level: "professional",
            order: 1,
            escalatesFromPrevious: false,
          },
          {
            description: "[CHARACTER_NAME_ELENA]'s client faces life imprisonment",
            level: "life_death",
            order: 2,
            escalatesFromPrevious: true,
          },
        ],
        protagonistDesires: [
          {
            character: "[CHARACTER_NAME_ELENA]",
            goal: "prove her client's innocence",
            hasGoal: true,
            obstaclePresent: true,
          },
        ],
        themeDeliveries: [
          {
            theme: "justice is not the same as law",
            delivery: "shown",
            location: "paragraph 3 — the guilty verdict despite innocence",
          },
        ],
        conflicts: [
          {
            type: "extra_personal",
            description: "[CHARACTER_NAME_ELENA] vs the corrupt legal system",
            parties: ["[CHARACTER_NAME_ELENA]", "Judge Morrison", "the prosecution"],
            resolved: false,
          },
          {
            type: "inner",
            description: "[CHARACTER_NAME_ELENA]'s duty to the law vs her belief in her client",
            parties: ["[CHARACTER_NAME_ELENA]"],
            resolved: false,
          },
        ],
        premiseCounterPremise: [
          {
            premise: "The legal system delivers justice",
            counterPremise: "The legal system protects the powerful",
            counterPresent: true,
          },
        ],
        moralChoices: [
          {
            character: "[CHARACTER_NAME_ELENA]",
            dilemma: "use the suppressed evidence to save her client but destroy her career, or follow the rules and let an innocent man be imprisoned",
            location: "paragraph 5 — discovering the evidence",
            nearClimax: true,
          },
        ],
        catharsisPresent: true,
        thematicRevelation: "True justice requires personal sacrifice — the system fails when individuals choose comfort over conscience",
        journeyStages: [
          {
            stage: "ordinary_world",
            description: "[CHARACTER_NAME_ELENA] is a respected defense attorney following the rules",
            location: "paragraph 1",
          },
          {
            stage: "call_to_adventure",
            description: "Her client is found guilty despite her certainty of his innocence",
            location: "paragraph 3",
          },
          {
            stage: "ordeal",
            description: "She discovers the suppressed evidence and faces the choice between career and justice",
            location: "paragraph 5",
          },
          {
            stage: "reward",
            description: "She possesses the evidence that can save her client",
            location: "paragraph 5",
          },
        ],
      },
      null,
      2
    ),
    FENCE,
  ].join("\n");

  return [
    "You are a narrative structure analyst for storytelling. Your task is to extract ALL structural elements from the draft below into a structured JSON object called a NarrativeGraph.",
    "",
    "## Instructions",
    "",
    "Read the draft carefully and extract EVERY instance of the following:",
    "",
    "### 1. Turning Values",
    "- For EVERY scene or significant story beat, identify the value that turns.",
    "- valueBefore: the emotional/thematic state at the start of the scene (e.g., \"hope\", \"trust\", \"safety\").",
    "- valueAfter: the emotional/thematic state at the end of the scene (e.g., \"despair\", \"betrayal\", \"danger\").",
    "- changed: did the value actually shift? A scene where nothing changes is a non-event.",
    "- CRITICAL: Every scene MUST turn a value. A scene that begins and ends in the same emotional/thematic state has no dramatic purpose. Common value pairs: hope/despair, trust/betrayal, safety/danger, ignorance/knowledge, love/hate, freedom/captivity.",
    "",
    "### 2. Stakes",
    "- Identify what is at risk in the story and classify the level.",
    "- level: the magnitude of what can be lost:",
    '  - "personal": emotional well-being, relationships, self-respect',
    '  - "professional": career, reputation, social standing',
    '  - "life_death": physical survival, life-threatening danger',
    '  - "societal": community, civilization, the fate of many',
    "- order: sequence number indicating when this stake is introduced (1, 2, 3...).",
    "- escalatesFromPrevious: does this stake raise the level from the previous one?",
    "- CRITICAL: Stakes MUST escalate progressively. A story that begins with life-or-death stakes has nowhere to go. The best narratives start personal and build to societal (or at least escalate within their level). If stakes remain flat or decrease, that is a structural weakness.",
    "",
    "### 3. Protagonist Desires",
    "- For each protagonist or major character, identify their goal.",
    "- goal: what the character is actively pursuing in this draft.",
    "- hasGoal: does the character have a discernible objective? A protagonist without a goal is a protagonist without a story.",
    "- obstaclePresent: is there something or someone actively opposing the goal? Desire without opposition produces no drama.",
    "- CRITICAL: Story = Desire + Obstacle. If a character wants something but faces no resistance, there is no conflict and therefore no story.",
    "",
    "### 4. Theme Deliveries",
    "- Identify how the story's themes are communicated.",
    "- theme: the thematic idea (e.g., \"power corrupts\", \"love requires sacrifice\").",
    "- delivery: HOW the theme is conveyed:",
    '  - "shown": demonstrated through story events, character choices, and consequences (BEST)',
    '  - "stated": articulated by a character or narrator but still embedded in the story',
    '  - "didactic": preached at the audience, lectured, or forced (WORST)',
    "- CRITICAL: Theme should be SHOWN through story events, not STATED didactically. If a character gives a speech about the theme or the narrator lectures the reader, that is didactic delivery — a craft weakness. The best themes emerge from the audience's own observation of events.",
    "",
    "### 5. Conflicts",
    "- Identify every layer of conflict in the draft.",
    "- type: the level of conflict:",
    '  - "inner": character vs self (internal contradiction, moral dilemma)',
    '  - "personal": character vs character (interpersonal opposition)',
    '  - "extra_personal": character vs institution, society, nature, or fate',
    '  - "none": no discernible conflict (a structural problem)',
    "- parties: the entities involved in the conflict.",
    "- resolved: is the conflict resolved within this draft?",
    "- CRITICAL: Conflict is the engine of story. No conflict = no story. The richest narratives operate on multiple levels simultaneously (inner AND personal AND extra-personal). If only one level is present, the story may lack depth.",
    "",
    "### 6. Premise and Counter-Premise",
    "- Identify the story's central argument (premise) and its opposing argument (counter-premise).",
    "- premise: the thematic proposition the story seems to advance (e.g., \"Love conquers all\").",
    "- counterPremise: the opposing argument that challenges the premise (e.g., \"Love blinds us to danger\").",
    "- counterPresent: is the counter-argument actually represented in the story by characters, events, or consequences?",
    "- CRITICAL: A story that only argues one side of its premise is propaganda, not drama. The counter-premise must be genuinely represented — ideally by sympathetic characters or compelling events — so that the audience feels the pull of both sides.",
    "",
    "### 7. Moral Choices",
    "- Identify every genuine moral dilemma in the story — moments where a character must choose between competing moral values.",
    "- character: who faces the dilemma.",
    "- dilemma: description of the moral choice (e.g., \"save one loved one or save many strangers\").",
    "- location: where in the draft this occurs.",
    "- nearClimax: is this moral choice near the story's climax?",
    "- CRITICAL: A story without a defining moral choice near the climax lacks thematic weight. The protagonist's response to a genuine moral dilemma reveals their deepest values and provides the story's ultimate meaning.",
    "",
    "### 8. Catharsis",
    "- catharsisPresent: does the story build to an emotional release? Set to true if the accumulated tension and emotion culminate in a moment of purgation or relief — whether through resolution, tragedy, or revelation.",
    "- CRITICAL: Catharsis is the audience's emotional reward for investing in the story. A narrative that builds tension but never releases it leaves the audience unsatisfied.",
    "",
    "### 9. Thematic Revelation",
    "- thematicRevelation: a universal insight or truth about the human condition that emerges from the story, beyond the personal character arc. (e.g., \"Power without accountability inevitably corrupts\"). Set to empty string if no such insight is evident.",
    "- CRITICAL: The greatest stories deliver a truth that transcends the specific characters and events — a universal insight that resonates beyond the narrative itself.",
    "",
    "### 10. Hero's Journey Stages",
    "- Identify which stages of the Hero's Journey are present in the draft.",
    "- stage: one of: \"ordinary_world\", \"call_to_adventure\", \"refusal\", \"meeting_mentor\", \"crossing_threshold\", \"tests_allies_enemies\", \"approach\", \"ordeal\", \"reward\", \"road_back\", \"resurrection\", \"return_with_elixir\".",
    "- description: how this stage manifests in the story.",
    "- location: where in the draft this stage occurs.",
    "- CRITICAL: Not every story will contain all 12 stages, but a well-structured narrative should have at least several identifiable structural stages that provide narrative backbone. Stories with fewer than 4 identifiable stages may lack structural foundation.",
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
    "The jury foreman stood. [CHARACTER_NAME_ELENA] gripped the edge of the defense table, knuckles white. \"Guilty.\" The word dropped like a stone. Her client — innocent, she was certain — sagged in his chair. Outside, Judge Morrison shook hands with the prosecutor. [CHARACTER_NAME_ELENA] found the suppressed evidence folder in her briefcase. She could use it. It would save her client. It would also end her career.",
    "",
    "**Output:**",
    fewShotExample,
    "",
    "Be exhaustive. Every scene turn, every stake, every conflict must be captured. Missing a structural element means a narrative flaw goes undetected.",
  ].join("\n");
}
