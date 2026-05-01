import type { ReferenceGraph, ScientificReference } from "../types/reference-graph";
import type { CheckResult } from "../logic/types";

/**
 * ScientificChecker — Verifies scientific and technical claims.
 *
 * Checks:
 * 1. inaccurate_science: Wrong physics, biology, chemistry, etc. asserted as fact
 * 2. fictional_science_leak: Speculative/fictional science presented as real
 * 3. outdated_science: Scientific claim that was once true but is now superseded
 * 4. unverifiable_science: Technical claim needing expert verification
 */
export function checkScientific(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkInaccurateScience(graph));
  results.push(...checkFictionalScienceLeak(graph));
  results.push(...checkOutdatedScience(graph));
  results.push(...checkUnverifiableScience(graph));

  return results;
}

/**
 * Check 1: Inaccurate Science
 * Claims asserted as real-world fact that are wrong.
 */
function checkInaccurateScience(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const sci of graph.scientific) {
    if (sci.verdict === "inaccurate" && sci.assertedAsFact) {
      results.push({
        checker: "ScientificChecker",
        rule: "inaccurate_science",
        severity: sci.confidence === "high" ? "error" : "warning",
        message:
          `Inaccurate scientific claim (${sci.domain}): "${sci.claim}". ` +
          `This is asserted as fact but is incorrect. ` +
          (sci.correction ? `Correction: ${sci.correction}. ` : "") +
          `[excerpt: "${sci.excerpt.slice(0, 100)}"]`,
        evidence: [sci.id],
      });
    }
  }

  return results;
}

/**
 * Check 2: Fictional Science Leak
 * Speculative/fictional science that the narrative accidentally presents
 * as established real-world fact.
 * Only fires when assertedAsFact=true and the claim is wrong.
 */
function checkFictionalScienceLeak(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const sci of graph.scientific) {
    if (
      sci.assertedAsFact &&
      sci.verdict === "inaccurate" &&
      sci.confidence === "high"
    ) {
      // Check for common fictional science patterns
      const fictionalPatterns = [
        /faster.than.light/i,
        /ftl/i,
        /warp\s+drive/i,
        /quantum\s+(?:entanglement|tunneling).*communication/i,
        /teleport/i,
        /time\s+travel/i,
        /anti.gravity/i,
        /zero.point\s+energy/i,
        /perpetual\s+motion/i,
      ];

      const isFictionalScience = fictionalPatterns.some((p) =>
        p.test(sci.claim)
      );

      if (isFictionalScience) {
        results.push({
          checker: "ScientificChecker",
          rule: "fictional_science_leak",
          severity: "error",
          message:
            `Fictional science presented as fact: "${sci.claim}". ` +
            `This is speculative/fictional technology but is stated as if it ` +
            `were established science. Either mark it as speculative within ` +
            `the narrative or correct the claim.`,
          evidence: [sci.id],
        });
      }
    }
  }

  return results;
}

/**
 * Check 3: Outdated Science
 * Scientific claims that were once accepted but have been superseded.
 * Detected when the claim is partially_accurate.
 */
function checkOutdatedScience(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const sci of graph.scientific) {
    if (sci.verdict === "partially_accurate" && sci.assertedAsFact) {
      results.push({
        checker: "ScientificChecker",
        rule: "outdated_science",
        severity: "warning",
        message:
          `Potentially outdated scientific claim (${sci.domain}): "${sci.claim}". ` +
          (sci.correction ? `Current understanding: ${sci.correction}. ` : "") +
          `Verify this against current scientific consensus.`,
        evidence: [sci.id],
      });
    }
  }

  return results;
}

/**
 * Check 4: Unverifiable Science
 * Technical claims that require domain expert verification.
 */
function checkUnverifiableScience(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const unverifiable = graph.scientific.filter(
    (s) => s.confidence === "unverifiable" || s.confidence === "low"
  );

  for (const sci of unverifiable) {
    results.push({
      checker: "ScientificChecker",
      rule: "unverifiable_science",
      severity: "warning",
      message:
        `Unverifiable scientific claim (${sci.domain}): "${sci.claim}". ` +
        `Consult a domain expert or peer-reviewed source.`,
      evidence: [sci.id],
    });
  }

  return results;
}
