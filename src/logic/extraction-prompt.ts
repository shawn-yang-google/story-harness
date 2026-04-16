import type { HarnessContext } from "../types";

const FENCE = "```";

/**
 * Builds the LLM extraction prompt for Phase A of the Tier 2 hybrid pipeline.
 *
 * This prompt instructs Flash-Lite to parse a narrative draft into a structured
 * LogicGraph JSON — extracting propositions, events, knowledge, obligations,
 * world rules, and entity states.
 *
 * The extraction prompt is expert-crafted and fixed. The tree-search synthesizer
 * can optionally append a domain-specific addendum for specialized harnesses.
 */
export function buildExtractionPrompt(
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
          "Cross-reference entity states with these lore entries. Any contradiction should be captured.",
        ].join("\n")
      : "";

  const beatsSection =
    context.previousBeats.length > 0
      ? [
          "",
          "## Previous Story Beats",
          ...context.previousBeats.map((b, i) => (i + 1) + ". " + b),
          "",
          "Knowledge and state established in previous beats carries forward.",
        ].join("\n")
      : "";

  const schemaExample = [
    FENCE + "json",
    JSON.stringify(
      {
        propositions: [
          {
            id: "p1",
            text: "...",
            subject: "...",
            predicate: "...",
            truth: true,
            location: "...",
          },
        ],
        rules: [
          {
            id: "r1",
            antecedent: "p1",
            consequent: "p2",
            type: "conditional",
            source: "narrative",
            location: "...",
          },
        ],
        conclusions: [
          {
            claim: "...",
            premises: ["p1"],
            inferenceType: "modus_ponens",
            location: "...",
          },
        ],
        events: [
          {
            id: "e1",
            description: "...",
            agent: "...",
            order: 1,
            location: "...",
          },
        ],
        temporalConstraints: [
          { before: "e1", after: "e2", type: "causal", satisfied: true },
        ],
        stateChanges: [
          {
            entity: "...",
            attribute: "...",
            from: "...",
            to: "...",
            atEvent: "e1",
          },
        ],
        knowledge: [
          { agent: "...", knows: "...", since: "e1", how: "witnessed" },
        ],
        abilities: [{ agent: "...", can: "...", established: "backstory" }],
        obligations: [
          { agent: "...", must: "...", source: "...", fulfilled: null },
        ],
        prohibitions: [
          {
            agent: "...",
            mustNot: "...",
            source: "...",
            violated: null,
            consequenceAcknowledged: false,
          },
        ],
        worldRules: [{ rule: "...", type: "necessary", source: "..." }],
        inventory: [
          { agent: "...", item: "...", acquiredAt: "e1", status: "held" },
        ],
        locations: [{ agent: "...", location: "...", atEvent: "e1" }],
        statuses: [{ agent: "...", state: "alive", since: "e1" }],
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
        propositions: [
          {
            id: "p1",
            text: "Elara never learned to swim",
            subject: "Elara",
            predicate: "can_swim",
            truth: false,
            location: "sentence 1",
          },
          {
            id: "p2",
            text: "Elara dove into the deep lake (implies she can swim)",
            subject: "Elara",
            predicate: "can_swim",
            truth: true,
            location: "sentence 1",
          },
          {
            id: "p3",
            text: "Treasure is at the bottom of the lake",
            subject: "treasure",
            predicate: "at_lake_bottom",
            truth: true,
            location: "sentence 2",
          },
        ],
        rules: [],
        conclusions: [],
        events: [
          {
            id: "e1",
            description: "Elara dove into the deep lake",
            agent: "Elara",
            order: 1,
            location: "sentence 1",
          },
          {
            id: "e2",
            description: "Elara overheard the merchant about the treasure",
            agent: "Elara",
            order: 0,
            location: "sentence 2 (flashback)",
          },
        ],
        temporalConstraints: [
          { before: "e2", after: "e1", type: "causal", satisfied: false },
        ],
        stateChanges: [],
        knowledge: [
          {
            agent: "Elara",
            knows: "treasure location at lake bottom",
            since: "e2",
            how: "witnessed",
          },
        ],
        abilities: [{ agent: "Elara", can: "swim", established: "never" }],
        obligations: [],
        prohibitions: [],
        worldRules: [],
        inventory: [],
        locations: [{ agent: "Elara", location: "deep lake", atEvent: "e1" }],
        statuses: [{ agent: "Elara", state: "alive", since: "e1" }],
      },
      null,
      2
    ),
    FENCE,
  ].join("\n");

  return [
    "You are a formal logic analyst for narrative text. Your task is to extract ALL logical elements from the draft below into a structured JSON object called a LogicGraph.",
    "",
    "## Instructions",
    "",
    "Read the draft carefully and extract EVERY instance of the following:",
    "",
    "### 1. Propositions",
    "- Any factual claim about a character, object, or world state.",
    "- Assign each a unique id (p1, p2, ...).",
    '- Normalize the predicate to a snake_case key (e.g., "afraid_of_dark").',
    "- Set truth=true for assertions, truth=false for negations.",
    "- CRITICAL: When a text says X AND later says NOT X (or vice versa), extract BOTH as separate propositions with the SAME subject and predicate but OPPOSITE truth values. This is how contradictions (P \u2227 \u00ACP) are detected.",
    '  Example: "She read the map" (truth=true, predicate=read_map) AND "She had never seen the map" (truth=false, predicate=read_map) \u2192 both must be extracted.',
    "- Also extract implicit propositions. If a character performs an action that requires an ability (e.g., swimming), extract it as a proposition (truth=true, predicate=can_swim).",
    "",
    "### 2. Conditional Rules",
    '- Any "if X then Y", "X cannot Y unless Z", or implied causal rule.',
    "- Use proposition ids for antecedent/consequent when possible.",
    '- Set type="biconditional" for "if and only if" relationships.',
    '- Set source="lore" if the rule comes from the lore database.',
    "",
    "### 3. Conclusions",
    '- Any "therefore", "concluded", "must have", or inferential statement.',
    "- Also include character observations that lead to deductions (e.g., a detective observing evidence and reaching a conclusion).",
    "- List ALL premise proposition ids. If a character observes physical evidence (scratches, blood, etc.) and deduces something, the observation IS a premise \u2014 extract the observation as a proposition first, then list it as a premise for the conclusion.",
    "- Only use inferenceType=\"unsupported\" when there are truly NO premises anywhere in the preceding text. Evidence-based deductions are \"modus_ponens\" or \"other\", NOT \"unsupported\".",
    "- Classify the inferenceType:",
    '  - "modus_ponens" (valid: P\u2192Q, P \u22A2 Q)',
    '  - "modus_tollens" (valid: P\u2192Q, \u00ACQ \u22A2 \u00ACP)',
    '  - "affirming_consequent" (INVALID: P\u2192Q, Q \u22A2 P)',
    '  - "denying_antecedent" (INVALID: P\u2192Q, \u00ACP \u22A2 \u00ACQ)',
    '  - "other" (valid reasoning that doesn\'t fit the above, including abductive/inductive reasoning from evidence)',
    '  - "unsupported" (truly no premises \u2014 conclusion appears from nowhere)',
    "",
    "### 4. Temporal Events",
    "- Every action, occurrence, or state transition in sequential order.",
    "- Assign order numbers starting from 1.",
    "- Include the agent (character) performing/experiencing the event.",
    "",
    "### 5. Temporal Constraints",
    "- Any prerequisite or causal ordering between events.",
    '- E.g., "must learn magic before casting a spell" \u2192 before=learning_event, after=casting_event.',
    "",
    "### 6. State Changes",
    "- When an entity's attribute changes value (e.g., door: locked\u2192unlocked).",
    "",
    "### 7. Knowledge (Epistemic)",
    "- What each character knows and HOW they learned it.",
    '- CRITICAL: Set how="unexplained" if no source of knowledge is established.',
    "- If knowledge is used before the learning event, note the event ids.",
    "",
    "### 8. Abilities",
    "- What each character can or cannot do.",
    '- Set established="never" if the narrative says they cannot/have never learned to.',
    '- Set established="backstory" if it\'s implied from character background.',
    "- CRITICAL: If the narrative says a character CANNOT do X (e.g., \"never learned to swim\") but then the character DOES X (e.g., dives into water), you MUST still extract the ability with established=\"never\". The contradiction will be caught by the verifier. Do NOT resolve the contradiction yourself \u2014 extract the stated inability faithfully.",
    "",
    "### 9. Obligations & Prohibitions (Deontic)",
    "- Oaths, vows, promises, rules, laws, codes.",
    "- Track whether fulfilled/violated and whether consequences are acknowledged.",
    "",
    "### 10. World Rules (Modal)",
    '- Universal narrative rules: "Only X can Y", "Z is impossible".',
    '- type="necessary" for required preconditions.',
    '- type="impossible" for things that cannot happen.',
    "",
    "### 11. Entity State (Inventory, Location, Status)",
    "- Track what characters carry, where they are, and their condition.",
    "- For inventory: track acquisition and consumption events.",
    '- For status: "alive", "dead", "unconscious", "poisoned", etc.',
    loreSection,
    beatsSection,
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
    '"Elara, who had never learned to swim, cheerfully dove into the deep lake. She knew the treasure was at the bottom because she had overheard the merchant."',
    "",
    "**Output:**",
    fewShotExample,
    "",
    "Be exhaustive. Missing an element means a logic error goes undetected.",
  ].join("\n");
}
