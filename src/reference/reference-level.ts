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
Extract all claims with deep analytical rigor.

### Hard Quota (this is enforced — if you violate it you have failed the task)
- AT MOST 30% of your claims may have \`confidence: high\`. If you produce more, you are rubber-stamping.
- AT LEAST 25% of your claims must be \`needs_research\` OR \`partially_accurate\`.

### Few-Shot Examples of CORRECT Downgrade Behavior

WRONG (rubber-stamp):
\`\`\`
{ "claim": "The Cultural Revolution began in 1966", "confidence": "high", "verdict": "accurate", "reasoning": "Well-known fact" }
\`\`\`
Why wrong: "Well-known fact" is not a knowledge source. The exact year is verifiable but the claim's framing ("began") elides the May 16 Notification vs. the broader 1966-1976 period question.

CORRECT (downgraded):
\`\`\`
{ "claim": "The Cultural Revolution began in 1966", "confidence": "medium", "verdict": "partially_accurate", "reasoning": "1966 is correct for the May 16 Notification, but historians distinguish the launch (May 1966) from the violent peak (1966-1968).", "knowledgeSource": "Standard PRC historiography (MacFarquhar)" }
\`\`\`

WRONG (rubber-stamp):
\`\`\`
{ "claim": "Penicillin treats bacterial infections", "confidence": "high", "verdict": "accurate" }
\`\`\`
CORRECT (downgraded — even basic facts deserve scrutiny):
\`\`\`
{ "claim": "Penicillin treats bacterial infections", "confidence": "medium", "verdict": "partially_accurate", "reasoning": "True for many gram-positive bacteria, but resistance is widespread by the story's setting (post-2000); the specific infection type matters." }
\`\`\`

### Other Rules
- Apply all Level 3 rules (explicit reasoning, prefer "partially_accurate" over "accurate" when nuance exists).
- Look for IMPLICIT claims — unstated assumptions the narrative makes about its setting. If a story set in 1920s Paris describes a character "hailing a taxi," that implies taxis existed in 1920s Paris. Extract that as a claim.
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
You are a research consultant, not just a fact-checker. Your goal is to make this story the most well-researched narrative possible.

### Hard Quota (enforced — violating it means you have failed)
- AT MOST 10% of claims may have \`confidence: high\`. The bar is "I could cite a specific named source."
- AT LEAST 50% of claims must be \`needs_research\`.
- Every \`accurate\` verdict MUST include a non-empty \`knowledgeSource\` field naming a specific source (book title, archive, paper, etc.). "General knowledge" is REJECTED.

### Few-Shot: A High-Quality Research Question

\`\`\`
{
  "claimIds": ["hist3", "cul1"],
  "question": "In 1990s rural Anhui, what was the typical legal-aid pathway for a defendant accused of dereliction of duty under PRC Criminal Law Article 397? Were court-appointed lawyers common, or did families rely on petitioning?",
  "impact": "Would clarify the protagonist's legal options in the wrongful-conviction arc and avoid the common Western trope of an adversarial defense lawyer.",
  "suggestedSources": ["Stanley Lubman, Bird in a Cage (1999)", "Local Anhui court records via CNKI", "Interviews with retired procurators"]
}
\`\`\`

### Other Rules
- Apply all Level 4 rules (implicit claims, enrichment suggestions, downgrade-by-default).
- For every scene, ask: "What would a specialist in this domain want the author to know?" Generate "researchQuestions" — open-ended, source-suggesting questions that, if answered, would dramatically improve authenticity.
- For enrichment, go beyond corrections — suggest sensory details, atmosphere details, period-specific textures that a researcher would uncover.
- Challenge clichéd depictions: if the story uses a common stereotype about a culture/era, note it even if it is technically "accurate" — accuracy is not the same as depth.`,
  },
};
