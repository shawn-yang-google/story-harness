/**
 * ReferenceGraph — Structured representation of real-world claims in narrative.
 *
 * Extracted by LLM (Phase A of Tier 2 Reference Harness), verified by
 * deterministic checkers (Phase B). Unverifiable claims are exported as
 * a "needs-research" JSON file for human review.
 *
 * Inspired by works like "The Three-Body Problem" which ground fiction in
 * real history (Cultural Revolution), real science (Proxima Centauri),
 * real geography (Red Coast Base in Inner Mongolia), and real cultural
 * context (1960s–80s Chinese intellectual life).
 */

// === Claim Categories ===

export type ClaimCategory =
  | "historical"
  | "geographic"
  | "cultural"
  | "scientific"
  | "linguistic";

export type ConfidenceLevel = "high" | "medium" | "low" | "unverifiable";

/**
 * A single factual claim extracted from the narrative.
 */
export interface FactualClaim {
  /** Unique identifier, e.g. "ref1" */
  id: string;
  /** The category of this claim */
  category: ClaimCategory;
  /** The exact text from the draft containing the claim */
  excerpt: string;
  /** A normalized, precise statement of the factual claim */
  claim: string;
  /** Where in the draft: "paragraph 2, sentence 3" */
  location: string;
  /** How confident the model is in the claim's accuracy */
  confidence: ConfidenceLevel;
  /** The model's reasoning for its confidence assessment */
  reasoning: string;
  /** If verifiable, the model's verdict */
  verdict: "accurate" | "inaccurate" | "partially_accurate" | "needs_research";
  /** If inaccurate, what the correct fact is (if known) */
  correction?: string;
  /** Source or basis for the model's knowledge (if any) */
  knowledgeSource?: string;
}

// === Historical References ===

export interface HistoricalReference {
  /** Unique identifier */
  id: string;
  /** The historical event, period, or figure referenced */
  subject: string;
  /** The time period or date claimed */
  timePeriod: string;
  /** The claim made about this historical subject */
  claim: string;
  /** Excerpt from the draft */
  excerpt: string;
  location: string;
  confidence: ConfidenceLevel;
  verdict: "accurate" | "inaccurate" | "partially_accurate" | "needs_research";
  correction?: string;
}

// === Geographic & Environmental References ===

export interface GeographicReference {
  /** Unique identifier */
  id: string;
  /** The place, landmark, or natural phenomenon */
  subject: string;
  /** Type: "real_place" | "natural_phenomenon" | "climate" | "terrain" | "celestial" */
  type: "real_place" | "natural_phenomenon" | "climate" | "terrain" | "celestial";
  /** The environmental or geographic claim */
  claim: string;
  excerpt: string;
  location: string;
  confidence: ConfidenceLevel;
  verdict: "accurate" | "inaccurate" | "partially_accurate" | "needs_research";
  correction?: string;
}

// === Cultural References ===

export interface CulturalReference {
  /** Unique identifier */
  id: string;
  /** The culture, community, or social context */
  subject: string;
  /** Type: "custom" | "social_norm" | "tradition" | "belief" | "food" | "clothing" | "art" */
  type: "custom" | "social_norm" | "tradition" | "belief" | "food" | "clothing" | "art";
  /** The cultural claim */
  claim: string;
  /** The region and time period this claim applies to */
  regionAndEra: string;
  excerpt: string;
  location: string;
  confidence: ConfidenceLevel;
  verdict: "accurate" | "inaccurate" | "partially_accurate" | "needs_research";
  correction?: string;
}

// === Scientific / Technical References ===

export interface ScientificReference {
  /** Unique identifier */
  id: string;
  /** The scientific domain: "physics" | "biology" | "chemistry" | "astronomy" | "medicine" | "engineering" | "other" */
  domain: "physics" | "biology" | "chemistry" | "astronomy" | "medicine" | "engineering" | "other";
  /** The scientific or technical claim */
  claim: string;
  /** Whether this is presented as speculative/fictional science or asserted as fact */
  assertedAsFact: boolean;
  excerpt: string;
  location: string;
  confidence: ConfidenceLevel;
  verdict: "accurate" | "inaccurate" | "partially_accurate" | "needs_research";
  correction?: string;
}

// === Linguistic / Dialogue Authenticity ===

export interface LinguisticReference {
  /** Unique identifier */
  id: string;
  /** The language, dialect, or register being represented */
  languageOrDialect: string;
  /** The region and era this speech pattern belongs to */
  regionAndEra: string;
  /** Type: "dialect_feature" | "period_language" | "slang" | "register" | "idiom" | "naming_convention" */
  type: "dialect_feature" | "period_language" | "slang" | "register" | "idiom" | "naming_convention";
  /** The specific linguistic claim or usage */
  claim: string;
  excerpt: string;
  location: string;
  confidence: ConfidenceLevel;
  verdict: "accurate" | "inaccurate" | "partially_accurate" | "needs_research";
  correction?: string;
}

// === Anachronism Detection ===

export interface AnachronismEntry {
  /** Unique identifier */
  id: string;
  /** The anachronistic element */
  element: string;
  /** When the story is set */
  storyTimePeriod: string;
  /** When the element actually existed/was introduced */
  actualTimePeriod: string;
  /** The specific anachronism */
  description: string;
  excerpt: string;
  location: string;
  confidence: ConfidenceLevel;
}

// === Cross-Reference Consistency ===

export interface CrossReference {
  /** Unique identifier */
  id: string;
  /** IDs of the claims that conflict with each other */
  claimIds: string[];
  /** Description of the inconsistency */
  inconsistency: string;
}

// === Full Reference Graph ===

export interface ReferenceGraph {
  /** All extracted factual claims (flat list) */
  claims: FactualClaim[];
  /** Historical event/period/figure references */
  historical: HistoricalReference[];
  /** Geographic and environmental references */
  geographic: GeographicReference[];
  /** Cultural context references */
  cultural: CulturalReference[];
  /** Scientific and technical references */
  scientific: ScientificReference[];
  /** Linguistic and dialogue authenticity */
  linguistic: LinguisticReference[];
  /** Detected anachronisms */
  anachronisms: AnachronismEntry[];
  /** Internal cross-reference inconsistencies */
  crossReferences: CrossReference[];
}

export function createEmptyReferenceGraph(): ReferenceGraph {
  return {
    claims: [],
    historical: [],
    geographic: [],
    cultural: [],
    scientific: [],
    linguistic: [],
    anachronisms: [],
    crossReferences: [],
  };
}
