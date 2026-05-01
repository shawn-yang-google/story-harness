import type { ReferenceGraph, FactualClaim, CrossReference } from "../types/reference-graph";
import type { CheckResult } from "../logic/types";
import { collectAllClaims } from "./reference-checker";

/**
 * ConsistencyChecker — Detects internal contradictions between factual claims.
 *
 * Like PropositionalChecker for logic, this ensures the story's real-world
 * claims don't contradict each other.
 *
 * Checks:
 * 1. cross_reference_conflict: LLM-detected contradictions between claims
 * 2. category_contradiction: Same subject with conflicting facts in different categories
 * 3. duplicate_claim: Same fact stated differently with different verdicts
 */
export function checkConsistency(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(...checkCrossReferenceConflicts(graph));
  results.push(...checkCategoryContradictions(graph));
  results.push(...checkDuplicateClaims(graph));

  return results;
}

/**
 * Check 1: Cross-Reference Conflicts
 * The LLM has already detected internal contradictions.
 */
function checkCrossReferenceConflicts(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];

  for (const xref of graph.crossReferences) {
    results.push({
      checker: "ConsistencyChecker",
      rule: "cross_reference_conflict",
      severity: "error",
      message:
        `Internal factual contradiction: ${xref.inconsistency}. ` +
        `Claims [${xref.claimIds.join(", ")}] conflict with each other.`,
      evidence: xref.claimIds,
    });
  }

  return results;
}

/**
 * Check 2: Category Contradictions
 * Same subject appears in different categories with conflicting information.
 * E.g., a historical reference says X happened in 1960 but a cultural
 * reference about the same event says 1965.
 */
function checkCategoryContradictions(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];
  const allClaims = collectAllClaims(graph);

  // Group claims by subject keywords (simple overlap detection)
  const subjectGroups = new Map<string, FactualClaim[]>();

  for (const claim of allClaims) {
    // Extract key terms from the claim for grouping
    const terms = claim.claim
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 4); // Only substantial words

    for (const term of terms) {
      if (!subjectGroups.has(term)) {
        subjectGroups.set(term, []);
      }
      subjectGroups.get(term)!.push(claim);
    }
  }

  // Check for groups where claims have contradictory verdicts
  const flagged = new Set<string>();
  for (const [_term, claims] of subjectGroups) {
    if (claims.length < 2) continue;

    const accurate = claims.filter((c) => c.verdict === "accurate");
    const inaccurate = claims.filter((c) => c.verdict === "inaccurate");

    if (accurate.length > 0 && inaccurate.length > 0) {
      // Same subject, one accurate and one inaccurate — potential contradiction
      for (const acc of accurate) {
        for (const inacc of inaccurate) {
          if (acc.category !== inacc.category) {
            const key = [acc.id, inacc.id].sort().join("-");
            if (!flagged.has(key)) {
              flagged.add(key);
              results.push({
                checker: "ConsistencyChecker",
                rule: "category_contradiction",
                severity: "warning",
                message:
                  `Possible cross-category contradiction: ` +
                  `${acc.category} claim "${acc.claim.slice(0, 60)}..." is accurate, ` +
                  `but ${inacc.category} claim "${inacc.claim.slice(0, 60)}..." about ` +
                  `a related subject is inaccurate. Verify these don't conflict.`,
                evidence: [acc.id, inacc.id],
              });
            }
          }
        }
      }
    }
  }

  return results;
}

/**
 * Check 3: Duplicate Claims
 * Same factual claim stated in multiple places with different verdicts.
 */
function checkDuplicateClaims(graph: ReferenceGraph): CheckResult[] {
  const results: CheckResult[] = [];
  const allClaims = collectAllClaims(graph);

  // Simple dedup: check for claims with very similar text but different verdicts
  const flagged = new Set<string>();
  for (let i = 0; i < allClaims.length; i++) {
    for (let j = i + 1; j < allClaims.length; j++) {
      const a = allClaims[i];
      const b = allClaims[j];

      // Same claim text (normalized) but different verdict
      const aNorm = a.claim.toLowerCase().trim();
      const bNorm = b.claim.toLowerCase().trim();

      if (aNorm === bNorm && a.verdict !== b.verdict) {
        const key = [a.id, b.id].sort().join("-");
        if (!flagged.has(key)) {
          flagged.add(key);
          results.push({
            checker: "ConsistencyChecker",
            rule: "duplicate_claim",
            severity: "warning",
            message:
              `Duplicate claim with conflicting verdicts: "${a.claim}" ` +
              `appears as both "${a.verdict}" (${a.id}) and "${b.verdict}" (${b.id}).`,
            evidence: [a.id, b.id],
          });
        }
      }
    }
  }

  return results;
}
