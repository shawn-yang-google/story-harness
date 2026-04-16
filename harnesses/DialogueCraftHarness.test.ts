import { describe, it, expect } from "bun:test";
import { readFile } from "fs/promises";
import { executeHarnessInSandbox } from "../src/environment/sandbox";
import type { HarnessContext } from "../src/types";

//#given the DialogueCraftHarness code loaded from disk
const harnessCode = await readFile("harnesses/DialogueCraftHarness.ts", "utf-8");

const baseContext: HarnessContext = {
  loreDb: {
    genre: "fantasy",
  },
  previousBeats: [],
  targetAudience: "general",
};

describe("DialogueCraftHarness", () => {
  //#when evaluating dialogue full of purposeless chitchat
  it("should reject dialogue that is pure chitchat with no dramatic action", async () => {
    //#then result.valid should be false with feedback about chitchat/filler
    const draft =
      "'Hello,' said [CHARACTER_NAME_MARCUS]. 'Hi there,' said [CHARACTER_NAME_LYRA]. 'How are you?' [CHARACTER_NAME_MARCUS] asked. " +
      "'Fine, thanks,' [CHARACTER_NAME_LYRA] replied. 'Nice weather today,' [CHARACTER_NAME_MARCUS] said. 'Lovely day,' " +
      "[CHARACTER_NAME_LYRA] agreed. 'Good morning,' said the innkeeper. 'Good day,' [CHARACTER_NAME_MARCUS] replied. " +
      "'Goodbye,' said [CHARACTER_NAME_LYRA]. 'See you later,' [CHARACTER_NAME_MARCUS] called.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("chitchat") ||
          f.toLowerCase().includes("filler") ||
          f.toLowerCase().includes("action")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue loaded with cliche phrases
  it("should reject dialogue that relies on cliched stock phrases", async () => {
    //#then result.valid should be false with feedback about cliches
    const draft =
      "'We need to talk,' said the commander. The spy stepped forward. " +
      "'It is what it is,' he shrugged. 'You don't understand,' she snapped. " +
      "'To be honest, I never did,' he replied. 'Mark my words, " +
      "you'll pay for this,' she hissed. 'At the end of the day, we're not so " +
      "different you and I,' he said with a smile. 'I can explain,' he added. " +
      "'I've got a bad feeling about this,' she muttered.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("cliche") ||
          f.toLowerCase().includes("overused") ||
          f.toLowerCase().includes("stock")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue with [FORCED_EXPOSITION_TROP] exposition
  it("should reject dialogue with forced mutual-knowledge exposition", async () => {
    //#then result.valid should be false with feedback about as-you-know
    const draft =
      "'As you know, our kingdom was founded three hundred years ago,' said the king. " +
      "'Yes, and as we discussed, the northern border has been unstable since the war,' " +
      "the advisor replied. 'Let me remind you that I, your brother, have served this " +
      "throne for twenty years,' the prince added. 'As you're aware, the prophecy " +
      "speaks of a chosen one,' the wizard intoned.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("as-you-know") ||
          f.toLowerCase().includes("exposition") ||
          f.toLowerCase().includes("already know")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue where characters directly state emotions
  it("should reject on-the-nose dialogue where characters declare feelings", async () => {
    //#then result.valid should be false with feedback about on-the-nose emotion
    const draft =
      "I am angry at you for what you did. I feel sad about the whole situation. " +
      "I hate you for lying to me. I am so hurt by your betrayal. " +
      "I am scared of what comes next. I am so jealous of your success. " +
      "The reason I did that is because I was afraid. I did it because I love you.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("on-the-nose") ||
          f.toLowerCase().includes("stating") ||
          f.toLowerCase().includes("emotion") ||
          f.toLowerCase().includes("subtext")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue where all characters agree without conflict
  it("should reject dialogue where characters agree without any friction", async () => {
    //#then result.valid should be false with feedback about no conflict
    const draft =
      "'We should attack at dawn,' said the general. 'Agreed,' said the captain. " +
      "'Absolutely,' the lieutenant nodded. 'Of course,' said the sergeant. 'Exactly,' " +
      "the corporal confirmed. 'That makes sense,' the scout agreed. 'Sounds great,' " +
      "the medic added. 'Definitely,' the archer concluded. 'Right,' said the knight. " +
      "'I agree completely,' said the squire.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("conflict") ||
          f.toLowerCase().includes("agreement") ||
          f.toLowerCase().includes("friction") ||
          f.toLowerCase().includes("pushback")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue with unweaponized exposition info-dumps
  it("should reject dialogue with info-dump exposition lacking dramatic pressure", async () => {
    //#then result.valid should be false with feedback about exposition/info-dump
    const draft =
      "The elder spoke. The history of the realm stretches back thousands of years. " +
      "The first king was a shepherd who united the twelve tribes. The kingdom was " +
      "founded in the age of fire. According to legend, the crown was forged from " +
      "a fallen star. It is said that the prophecy states a chosen one will rise. " +
      "There were thirteen kingdoms before the great war. Long ago, in ancient times, " +
      "the borders were drawn by the gods themselves. The people listened politely " +
      "as the elder continued his history lesson without interruption or urgency.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("exposition") ||
          f.toLowerCase().includes("info-dump") ||
          f.toLowerCase().includes("weaponized") ||
          f.toLowerCase().includes("lecture")
      )
    ).toBe(true);
  });

  //#when evaluating well-crafted dialogue with subtext and conflict
  it("should accept dialogue with subtext, conflict, and purposeful action", async () => {
    //#then result.valid should be true
    const draft =
      "'The soup is getting cold,' [CHARACTER_NAME_MIRA] said, not looking up from the window. " +
      "[CHARACTER_NAME_KAEL] set his knife down. 'Is that what we are discussing now? Soup?' " +
      "His voice was quiet but the edge was unmistakable. She gripped the curtain. " +
      "'I thought you said you would be home by nightfall.' 'And I thought you said " +
      "you would stop reading my letters,' he shot back. The silence between them " +
      "stretched until the candle guttered. She turned away. He said nothing. " +
      "Neither of them touched the soup.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(true);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("passed") ||
          f.toLowerCase().includes("craft")
      )
    ).toBe(true);
  });

  //#when evaluating a draft that is too short
  it("should reject a draft that is too short for meaningful analysis", async () => {
    //#then result.valid should be false with feedback about length
    const draft = "Hello.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some((f: string) => f.toLowerCase().includes("short"))
    ).toBe(true);
  });

  //#when evaluating dialogue with therapy-speak self-diagnosis
  it("should reject dialogue where characters display impossible self-awareness", async () => {
    //#then result.valid should be false with feedback about knowing/perceptive talk
    const draft =
      "'I suppose I have always been afraid of intimacy,' [CHARACTER_NAME_MARCUS] said calmly. " +
      "'I realize now that I push people away because of my childhood trauma. " +
      "The truth is I have never been able to trust anyone since my mother left. " +
      "I understand now that my anger stems from a deep fear of abandonment. " +
      "My fear of commitment stems from watching my parents divorce. " +
      "I know that deep down I am just a scared little boy pretending to be strong.'";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("knowing") ||
          f.toLowerCase().includes("perceptive") ||
          f.toLowerCase().includes("self-aware") ||
          f.toLowerCase().includes("therapy")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue with excessively long uninterrupted monologues
  it("should reject dialogue with uninterrupted monologue blocks", async () => {
    //#then result.valid should be false with feedback about monologue
    const draft =
      "The villain stepped forward and began to speak. 'You see, my dear hero, " +
      "I have spent thirty years planning this moment. Every move you made was " +
      "anticipated. Every ally you gathered was already compromised. The council " +
      "thought they could stop me, but I infiltrated their ranks years ago. My agents " +
      "have been embedded in every major city, every military outpost, every trade " +
      "guild across the continent. The weapon I have built is unlike anything this " +
      "world has seen. It draws power from the ancient ley lines that crisscross " +
      "beneath the earth. Once activated, it will reshape the very fabric of reality. " +
      "There is no counter-spell, no ancient artifact, no prophecy that can undo what " +
      "I am about to unleash. You are too late. You were always too late.'";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("monologue") ||
          f.toLowerCase().includes("uninterrupted") ||
          f.toLowerCase().includes("speech")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue with melodramatic expression
  it("should reject dialogue with disproportionate emotional expression", async () => {
    //#then result.valid should be false with feedback about melodrama
    const draft =
      "'This is the worst day of my life!!' she screamed. 'The most terrible thing " +
      "has happened!! My soul shattered into a million pieces when I heard the news!! " +
      "The universe collapsed around me!! It was the greatest tragedy anyone has ever " +
      "endured!! The heavens wept for my suffering!!' She collapsed onto the kitchen " +
      "floor because her coworker had eaten her sandwich from the office fridge.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("melodra") ||
          f.toLowerCase().includes("disproportionate") ||
          f.toLowerCase().includes("hyperbolic")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue with ostentatious archaic vocabulary
  it("should reject dialogue with self-consciously literary language in modern settings", async () => {
    //#then result.valid should be false with feedback about ostentatious language
    const draft =
      "'Perchance we shall find the answer forthwith,' said the barista. " +
      "'Verily, I concur,' replied the customer. 'Henceforth, let us endeavor " +
      "to procure the finest espresso betwixt here and the harbor.' " +
      "'Alas, the machine is broken,' the barista sighed. 'Whereupon I must " +
      "suggest that we venture thrice to the establishment across the boulevard.' " +
      "'Whilst we wait, let me regale you with a tale,' the customer offered.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("ostentatious") ||
          f.toLowerCase().includes("archaic") ||
          f.toLowerCase().includes("thesaurus") ||
          f.toLowerCase().includes("showy")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue with dead metaphors and cliched figurative language
  it("should reject dialogue containing dead metaphors and cliched similes", async () => {
    //#then result.valid should be false with feedback about dead metaphors
    const draft =
      "'It is raining cats and dogs out there,' said the farmer. 'Finding that " +
      "lost cow will be like finding a needle in a haystack.' 'At least there is " +
      "a light at the end of the tunnel,' his wife replied. 'That is just the " +
      "tip of the iceberg though. The whole fence is broken and the barn is old " +
      "as the hills.' 'Well, she is tough as nails,' the farmer said of the cow. " +
      "'She will be fit as a fiddle once we find her.'";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("dead metaphor") ||
          f.toLowerCase().includes("clich") ||
          f.toLowerCase().includes("figurative")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue that ends exactly where it started with no value change
  it("should reject dialogue scenes with no turning point or value change", async () => {
    //#then result.valid should be false with feedback about shapeless/circular
    const draft =
      "'I do not trust him,' [CHARACTER_NAME_ELENA] said, staring at the map. " +
      "'He has been acting strangely,' [CHARACTER_NAME_VIKTOR] agreed. " +
      "'Something about his story does not add up,' she continued. " +
      "'The timelines are wrong,' [CHARACTER_NAME_VIKTOR] noted. " +
      "'And his alibi is weak,' [CHARACTER_NAME_ELENA] said. " +
      "'Very suspicious,' [CHARACTER_NAME_VIKTOR] replied. " +
      "'We should keep an eye on him,' she concluded. " +
      "'Agreed. I do not trust him either,' [CHARACTER_NAME_VIKTOR] said.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("shapeless") ||
          f.toLowerCase().includes("circular") ||
          f.toLowerCase().includes("turning point") ||
          f.toLowerCase().includes("value change")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue where characters announce exactly what they think
  it("should reject on-the-nose dialogue where text equals subtext", async () => {
    //#then result.valid should be false with feedback about on-the-nose writing
    const draft =
      "'Let me be honest with you,' [CHARACTER_NAME_MARCUS] said. 'I need you to understand that " +
      "I want you to know that I care about you. What I am really saying is that " +
      "I need you to hear me. Honestly, I feel like we should talk about this. " +
      "The point I am making is that I want you to know that I think we should " +
      "be more open with each other. Frankly, I believe this is important.'";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("on-the-nose") ||
          f.toLowerCase().includes("text") ||
          f.toLowerCase().includes("subtext")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue with the same beat repeated in different words
  it("should reject dialogue with repeated dramatic beats", async () => {
    //#then result.valid should be false with feedback about repetition
    const draft =
      "'Please stay,' [CHARACTER_NAME_ELENA] begged. 'I am begging you, please don't go.' " +
      "'Don't leave me,' she pleaded. 'Stay here with me, I am asking you.' " +
      "'I need you to stay,' she implored. 'Please don't go, I am pleading with you.' " +
      "'Stay with me,' she whispered. 'I want you to stay, please don't leave.'";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("repetition") ||
          f.toLowerCase().includes("repeated") ||
          f.toLowerCase().includes("diminishing")
      )
    ).toBe(true);
  });

  //#when evaluating dialogue where characters explain their feelings instead of showing
  it("should reject telling dialogue where characters narrate their history", async () => {
    //#then result.valid should be false with feedback about telling/showing
    const draft =
      "'You see, when I was a child, I was always afraid of the dark. " +
      "I have always been a lonely person. Ever since I was a kid, I knew " +
      "something was wrong with me. The thing about me is that I never learned " +
      "to trust people. I feel lonely because no one ever listened to me. " +
      "You have to understand, growing up in that house changed everything.'";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("telling") ||
          f.toLowerCase().includes("showing") ||
          f.toLowerCase().includes("explain")
      )
    ).toBe(true);
  });
});
