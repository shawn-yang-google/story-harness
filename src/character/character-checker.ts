import type { CharacterGraph } from "../types/character-graph";
import type { CheckResult } from "../logic/types";

/**
 * CharacterChecker — Verifies character craft within a CharacterGraph.
 *
 * Checks:
 * 1. Cement-block character: no gap between mask and true character
 * 2. No pressure choice: no meaningful choice under pressure
 * 3. Flat character: lacks dimensional contradiction
 * 4. Unearned emotion: emotional moment not set up properly
 * 5. Disproportionate emotion: sentimentality
 * 6. No desire: character lacks conscious desire or goal
 */
export function checkCharacter(graph: CharacterGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkCementBlockCharacters(graph));
  results.push(...checkPressureChoices(graph));
  results.push(...checkFlatCharacters(graph));
  results.push(...checkEmotionalMoments(graph));
  results.push(...checkDesires(graph));

  return results;
}

/**
 * Check 1: Cement-Block Characters
 * Characters where maskMatchesTruth=true have no gap between public persona
 * and inner reality — they are the same inside and out.
 */
function checkCementBlockCharacters(graph: CharacterGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const character of graph.characters) {
    if (character.maskMatchesTruth) {
      results.push({
        checker: "CharacterChecker",
        rule: "cement_block_character",
        severity: "error",
        message:
          `Cement-block character "${character.name}": no gap between mask ` +
          `and true character — mask ("${character.mask}") matches inner ` +
          `reality ("${character.trueNature}"). True character is revealed ` +
          `only under pressure ([MASTER_THEORIST]: characterization-vs-true-character).`,
        evidence: [character.name],
      });
    }
  }

  return results;
}

/**
 * Check 2: No Pressure Choice
 * If pressureChoices is empty or none has revealsCharacter=true,
 * characters never face meaningful choices under pressure.
 * Only fires when characters exist in the graph.
 */
function checkPressureChoices(graph: CharacterGraph): CheckResult[] {
  const results: CheckResult[] = [];

  // Only check if there are characters to evaluate
  if (graph.characters.length === 0 && graph.pressureChoices.length === 0) {
    return results;
  }

  const hasRevealingChoice = graph.pressureChoices.some(
    (pc) => pc.revealsCharacter === true
  );

  if (graph.pressureChoices.length === 0 || !hasRevealingChoice) {
    results.push({
      checker: "CharacterChecker",
      rule: "no_pressure_choice",
      severity: "warning",
      message:
        `no meaningful choice under pressure: characters never face genuine ` +
        `dilemmas where both options carry real consequences. True character ` +
        `is revealed only through choices made under pressure ` +
        `([MASTER_THEORIST]: choice-under-pressure).`,
      evidence: graph.pressureChoices.map((pc) => pc.character),
    });
  }

  return results;
}

/**
 * Check 3: Flat Characters
 * For each character that has dimension entries in the graph,
 * if none of their dimensions has present=true, they are flat.
 */
function checkFlatCharacters(graph: CharacterGraph): CheckResult[] {
  const results: CheckResult[] = [];

  // Group dimensions by character
  const dimensionsByCharacter = new Map<string, boolean>();
  for (const dim of graph.dimensions) {
    const hasPresentDim = dimensionsByCharacter.get(dim.character) || false;
    if (dim.present) {
      dimensionsByCharacter.set(dim.character, true);
    } else if (!hasPresentDim) {
      dimensionsByCharacter.set(dim.character, false);
    }
  }

  // Check each character that has dimension entries
  for (const [characterName, hasPresent] of dimensionsByCharacter) {
    if (!hasPresent) {
      results.push({
        checker: "CharacterChecker",
        rule: "flat_character",
        severity: "error",
        message:
          `Flat character "${characterName}": character lacks dimensional ` +
          `contradiction. Compelling characters contain a unity of opposites — ` +
          `contradictory qualities that create depth and unpredictability ` +
          `([MASTER_THEORIST]: unity-of-opposites, defining-dimension).`,
        evidence: [characterName],
      });
    }
  }

  return results;
}

/**
 * Check 4 & 5: Emotional Moments
 * - Unearned: earned=false → error
 * - Disproportionate: proportionate=false → warning (sentimentality)
 */
function checkEmotionalMoments(graph: CharacterGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const moment of graph.emotionalMoments) {
    if (!moment.earned) {
      // Unearned emotion subsumes disproportionate — if it's not earned,
      // it always reads as disproportionate too. Report only once.
      results.push({
        checker: "CharacterChecker",
        rule: "unearned_emotion",
        severity: "error",
        message:
          `unearned emotional moment for "${moment.character}": ` +
          `"${moment.emotion}" triggered by "${moment.trigger}" was not ` +
          `set up properly. Emotion must be earned through the weight of ` +
          `events and stakes ([MASTER_THEORIST]: sentiment-vs-sentimentality).`,
        evidence: [moment.character],
      });
    } else if (!moment.proportionate) {
      // Only flag disproportionate if the emotion IS earned but still too strong.
      results.push({
        checker: "CharacterChecker",
        rule: "disproportionate_emotion",
        severity: "warning",
        message:
          `sentimentality: emotion is disproportionate for "${moment.character}": ` +
          `"${moment.emotion}" in response to "${moment.trigger}" ` +
          `exceeds what the situation warrants ` +
          `([MASTER_THEORIST]: sentiment-vs-sentimentality).`,
        evidence: [moment.character],
      });
    }
  }

  return results;
}

/**
 * Check 6: No Desire
 * DesireEntry where hasDesire=false means a character lacks
 * conscious desire or goal — no drive to propel the story.
 */
function checkDesires(graph: CharacterGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const desire of graph.desires) {
    if (!desire.hasDesire) {
      results.push({
        checker: "CharacterChecker",
        rule: "no_desire",
        severity: "error",
        message:
          `character lacks conscious desire or goal: "${desire.character}" ` +
          `has no specific want that drives action ` +
          `([MASTER_THEORIST]: motivation-vs-desire, conscious-vs-subconscious-desire).`,
        evidence: [desire.character],
      });
    }
  }

  return results;
}
