import { describe, it, expect, mock } from "bun:test";
import { evaluateDialogueCraft } from "./dialogue-critic";

//#given a mocked LLM that returns valid JSON for dialogue craft evaluation
mock.module("../llm", () => ({
  MODELS: {
    CRITIC: "gemini-2.5-pro",
  },
  generateContent: mock(async (_model: string, prompt: string) => {
    // Detect scenario from the prompt content to return appropriate mock
    if (prompt.includes("weaponized") && prompt.includes("cornered")) {
      return JSON.stringify({
        label: "good",
        score: 0.93,
        reasoning:
          "Dialogue driven by conflict with weaponized exposition. Each line performs a tactical action. Revelations are pressure-forced. Beat-by-beat power shifts between speakers. No filler or pleasantries.",
        flaws: [],
      });
    }
    if (prompt.includes("Hello") && prompt.includes("How are you") && prompt.includes("Nice weather")) {
      return JSON.stringify({
        label: "bad",
        score: 0.12,
        reasoning:
          "Pure purposeless chitchat. Multiple greeting fillers with no dramatic action beneath. Lines could be removed without affecting the story. No conflict, no subtext, no tactical purpose.",
        flaws: ["purposeless_chitchat", "filler_talk", "no_dialogue_conflict"],
      });
    }
    if (prompt.includes("As you know") && prompt.includes("been partners for")) {
      return JSON.stringify({
        label: "bad",
        score: 0.15,
        reasoning:
          "Classic 'As you know, Bob' forced exposition. Characters tell each other facts they both already know purely for the audience's benefit. Information is dumped rather than weaponized.",
        flaws: ["as_you_know_bob", "unweaponized_exposition", "info_dump"],
      });
    }
    if (prompt.includes("I am angry") && prompt.includes("I feel betrayed") && prompt.includes("I am sad")) {
      return JSON.stringify({
        label: "bad",
        score: 0.16,
        reasoning:
          "Every character directly states their emotional state. Zero subtext beneath the dialogue. No gap between what characters say and what they mean. Violates action-vs-activity principle.",
        flaws: ["on_the_nose_emotion", "missing_subtext_action", "no_dialogue_conflict"],
      });
    }
    if (prompt.includes("abandonment issues") && prompt.includes("defense mechanisms")) {
      return JSON.stringify({
        label: "bad",
        score: 0.07,
        reasoning:
          "Character displays clinical self-insight impossible for a warrior. Author intrusion: the character speaks with a therapist's vocabulary about their own psyche. Real people have blind spots.",
        flaws: ["knowing_talk", "author_intrusion", "neat_self_explanation"],
      });
    }
    if (prompt.includes("dear friends") && prompt.includes("standing here before you today") && prompt.includes("podium")) {
      return JSON.stringify({
        label: "bad",
        score: 0.06,
        reasoning:
          "Uninterrupted 150+ word monologue with zero listener reaction. No tactical beats or shifts in strategy. Pure info-dump delivered as a speech with no dramatic resistance.",
        flaws: ["monologue_fallacy", "info_dump", "unweaponized_exposition"],
      });
    }
    if (prompt.includes("forgot to buy milk") && prompt.includes("CRUMBLING") && prompt.includes("DESTROYED")) {
      return JSON.stringify({
        label: "bad",
        score: 0.05,
        reasoning:
          "Melodramatic expression: cosmic emotional outburst over a trivial domestic oversight. Expression intensity wildly exceeds the stakes provided by the scene. Structural failure, not a word-choice issue.",
        flaws: ["melodramatic_expression", "disproportionate_emotion", "on_the_nose_emotion"],
      });
    }
    if (prompt.includes("Let me be honest") && prompt.includes("really saying") && prompt.includes("The point I am making")) {
      return JSON.stringify({
        label: "bad",
        score: 0.06,
        reasoning:
          "Pure on-the-nose writing: every line announces exactly what the character thinks with zero gap between text and subtext. When text equals subtext, dialogue dies. No room for the reader to engage.",
        flaws: ["on_the_nose_writing", "filler_talk", "missing_subtext_action"],
      });
    }
    if (prompt.includes("facilitate") && prompt.includes("leverage") && prompt.includes("synergies")) {
      return JSON.stringify({
        label: "bad",
        score: 0.04,
        reasoning:
          "Abstract corporate jargon masquerading as dialogue. No character would speak this way unless deliberately satirized. Prefer concrete over abstract, familiar over exotic, active over passive.",
        flaws: ["abstract_language", "incredibility", "arid_language"],
      });
    }
    if (prompt.includes("markdown")) {
      var inner = JSON.stringify({
        label: "good",
        score: 0.85,
        reasoning: "Solid dialogue craft.",
        flaws: [],
      });
      return "``" + "`json\n" + inner + "\n``" + "`";
    }
    // Default fallback
    return JSON.stringify({
      label: "good",
      score: 0.8,
      reasoning: "No major dialogue craft issues detected.",
      flaws: [],
    });
  }),
}));

