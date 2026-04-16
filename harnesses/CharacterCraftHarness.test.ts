import { describe, it, expect } from "bun:test";
import { readFile } from "fs/promises";
import { executeHarnessInSandbox } from "../src/environment/sandbox";
import type { HarnessContext } from "../src/types";

//#given the CharacterCraftHarness code loaded from disk
const harnessCode = await readFile("harnesses/CharacterCraftHarness.ts", "utf-8");

const baseContext: HarnessContext = {
  loreDb: {
    genre: "fantasy",
    protagonist: { name: "[CHARACTER_NAME_KAEL]", desire: "find the lost crown" },
    characters: [
      { name: "[CHARACTER_NAME_KAEL]", desire: "find the lost crown", mask: "stoic warrior" },
    ],
  },
  previousBeats: [],
  targetAudience: "general",
};

describe("CharacterCraftHarness", () => {
  //#when evaluating a passage where character masks are stripped by pressure
  it("should accept a passage with mask vs true character revealed under pressure", async () => {
    //#then result.valid should be true
    const draft =
      "[CHARACTER_NAME_KAEL] had always presented himself as the stoic warrior, unmoved by loss or pain. " +
      "But when the blade pierced his companion's chest, the mask shattered. He screamed— " +
      "not with rage but with grief. Beneath the surface of the hardened soldier was a man " +
      "who had already lost everyone he ever loved. His true self emerged: not fearless, " +
      "but terrified of caring again. He cradled the body, and the army saw their unbreakable " +
      "captain break. Yet it was this vulnerability that made him real.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(true);
  });

  //#when evaluating a cement-block character with no gap between mask and reality
  it("should reject a cement-block character with no inner-outer gap", async () => {
    //#then result.valid should be false with feedback about mask/true character
    const draft =
      "[CHARACTER_NAME_KAEL] was brave. He was strong. He was honorable. He was kind to children. " +
      "He was loyal to his friends. He was determined. He always did the right thing. " +
      "He never hesitated. He was tall with broad shoulders and a noble jaw. " +
      "He wore shining armor and carried a legendary sword. Everyone admired him. " +
      "He was the perfect hero in every way, inside and out.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("cement") ||
          f.toLowerCase().includes("mask") ||
          f.toLowerCase().includes("surface") ||
          f.toLowerCase().includes("characterization")
      )
    ).toBe(true);
  });

  //#when evaluating a passage with genuine choice under pressure
  it("should accept a passage with a genuine dilemma and meaningful choice", async () => {
    //#then result.valid should be true
    const draft =
      "[CHARACTER_NAME_KAEL] stood at the fork: the left path led to the crown he had sought his entire life, " +
      "but the right path led to the village where his sister was trapped in the burning inn. " +
      "He could not do both. The crown or his sister. Power or love. He chose between " +
      "everything he had sacrificed for and the only person who still believed in him. " +
      "He turned right. The cost was everything. The risk was death. But the choice " +
      "revealed who he truly was.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(true);
  });

  //#when evaluating a passage where characters act without stakes or pressure
  it("should reject a passage where choices carry no stakes or pressure", async () => {
    //#then result.valid should be false with feedback about lack of pressure
    const draft =
      "[CHARACTER_NAME_KAEL] walked to the market and picked an apple. He could have chosen a pear " +
      "but he preferred apples. He paid the merchant and walked home. He ate the apple " +
      "by the fire. It was pleasant. He then decided to go for a walk. He could have " +
      "stayed home but walking seemed nice. Nothing was at risk. There was nothing " +
      "to lose and nothing to gain. He made choices freely without any pressure or cost.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("pressure") ||
          f.toLowerCase().includes("stakes") ||
          f.toLowerCase().includes("dilemma") ||
          f.toLowerCase().includes("choice")
      )
    ).toBe(true);
  });

  //#when evaluating a passage with dimensional contradiction in character
  it("should accept a passage with contradictory character dimensions", async () => {
    //#then result.valid should be true
    const draft =
      "[CHARACTER_NAME_KAEL] was brave in battle yet paralyzed by the thought of speaking to his mother. " +
      "He could face a dragon without flinching, but a child's tears reduced him to silence. " +
      "Generous with strangers, yet cruel to those who loved him. Despite his iron discipline, " +
      "he drank himself unconscious every night. A man of contradictions—loyal but deceitful, " +
      "compassionate although merciless when cornered. He chose to sacrifice his own freedom " +
      "for a cause he claimed not to believe in.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(true);
  });

  //#when evaluating a flat, purely-good character with no contradiction
  it("should reject a flat character with no dimensional contradiction", async () => {
    //#then result.valid should be false with feedback about flatness
    const draft =
      "The hero was purely good. He was kind to everyone. He was brave in every situation. " +
      "He was honest in every conversation. He was generous in every interaction. He never " +
      "wavered, never doubted, never faltered. His goodness was absolute and unwavering. " +
      "There was no darkness in him, no flaw, no contradiction. He was perfectly virtuous " +
      "in every dimension of his character.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("flat") ||
          f.toLowerCase().includes("contradiction") ||
          f.toLowerCase().includes("dimension") ||
          f.toLowerCase().includes("purely")
      )
    ).toBe(true);
  });

  //#when evaluating a passage with unearned, disproportionate emotion
  it("should reject a passage with sentimentality (unearned emotion)", async () => {
    //#then result.valid should be false with feedback about unearned emotion
    const draft =
      "She found a slightly wilted flower on the windowsill and tears streamed down her face. " +
      "Her heart broke into a thousand pieces at the sight of a single fallen petal. She " +
      "sobbed uncontrollably, her body shaking with the deepest grief imaginable. The flower " +
      "meant nothing special—she had just bought it yesterday—but the emotion overwhelmed " +
      "her completely. She wept and wept, devastated beyond measure by this minor occurrence.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("unearned") ||
          f.toLowerCase().includes("sentimentality") ||
          f.toLowerCase().includes("disproportionate") ||
          f.toLowerCase().includes("emotion")
      )
    ).toBe(true);
  });

  //#when evaluating a passage with on-the-nose dialogue
  it("should reject on-the-nose dialogue where characters state feelings directly", async () => {
    //#then result.valid should be false with feedback about subtext
    const draft =
      "'I am angry at you,' said [CHARACTER_NAME_KAEL]. 'I feel betrayed,' said [CHARACTER_NAME_MIRA]. 'I am sad because " +
      "you lied to me,' [CHARACTER_NAME_KAEL] replied. 'I love you but I am hurt,' [CHARACTER_NAME_MIRA] said. 'I am " +
      "frustrated and confused,' [CHARACTER_NAME_KAEL] responded. 'I feel guilty about what happened,' " +
      "[CHARACTER_NAME_MIRA] admitted. 'I am jealous of your success,' [CHARACTER_NAME_KAEL] confessed. They continued " +
      "stating every emotion they experienced directly and plainly.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some(
        (f: string) =>
          f.toLowerCase().includes("on-the-nose") ||
          f.toLowerCase().includes("subtext") ||
          f.toLowerCase().includes("stating") ||
          f.toLowerCase().includes("directly")
      )
    ).toBe(true);
  });

  //#when evaluating a passage with rich subtext in dialogue
  it("should accept a passage where dialogue implies emotion through action", async () => {
    //#then result.valid should be true
    const draft =
      "[CHARACTER_NAME_KAEL] set the letter down slowly. 'When did you plan to tell me?' he asked, " +
      "his voice quiet. [CHARACTER_NAME_MIRA] looked away. 'The soup is getting cold,' she said. He " +
      "stared at the back of her head for a long moment, then folded the letter and " +
      "placed it in his pocket. 'I suppose it is,' he said. Neither of them moved toward " +
      "the table. The silence between them said everything their words chose not to. " +
      "He wanted to scream but instead he poured a glass of water and drank it slowly.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(true);
  });

  //#when evaluating a draft that is too short
  it("should reject a draft that is too short for meaningful analysis", async () => {
    //#then result.valid should be false with feedback about length
    const draft = "He was brave.";

    const result = await executeHarnessInSandbox(harnessCode, draft, baseContext);
    expect(result.valid).toBe(false);
    expect(
      result.feedback.some((f: string) => f.toLowerCase().includes("short"))
    ).toBe(true);
  });
});
