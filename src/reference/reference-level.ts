/**
 * Reference Level Configuration — Controls depth and rigor of fact-checking.
 *
 * Level 1 (Scan): Only obvious errors. Skip niche categories.
 * Level 2 (Validate): Standard extraction and assessment.
 * Level 3 (Scrutinize): Force explicit reasoning. Challenge confidence.
 * Level 4 (Investigate): Extract implicit claims. Generate enrichment suggestions.
 * Level 5 (Research): Research consultant mode. Generate research questions.
 */

export type ReferenceLevel = 1 | 2 | 3 | 4 | 5;

export interface ReferenceLevelConfig {
  level: ReferenceLevel;
  name: string;
  /** Injected into the extraction prompt */
  promptPreamble: string;
  /** Categories to skip at this level */
  skipCategories: string[];
  /** Whether to generate enrichment suggestions */
  enableEnrichment: boolean;
  /** Whether to generate research questions */
  enableResearchQuestions: boolean;
}

export function getReferenceLevelConfig(level: ReferenceLevel): ReferenceLevelConfig {
  return LEVEL_CONFIGS[level];
}

const LEVEL_CONFIGS: Record<ReferenceLevel, ReferenceLevelConfig> = {
  1: {
    level: 1,
    name: "scan",
    skipCategories: ["linguistic", "cultural"],
    enableEnrichment: false,
    enableResearchQuestions: false,
    promptPreamble: `## Extraction Depth: SCAN (Level 1)
Focus ONLY on obvious, clear-cut factual errors:
- Wrong dates for well-known events
- Blatant anachronisms (modern tech in historical settings)
- Impossible measurements or physics violations
- Skip niche cultural, linguistic, or regional claims.
- If a claim seems plausible, mark it "accurate" and move on.
- Do NOT extract claims you are uncertain about — only extract what you can confidently assess.`,
  },
  2: {
    level: 2,
    name: "validate",
    skipCategories: [],
    enableEnrichment: false,
    enableResearchQuestions: false,
    promptPreamble: `## Extraction Depth: VALIDATE (Level 2)
Extract all factual claims across all categories.
- Apply standard confidence assessment.
- Mark claims you cannot verify as "needs_research".
- Do not challenge your own "accurate" verdicts — if you believe it's correct, mark it so.`,
  },
  3: {
    level: 3,
    name: "scrutinize",
    skipCategories: [],
    enableEnrichment: false,
    enableResearchQuestions: false,
    promptPreamble: `## Extraction Depth: SCRUTINIZE (Level 3)
Extract all factual claims with heightened skepticism:
- For EVERY claim you mark as "accurate", you MUST provide explicit reasoning in the "reasoning" field explaining WHY you believe it is correct. "Well-known fact" is NOT sufficient — state the specific basis.
- For EVERY claim you mark as "high" confidence, ask yourself: "Am I certain, or am I pattern-matching?" If there is ANY doubt, downgrade to "medium".
- Flag any claim without a clear knowledge source as needing research, even if you believe it's probably correct.
- Prefer "partially_accurate" over "accurate" when nuance exists.`,
  },
  4: {
    level: 4,
    name: "investigate",
    skipCategories: [],
    enableEnrichment: true,
    enableResearchQuestions: false,
    promptPreamble: `## Extraction Depth: INVESTIGATE (Level 4)
Extract all claims with deep analytical rigor:
- Apply all Level 3 rules (explicit reasoning, skepticism of "high" confidence).
- ADDITIONALLY, look for IMPLICIT claims — unstated assumptions the narrative makes about its setting. If a story set in 1920s Paris describes a character "hailing a taxi," that implies taxis existed in 1920s Paris. Extract that as a claim.
- For each "accurate" verdict, consider: is there a MORE PRECISE version of this fact that would enrich the story? If the draft says "the castle was old," the enrichment might be "Château de Chambord was built 1519-1547 in Loire Valley Renaissance style."
- In the "enrichmentSuggestions" array, provide specific details the author could add to deepen authenticity.`,
  },
  5: {
    level: 5,
    name: "research",
    skipCategories: [],
    enableEnrichment: true,
    enableResearchQuestions: true,
    promptPreamble: `## Extraction Depth: RESEARCH (Level 5 — Maximum)
You are a research consultant, not just a fact-checker. Your goal is to make this story the most well-researched narrative possible:
- Apply all Level 4 rules (implicit claims, enrichment suggestions).
- ADDITIONALLY, for every scene, ask: "What would a specialist in this domain want the author to know?" Generate "researchQuestions" — open-ended questions that, if answered, would dramatically improve the story's authenticity.
- Treat EVERY claim as "needs_research" UNLESS your reasoning is ironclad and citation-grade. The bar for "accurate" at this level is: "I could cite a specific source for this."
- For enrichment, go beyond corrections — suggest sensory details, atmosphere details, period-specific textures that a researcher would uncover.
- Challenge clichéd depictions: if the story uses a common stereotype about a culture/era, note it even if it's technically "accurate" — accuracy is not the same as depth.`,
  },
};