describe("Dialogue Critic (Tier 2 Dialogue Craft)", () => {
  //#when evaluating well-crafted dialogue with weaponized exposition and conflict
  it("should label tactical conflict-driven dialogue as good with empty flaws", async () => {
    //#then the result should have label 'good', high score, and empty flaws
    const text =
      "'You knew about the shipment,' [CHARACTER_NAME_KAEL] said, placing the ledger on the table. " +
      "[CHARACTER_NAME_MIRA]'s hand stopped midway to her glass. 'I see you've been busy,' she replied. " +
      "'Not as busy as you. Page forty-seven.' He had weaponized the evidence, cornered " +
      "her with her own records. The silence that followed was a concession.";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("good");
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.flaws).toEqual([]);
  });

  //#when evaluating purposeless chitchat with no dramatic action
  it("should label filler chitchat as bad with appropriate flaws", async () => {
    //#then the result should flag purposeless_chitchat
    const text =
      "'Hello there!' said [CHARACTER_NAME_KAEL]. 'How are you doing?' asked [CHARACTER_NAME_MIRA]. " +
      "'Nice weather we are having today,' he replied. 'Yes, it is lovely,' she agreed.";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("purposeless_chitchat");
  });

  //#when evaluating forced exposition ("As you know, Bob")
  it("should label forced exposition as bad with as_you_know_bob flaw", async () => {
    //#then the result should flag as_you_know_bob and unweaponized_exposition
    const text =
      "'As you know, we have been partners for fifteen years,' said the detective. " +
      "'And as I mentioned last week, the suspect lives on Elm Street.'";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("as_you_know_bob");
  });

  //#when evaluating on-the-nose emotional declarations
  it("should label on-the-nose emotion as bad with emotion flaws", async () => {
    //#then the result should flag on_the_nose_emotion
    const text =
      "'I am angry at you,' said [CHARACTER_NAME_KAEL]. 'I feel betrayed,' said [CHARACTER_NAME_MIRA]. " +
      "'I am sad because you lied,' [CHARACTER_NAME_KAEL] replied.";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("on_the_nose_emotion");
  });

  //#when the LLM wraps JSON in markdown code blocks
  it("should handle markdown-wrapped JSON responses gracefully", async () => {
    //#then the result should parse successfully despite markdown wrapping
    const text = "A passage that tests markdown cleaning capability.";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.flaws)).toBe(true);
  });

  //#when evaluating characters with impossible self-awareness (knowing talk)
  it("should label author-intrusion self-analysis as bad with knowing_talk flaw", async () => {
    //#then the result should flag knowing_talk and author_intrusion
    const text =
      "'I suppose my abandonment issues stem from my father leaving when I was four,' " +
      "the warrior explained calmly. 'My psyche constructed defense mechanisms of emotional " +
      "distance and performative aggression to compensate for the primal wound.'";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("knowing_talk");
    expect(result.flaws).toContain("author_intrusion");
  });

  //#when evaluating uninterrupted monologue with no listener reaction
  it("should label monologue fallacy as bad with monologue_fallacy flaw", async () => {
    //#then the result should flag monologue_fallacy
    const text =
      "'My dear friends, let me tell you the story of how I came to be standing here " +
      "before you today. It all began thirty years ago. The sun beat down upon us. " +
      "My mother worked in the textile mills. My father tended bar. He taught me the " +
      "value of listening. I carried those lessons to this very podium where I now " +
      "address you with the full weight of my accumulated experience.'";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("monologue_fallacy");
  });

  //#when evaluating melodramatic expression disproportionate to stakes
  it("should label melodramatic expression as bad with melodramatic_expression flaw", async () => {
    //#then the result should flag melodramatic_expression and disproportionate_emotion
    const text =
      "'You forgot to buy milk?!' she screamed. 'My entire world is CRUMBLING because " +
      "of your NEGLIGENCE! Every dream I ever had—SHATTERED!' She collapsed weeping. " +
      "'I am DESTROYED,' she whispered. 'Utterly and completely destroyed.'";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("melodramatic_expression");
    expect(result.flaws).toContain("disproportionate_emotion");
  });

  //#when evaluating on-the-nose writing where text equals subtext
  it("should label on-the-nose writing as bad with on_the_nose_writing flaw", async () => {
    //#then the result should flag on_the_nose_writing
    const text =
      "'Let me be honest with you,' [CHARACTER_NAME_MARCUS] said. 'What I am really saying is that I care. " +
      "The point I am making is simple. Frankly, I believe we should be more open.'";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("on_the_nose_writing");
  });

  //#when evaluating abstract corporate jargon in dialogue
  it("should label abstract corporate language as bad with abstract_language flaw", async () => {
    //#then the result should flag abstract_language and incredibility
    const text =
      "'We need to facilitate a strategic implementation,' said Commander [CHARACTER_NAME_VOSS]. " +
      "'We must leverage our synergies and incentivize the operational teams.'";
    const result = await evaluateDialogueCraft(text);

    expect(result.label).toBe("bad");
    expect(result.score).toBeLessThan(0.5);
    expect(result.flaws).toContain("abstract_language");
    expect(result.flaws).toContain("incredibility");
  });
});
