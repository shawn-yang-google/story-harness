import type { ReferenceGraph, GeographicReference } from "../types/reference-graph";
import type { CheckResult } from "../logic/types";

/**
 * GeographicChecker — Verifies geographic and environmental references.
 *
 * Checks:
 * 1. inaccurate_geography: Wrong physical descriptions of real places
 * 2. inaccurate_celestial: Wrong properties of celestial bodies
 * 3. impossible_environment: Physically impossible environmental descriptions
 * 4. unverifiable_place: Geographic claim that needs research
 */
export function checkGeographic(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkInaccurateGeography(graph));
  results.push(...checkInaccurateCelestial(graph));
  results.push(...checkImpossibleEnvironment(graph));
  results.push(...checkUnverifiablePlace(graph));

  return results;
}

/**
 * Check 1: Inaccurate Geography
 * Real places with wrong terrain, climate, or architecture descriptions.
 */
function checkInaccurateGeography(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const realPlaces = graph.geographic.filter(
    (g) => g.type === "real_place" || g.type === "terrain" || g.type === "climate"
  );

  for (const geo of realPlaces) {
    if (geo.verdict === "inaccurate") {
      results.push({
        checker: "GeographicChecker",
        rule: "inaccurate_geography",
        severity: geo.confidence === "high" ? "error" : "warning",
        message:
          `Inaccurate geographic description: "${geo.subject}" — ${geo.claim}. ` +
          (geo.correction ? `Correction: ${geo.correction}. ` : "") +
          `[excerpt: "${geo.excerpt.slice(0, 100)}"]`,
        evidence: [geo.id],
      });
    }
  }

  return results;
}

/**
 * Check 2: Inaccurate Celestial
 * Wrong properties of stars, planets, moons, etc.
 */
function checkInaccurateCelestial(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const celestial = graph.geographic.filter((g) => g.type === "celestial");

  for (const body of celestial) {
    if (body.verdict === "inaccurate" || body.verdict === "partially_accurate") {
      results.push({
        checker: "GeographicChecker",
        rule: "inaccurate_celestial",
        severity: body.verdict === "inaccurate" ? "error" : "warning",
        message:
          `Inaccurate celestial body description: "${body.subject}" — ${body.claim}. ` +
          (body.correction ? `Correction: ${body.correction}. ` : "") +
          `[excerpt: "${body.excerpt.slice(0, 100)}"]`,
        evidence: [body.id],
      });
    }
  }

  return results;
}

/**
 * Check 3: Impossible Environment
 * Natural phenomena described in ways that violate physics.
 */
function checkImpossibleEnvironment(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const naturalPhenomena = graph.geographic.filter(
    (g) => g.type === "natural_phenomenon"
  );

  for (const phenom of naturalPhenomena) {
    if (phenom.verdict === "inaccurate" && phenom.confidence === "high") {
      results.push({
        checker: "GeographicChecker",
        rule: "impossible_environment",
        severity: "error",
        message:
          `Impossible environmental description: "${phenom.subject}" — ` +
          `${phenom.claim}. This violates known physical laws. ` +
          (phenom.correction ? `Reality: ${phenom.correction}. ` : ""),
        evidence: [phenom.id],
      });
    }
  }

  return results;
}

/**
 * Check 4: Unverifiable Place
 * Geographic claims the model can't verify.
 */
function checkUnverifiablePlace(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  const unverifiable = graph.geographic.filter(
    (g) => g.confidence === "unverifiable" || g.confidence === "low"
  );

  for (const geo of unverifiable) {
    results.push({
      checker: "GeographicChecker",
      rule: "unverifiable_place",
      severity: "warning",
      message:
        `Unverifiable geographic claim: "${geo.subject}" — ${geo.claim}. ` +
        `Author should verify this description.`,
      evidence: [geo.id],
    });
  }

  return results;
}
