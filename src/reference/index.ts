/**
 * Reference Verification Pipeline — Barrel Export
 *
 * Aggregates all 8 checker modules, the extraction prompt, and the
 * needs-research output generator into a unified pipeline.
 *
 * 8 Checker Modules (31 rules total):
 * 1. HistoricalChecker (4 rules)
 * 2. GeographicChecker (4 rules)
 * 3. CulturalChecker (4 rules)
 * 4. ScientificChecker (4 rules)
 * 5. LinguisticChecker (4 rules)
 * 6. AnachronismChecker (4 rules)
 * 7. ConsistencyChecker (3 rules)
 * 8. SourceChecker (4 rules)
 */

export type { CheckResult } from "../logic/types";

// Main aggregate checker
export { checkReferences, collectAllClaims } from "./reference-checker";

// Individual checker modules
export { checkHistorical } from "./historical-checker";
export { checkGeographic } from "./geographic-checker";
export { checkCultural } from "./cultural-checker";
export { checkScientific } from "./scientific-checker";
export { checkLinguistic } from "./linguistic-checker";
export { checkAnachronism } from "./anachronism-checker";
export { checkConsistency } from "./consistency-checker";
export { checkSources } from "./source-checker";

// Extraction prompt
export { buildReferenceExtractionPrompt } from "./extraction-prompt";

// Needs-research output
export {
  generateNeedsResearch,
  writeNeedsResearchFile,
  extractVerifiedFacts,
} from "./needs-research";
export type {
  ResearchItem,
  ResearchResolution,
  NeedsResearchOutput,
} from "./needs-research";
