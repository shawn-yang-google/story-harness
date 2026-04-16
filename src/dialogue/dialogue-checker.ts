import type { DialogueGraph } from "../types/dialogue-graph";
import type { CheckResult } from "../logic/types";

/**
 * DialogueChecker — Verifies dialogue craft within a DialogueGraph.
 *
 * Checks:
 * 1. chitchat_ratio: too much filler dialogue (>30%)
 * 2. no_subtext: dialogue is too on-the-nose (>50% subtext entries have type="none")
 * 3. exposition_dump: "as_you_know_bob" or "info_dump" exposition
 * 4. monologue_too_long: speeches over 100 words with no interruption
 * 5. no_conflict: all conflict entries are "agreement"
 * 6. indistinct_voices: >1 character voice not distinct from others
 * 7. on_the_nose: speeches directly stating emotions
 * 8. cliche_dialogue: speeches using dialogue cliches
 */
export function checkDialogue(graph: DialogueGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkChitchatRatio(graph));
  results.push(...checkNoSubtext(graph));
  results.push(...checkExpositionDump(graph));
  results.push(...checkMonologueTooLong(graph));
  results.push(...checkNoConflict(graph));
  results.push(...checkIndistinctVoices(graph));
  results.push(...checkOnTheNose(graph));
  results.push(...checkClicheDialogue(graph));

  return results;
}

/**
 * Check 1: Chitchat Ratio
 * If chitchatSpeeches.length / speeches.length > 0.3, error: too much filler.
 */
function checkChitchatRatio(graph: DialogueGraph): CheckResult[] {
  const { speeches, chitchatSpeeches } = graph;

  if (speeches.length === 0) return [];

  const ratio = chitchatSpeeches.length / speeches.length;
  if (ratio > 0.3) {
    return [
      {
        checker: "DialogueChecker",
        rule: "chitchat_ratio",
        severity: "error",
        message:
          `Too much filler dialogue: ${chitchatSpeeches.length}/${speeches.length} ` +
          `speeches (${(ratio * 100).toFixed(0)}%) are chitchat. Threshold is 30%.`,
        evidence: [...chitchatSpeeches],
      },
    ];
  }

  return [];
}

/**
 * Check 2: No Subtext
 * If subtext entries where type="none" > 50% of all subtext entries, error.
 */
function checkNoSubtext(graph: DialogueGraph): CheckResult[] {
  const { subtext } = graph;

  if (subtext.length === 0) return [];

  const noneCount = subtext.filter(s => s.type === "none").length;
  if (noneCount > subtext.length / 2) {
    return [
      {
        checker: "DialogueChecker",
        rule: "no_subtext",
        severity: "error",
        message:
          `Dialogue lacks subtext: ${noneCount}/${subtext.length} ` +
          `speeches have no hidden meaning. Good dialogue says one thing and means another.`,
        evidence: subtext.filter(s => s.type === "none").map(s => s.speechId),
      },
    ];
  }

  return [];
}

/**
 * Check 3: Exposition Dump
 * Count exposition where type="as_you_know_bob" or "info_dump". Error per instance.
 */
function checkExpositionDump(graph: DialogueGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const expo of graph.exposition) {
    if (expo.type === "as_you_know_bob" || expo.type === "info_dump") {
      const label =
        expo.type === "as_you_know_bob"
          ? '"As you know, Bob"'
          : "info dump";
      results.push({
        checker: "DialogueChecker",
        rule: "exposition_dump",
        severity: "error",
        message:
          `${label} exposition in speech "${expo.speechId}": ` +
          `"${expo.content}". Exposition should be dramatized, not dumped.`,
        evidence: [expo.speechId],
      });
    }
  }

  return results;
}

/**
 * Check 4: Monologue Too Long
 * If monologueSpeeches.length > 0, error per monologue.
 */
function checkMonologueTooLong(graph: DialogueGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const speechId of graph.monologueSpeeches) {
    results.push({
      checker: "DialogueChecker",
      rule: "monologue_too_long",
      severity: "error",
      message:
        `Monologue too long: speech "${speechId}" exceeds 100 words ` +
        `without interruption. Break it up with reactions or actions.`,
      evidence: [speechId],
    });
  }

  return results;
}

/**
 * Check 5: No Conflict
 * If ALL conflicts have type="agreement", error: dialogue lacks tension.
 * Empty conflicts array = no error (nothing to check).
 */
function checkNoConflict(graph: DialogueGraph): CheckResult[] {
  const { conflicts } = graph;

  if (conflicts.length === 0) return [];

  const allAgreement = conflicts.every(c => c.type === "agreement");
  if (allAgreement) {
    return [
      {
        checker: "DialogueChecker",
        rule: "no_conflict",
        severity: "error",
        message:
          `Dialogue lacks tension: all ${conflicts.length} conflict entries ` +
          `are "agreement". Dialogue needs disagreement, evasion, or confrontation.`,
        evidence: conflicts.map(c => c.speechId),
      },
    ];
  }

  return [];
}

/**
 * Check 6: Indistinct Voices
 * Count voices where distinctFromOthers=false. If > 1, warning.
 */
function checkIndistinctVoices(graph: DialogueGraph): CheckResult[] {
  const indistinct = graph.voices.filter(v => !v.distinctFromOthers);

  if (indistinct.length > 1) {
    return [
      {
        checker: "DialogueChecker",
        rule: "indistinct_voices",
        severity: "warning",
        message:
          `${indistinct.length} characters sound alike: ` +
          `${indistinct.map(v => v.character).join(", ")}. ` +
          `Each character should have a distinctive voice.`,
        evidence: indistinct.map(v => v.character),
      },
    ];
  }

  return [];
}

/**
 * Check 7: On The Nose
 * If onTheNoseSpeeches.length > 0, error per instance.
 */
function checkOnTheNose(graph: DialogueGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const speechId of graph.onTheNoseSpeeches) {
    results.push({
      checker: "DialogueChecker",
      rule: "on_the_nose",
      severity: "error",
      message:
        `On-the-nose dialogue: speech "${speechId}" directly states ` +
        `emotions instead of expressing them through action or subtext.`,
      evidence: [speechId],
    });
  }

  return results;
}

/**
 * Check 8: Cliche Dialogue
 * If clicheSpeeches.length > 0, warning per instance.
 */
function checkClicheDialogue(graph: DialogueGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const speechId of graph.clicheSpeeches) {
    results.push({
      checker: "DialogueChecker",
      rule: "cliche_dialogue",
      severity: "warning",
      message:
        `Cliche dialogue: speech "${speechId}" uses a dialogue cliche. ` +
        `Find a fresh, character-specific way to express this.`,
      evidence: [speechId],
    });
  }

  return results;
}
