import { describe, it, expect } from "bun:test";
import { checkDialogue } from "./dialogue-checker";
import { createEmptyDialogueGraph } from "../types/dialogue-graph";
import type { DialogueGraph } from "../types/dialogue-graph";

function graphWith(overrides: Partial<DialogueGraph>): DialogueGraph {
  return { ...createEmptyDialogueGraph(), ...overrides };
}

describe("DialogueChecker", () => {
  //#given an empty dialogue graph
  //#when checking dialogue craft
  //#then no errors are returned
  it("returns no errors for an empty graph", () => {
    const results = checkDialogue(createEmptyDialogueGraph());
    expect(results).toEqual([]);
  });

  //#given well-crafted dialogue with subtext, conflict, and distinct voices
  //#when checking dialogue craft
  //#then no errors are returned
  it("returns no errors for well-crafted dialogue", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "You look well.", wordCount: 3, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "Do I?", wordCount: 2, order: 2, location: "scene 1" },
        { id: "s3", speaker: "[WONDERLAND_TRAVELER]", text: "Better than expected.", wordCount: 3, order: 3, location: "scene 1" },
        { id: "s4", speaker: "Bob", text: "Expected by whom?", wordCount: 3, order: 4, location: "scene 1" },
      ],
      subtext: [
        { speechId: "s1", surfaceMeaning: "compliment", hiddenMeaning: "suspicion", type: "irony" },
        { speechId: "s2", surfaceMeaning: "question", hiddenMeaning: "defensiveness", type: "evasion" },
      ],
      exposition: [],
      voices: [
        { character: "[WONDERLAND_TRAVELER]", vocabulary: "formal", avgSentenceLength: 4, distinctiveTraits: ["clipped"], distinctFromOthers: true },
        { character: "Bob", vocabulary: "terse", avgSentenceLength: 3, distinctiveTraits: ["questions"], distinctFromOthers: true },
      ],
      conflicts: [
        { speechId: "s1", type: "confrontation" },
        { speechId: "s2", type: "evasion" },
      ],
    });
    const results = checkDialogue(graph);
    expect(results).toEqual([]);
  });

  // === Chitchat Ratio ===

  //#given speeches where >30% are chitchat
  //#when checking dialogue craft
  //#then a chitchat_ratio error is returned
  it("detects too much chitchat (>30%)", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "Hello", wordCount: 1, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "Hi there", wordCount: 2, order: 2, location: "scene 1" },
        { id: "s3", speaker: "[WONDERLAND_TRAVELER]", text: "Nice weather", wordCount: 2, order: 3, location: "scene 1" },
        { id: "s4", speaker: "Bob", text: "Important line", wordCount: 2, order: 4, location: "scene 1" },
      ],
      chitchatSpeeches: ["s1", "s2", "s3"],
    });
    const results = checkDialogue(graph);
    const chitchat = results.filter(r => r.rule === "chitchat_ratio");
    expect(chitchat.length).toBe(1);
    expect(chitchat[0].checker).toBe("DialogueChecker");
    expect(chitchat[0].severity).toBe("error");
    expect(chitchat[0].evidence).toEqual(["s1", "s2", "s3"]);
  });

  //#given speeches where exactly 30% are chitchat
  //#when checking dialogue craft
  //#then no error (threshold is strictly greater than 0.3)
  it("does not flag chitchat at exactly 30%", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "Hello", wordCount: 1, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "Plot line 1", wordCount: 3, order: 2, location: "scene 1" },
        { id: "s3", speaker: "[WONDERLAND_TRAVELER]", text: "Plot line 2", wordCount: 3, order: 3, location: "scene 1" },
        { id: "s4", speaker: "Bob", text: "Plot line 3", wordCount: 3, order: 4, location: "scene 1" },
        { id: "s5", speaker: "[WONDERLAND_TRAVELER]", text: "Plot line 4", wordCount: 3, order: 5, location: "scene 1" },
        { id: "s6", speaker: "Bob", text: "Plot line 5", wordCount: 3, order: 6, location: "scene 1" },
        { id: "s7", speaker: "[WONDERLAND_TRAVELER]", text: "Plot line 6", wordCount: 3, order: 7, location: "scene 1" },
        { id: "s8", speaker: "Bob", text: "Plot line 7", wordCount: 3, order: 8, location: "scene 1" },
        { id: "s9", speaker: "[WONDERLAND_TRAVELER]", text: "Plot line 8", wordCount: 3, order: 9, location: "scene 1" },
        { id: "s10", speaker: "Bob", text: "Plot line 9", wordCount: 3, order: 10, location: "scene 1" },
      ],
      chitchatSpeeches: ["s1", "s2", "s3"], // 3/10 = 0.3 exactly
    });
    const results = checkDialogue(graph);
    const chitchat = results.filter(r => r.rule === "chitchat_ratio");
    expect(chitchat.length).toBe(0);
  });

  // === No Subtext ===

  //#given subtext entries where all types are "none"
  //#when checking dialogue craft
  //#then a no_subtext error is returned
  it("detects dialogue with no subtext (all type=none)", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "I am angry.", wordCount: 3, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "I am sad.", wordCount: 3, order: 2, location: "scene 1" },
      ],
      subtext: [
        { speechId: "s1", surfaceMeaning: "anger", hiddenMeaning: "anger", type: "none" },
        { speechId: "s2", surfaceMeaning: "sadness", hiddenMeaning: "sadness", type: "none" },
      ],
    });
    const results = checkDialogue(graph);
    const noSubtext = results.filter(r => r.rule === "no_subtext");
    expect(noSubtext.length).toBe(1);
    expect(noSubtext[0].severity).toBe("error");
  });

  //#given subtext entries where less than half are "none"
  //#when checking dialogue craft
  //#then no error
  it("does not flag subtext when majority has hidden meaning", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "You look well.", wordCount: 3, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "Fine.", wordCount: 1, order: 2, location: "scene 1" },
        { id: "s3", speaker: "[WONDERLAND_TRAVELER]", text: "Sure.", wordCount: 1, order: 3, location: "scene 1" },
      ],
      subtext: [
        { speechId: "s1", surfaceMeaning: "compliment", hiddenMeaning: "suspicion", type: "irony" },
        { speechId: "s2", surfaceMeaning: "agreement", hiddenMeaning: "dismissal", type: "evasion" },
        { speechId: "s3", surfaceMeaning: "agreement", hiddenMeaning: "agreement", type: "none" },
      ],
    });
    const results = checkDialogue(graph);
    const noSubtext = results.filter(r => r.rule === "no_subtext");
    expect(noSubtext.length).toBe(0);
  });

  // === Exposition Dump ===

  //#given exposition with "as_you_know_bob" type
  //#when checking dialogue craft
  //#then an exposition_dump error is returned per instance
  it("detects as-you-know-bob exposition", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "As you know, we have been at war for years.", wordCount: 10, order: 1, location: "scene 1" },
      ],
      exposition: [
        { speechId: "s1", content: "As you know, we have been at war for years.", type: "as_you_know_bob" },
      ],
    });
    const results = checkDialogue(graph);
    const expoDumps = results.filter(r => r.rule === "exposition_dump");
    expect(expoDumps.length).toBe(1);
    expect(expoDumps[0].severity).toBe("error");
    expect(expoDumps[0].evidence).toContain("s1");
  });

  //#given exposition with "info_dump" type
  //#when checking dialogue craft
  //#then an exposition_dump error is returned
  it("detects info dump exposition", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "Bob", text: "The kingdom was founded in 1042 by...", wordCount: 50, order: 1, location: "scene 2" },
      ],
      exposition: [
        { speechId: "s1", content: "The kingdom was founded in 1042 by...", type: "info_dump" },
      ],
    });
    const results = checkDialogue(graph);
    const expoDumps = results.filter(r => r.rule === "exposition_dump");
    expect(expoDumps.length).toBe(1);
    expect(expoDumps[0].severity).toBe("error");
  });

  //#given exposition with "natural" or "weaponized" types
  //#when checking dialogue craft
  //#then no error
  it("does not flag natural or weaponized exposition", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "Pass the salt.", wordCount: 3, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "You never told me about the inheritance.", wordCount: 7, order: 2, location: "scene 1" },
      ],
      exposition: [
        { speechId: "s1", content: "Pass the salt.", type: "natural" },
        { speechId: "s2", content: "You never told me about the inheritance.", type: "weaponized" },
      ],
    });
    const results = checkDialogue(graph);
    const expoDumps = results.filter(r => r.rule === "exposition_dump");
    expect(expoDumps.length).toBe(0);
  });

  // === Monologue Too Long ===

  //#given monologue speeches
  //#when checking dialogue craft
  //#then a monologue_too_long error is returned per instance
  it("detects monologues that are too long", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[TRAGIC_PRINCE]", text: "To be or not to be...", wordCount: 150, order: 1, location: "act 3" },
        { id: "s2", speaker: "Ophelia", text: "Brief reply.", wordCount: 2, order: 2, location: "act 3" },
      ],
      monologueSpeeches: ["s1"],
    });
    const results = checkDialogue(graph);
    const monologues = results.filter(r => r.rule === "monologue_too_long");
    expect(monologues.length).toBe(1);
    expect(monologues[0].severity).toBe("error");
    expect(monologues[0].evidence).toContain("s1");
  });

  //#given multiple monologue speeches
  //#when checking dialogue craft
  //#then an error per monologue
  it("reports one error per monologue", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "A", text: "...", wordCount: 120, order: 1, location: "scene 1" },
        { id: "s2", speaker: "B", text: "...", wordCount: 110, order: 2, location: "scene 1" },
      ],
      monologueSpeeches: ["s1", "s2"],
    });
    const results = checkDialogue(graph);
    const monologues = results.filter(r => r.rule === "monologue_too_long");
    expect(monologues.length).toBe(2);
  });

  // === No Conflict ===

  //#given all conflicts have type "agreement"
  //#when checking dialogue craft
  //#then a no_conflict error is returned
  it("detects dialogue with no conflict (all agreement)", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "Let's go.", wordCount: 2, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "Yes, let's.", wordCount: 2, order: 2, location: "scene 1" },
      ],
      conflicts: [
        { speechId: "s1", type: "agreement" },
        { speechId: "s2", type: "agreement" },
      ],
    });
    const results = checkDialogue(graph);
    const noConflict = results.filter(r => r.rule === "no_conflict");
    expect(noConflict.length).toBe(1);
    expect(noConflict[0].severity).toBe("error");
  });

  //#given an empty conflicts array
  //#when checking dialogue craft
  //#then no error (nothing to check)
  it("does not flag no_conflict when conflicts array is empty", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "Hello.", wordCount: 1, order: 1, location: "scene 1" },
      ],
      conflicts: [],
    });
    const results = checkDialogue(graph);
    const noConflict = results.filter(r => r.rule === "no_conflict");
    expect(noConflict.length).toBe(0);
  });

  //#given conflicts with at least one non-agreement type
  //#when checking dialogue craft
  //#then no error
  it("does not flag conflict when at least one is not agreement", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "We should leave.", wordCount: 3, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "No.", wordCount: 1, order: 2, location: "scene 1" },
      ],
      conflicts: [
        { speechId: "s1", type: "agreement" },
        { speechId: "s2", type: "disagreement" },
      ],
    });
    const results = checkDialogue(graph);
    const noConflict = results.filter(r => r.rule === "no_conflict");
    expect(noConflict.length).toBe(0);
  });

  // === Indistinct Voices ===

  //#given more than 1 voice where distinctFromOthers is false
  //#when checking dialogue craft
  //#then an indistinct_voices warning is returned
  it("warns about indistinct character voices", () => {
    const graph = graphWith({
      voices: [
        { character: "[WONDERLAND_TRAVELER]", vocabulary: "formal", avgSentenceLength: 10, distinctiveTraits: [], distinctFromOthers: false },
        { character: "Bob", vocabulary: "formal", avgSentenceLength: 10, distinctiveTraits: [], distinctFromOthers: false },
        { character: "Carol", vocabulary: "colloquial", avgSentenceLength: 5, distinctiveTraits: ["slang"], distinctFromOthers: true },
      ],
    });
    const results = checkDialogue(graph);
    const indistinct = results.filter(r => r.rule === "indistinct_voices");
    expect(indistinct.length).toBe(1);
    expect(indistinct[0].severity).toBe("warning");
    expect(indistinct[0].evidence).toContain("[WONDERLAND_TRAVELER]");
    expect(indistinct[0].evidence).toContain("Bob");
  });

  //#given only 1 voice with distinctFromOthers=false
  //#when checking dialogue craft
  //#then no warning (threshold is > 1)
  it("does not warn when only one voice is indistinct", () => {
    const graph = graphWith({
      voices: [
        { character: "[WONDERLAND_TRAVELER]", vocabulary: "formal", avgSentenceLength: 10, distinctiveTraits: [], distinctFromOthers: false },
        { character: "Bob", vocabulary: "colloquial", avgSentenceLength: 5, distinctiveTraits: ["slang"], distinctFromOthers: true },
      ],
    });
    const results = checkDialogue(graph);
    const indistinct = results.filter(r => r.rule === "indistinct_voices");
    expect(indistinct.length).toBe(0);
  });

  // === On The Nose ===

  //#given speeches that directly state emotions
  //#when checking dialogue craft
  //#then an on_the_nose error is returned per instance
  it("detects on-the-nose dialogue", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "I am so angry right now!", wordCount: 7, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Bob", text: "I feel betrayed.", wordCount: 3, order: 2, location: "scene 1" },
        { id: "s3", speaker: "[WONDERLAND_TRAVELER]", text: "Pass the salt.", wordCount: 3, order: 3, location: "scene 1" },
      ],
      onTheNoseSpeeches: ["s1", "s2"],
    });
    const results = checkDialogue(graph);
    const onTheNose = results.filter(r => r.rule === "on_the_nose");
    expect(onTheNose.length).toBe(2);
    expect(onTheNose[0].severity).toBe("error");
    expect(onTheNose[1].severity).toBe("error");
    expect(onTheNose[0].evidence).toContain("s1");
    expect(onTheNose[1].evidence).toContain("s2");
  });

  //#given no on-the-nose speeches
  //#when checking dialogue craft
  //#then no error
  it("does not flag when no on-the-nose speeches", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "Fine.", wordCount: 1, order: 1, location: "scene 1" },
      ],
      onTheNoseSpeeches: [],
    });
    const results = checkDialogue(graph);
    const onTheNose = results.filter(r => r.rule === "on_the_nose");
    expect(onTheNose.length).toBe(0);
  });

  // === Cliche Dialogue ===

  //#given speeches using dialogue cliches
  //#when checking dialogue craft
  //#then a cliche_dialogue warning is returned per instance
  it("warns about cliche dialogue", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "Villain", text: "We meet again.", wordCount: 3, order: 1, location: "scene 1" },
        { id: "s2", speaker: "Hero", text: "I have a bad feeling about this.", wordCount: 8, order: 2, location: "scene 1" },
        { id: "s3", speaker: "Villain", text: "You fool!", wordCount: 2, order: 3, location: "scene 1" },
      ],
      clicheSpeeches: ["s1", "s2", "s3"],
    });
    const results = checkDialogue(graph);
    const cliches = results.filter(r => r.rule === "cliche_dialogue");
    expect(cliches.length).toBe(3);
    expect(cliches[0].severity).toBe("warning");
    expect(cliches[1].severity).toBe("warning");
    expect(cliches[2].severity).toBe("warning");
  });

  //#given no cliche speeches
  //#when checking dialogue craft
  //#then no warning
  it("does not warn when no cliche speeches", () => {
    const graph = graphWith({
      speeches: [
        { id: "s1", speaker: "[WONDERLAND_TRAVELER]", text: "Original line.", wordCount: 2, order: 1, location: "scene 1" },
      ],
      clicheSpeeches: [],
    });
    const results = checkDialogue(graph);
    const cliches = results.filter(r => r.rule === "cliche_dialogue");
    expect(cliches.length).toBe(0);
  });
});
