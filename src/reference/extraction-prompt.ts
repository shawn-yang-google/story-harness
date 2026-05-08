/**
 * Reference Extraction Prompt — Instructs LLM to extract all real-world
 * factual claims from a narrative draft.
 *
 * The LLM acts as a fact-checker, identifying references to real history,
 * geography, culture, science, and linguistic patterns, then assessing
 * each claim's accuracy with a confidence level.
 */

import type { HarnessContext } from "../types";
import { getReferenceLevelConfig } from "./reference-level";
import type { ReferenceLevel } from "./reference-level";

const FENCE = "```";

export function buildReferenceExtractionPrompt(
  draft: string,
  context: HarnessContext
): string {
  const level = (context.personaConfig?.referenceLevel ?? 3) as ReferenceLevel;
  const levelConfig = getReferenceLevelConfig(level);

  const loreContext =
    Object.keys(context.loreDb).length > 0
      ? [
          "",
          "## Known Facts (Author-Provided Reference Database)",
          JSON.stringify(context.loreDb, null, 2),
          "",
          "Use these as ground truth. If a claim in the draft matches a fact in this database, mark it as \"accurate\" with confidence \"high\".",
        ].join("\n")
      : "";

  const jsonExampleLines = [
    "{",
    '  "claims": [',
    "    {",
    '      "id": "ref1",',
    '      "category": "historical|geographic|cultural|scientific|linguistic",',
    '      "excerpt": "exact quote from draft",',
    '      "claim": "normalized factual claim statement",',
    '      "location": "paragraph N, sentence M",',
    '      "confidence": "high|medium|low|unverifiable",',
    '      "reasoning": "why you believe this is accurate/inaccurate/uncertain",',
    '      "verdict": "accurate|inaccurate|partially_accurate|needs_research",',
    '      "correction": "the correct fact, if inaccurate (optional)",',
    '      "knowledgeSource": "basis for your assessment (optional)"',
    "    }",
    "  ],",
    '  "historical": [',
    "    {",
    '      "id": "hist1",',
    '      "subject": "Cultural Revolution",',
    '      "timePeriod": "1966-1976",',
    '      "claim": "The Cultural Revolution was launched by Mao Zedong",',
    '      "excerpt": "exact quote",',
    '      "location": "paragraph 1",',
    '      "confidence": "high",',
    '      "verdict": "accurate"',
    "    }",
    "  ],",
    '  "geographic": [',
    "    {",
    '      "id": "geo1",',
    '      "subject": "Proxima Centauri",',
    '      "type": "celestial",',
    '      "claim": "Proxima Centauri is a red dwarf star",',
    '      "excerpt": "exact quote",',
    '      "location": "paragraph 3",',
    '      "confidence": "high",',
    '      "verdict": "accurate"',
    "    }",
    "  ],",
    '  "cultural": [',
    "    {",
    '      "id": "cul1",',
    '      "subject": "Chinese intellectual class",',
    '      "type": "social_norm",',
    '      "claim": "Intellectuals were required to perform self-criticism sessions",',
    '      "regionAndEra": "China, 1966-1976",',
    '      "excerpt": "exact quote",',
    '      "location": "paragraph 2",',
    '      "confidence": "high",',
    '      "verdict": "accurate"',
    "    }",
    "  ],",
    '  "scientific": [',
    "    {",
    '      "id": "sci1",',
    '      "domain": "astronomy",',
    '      "claim": "Proxima Centauri b orbits in the habitable zone",',
    '      "assertedAsFact": true,',
    '      "excerpt": "exact quote",',
    '      "location": "paragraph 5",',
    '      "confidence": "medium",',
    '      "verdict": "partially_accurate",',
    '      "correction": "While in the habitable zone, stellar flares likely strip its atmosphere"',
    "    }",
    "  ],",
    '  "linguistic": [',
    "    {",
    '      "id": "ling1",',
    '      "languageOrDialect": "1960s Mandarin Chinese",',
    '      "regionAndEra": "Beijing, 1960s",',
    '      "type": "period_language",',
    '      "claim": "The honorific tongzhi (comrade) was the standard form of address",',
    '      "excerpt": "exact quote",',
    '      "location": "paragraph 1",',
    '      "confidence": "high",',
    '      "verdict": "accurate"',
    "    }",
    "  ],",
    '  "anachronisms": [',
    "    {",
    '      "id": "anach1",',
    '      "element": "smartphone",',
    '      "storyTimePeriod": "1960s",',
    '      "actualTimePeriod": "2007+",',
    '      "description": "Smartphones did not exist in the 1960s",',
    '      "excerpt": "exact quote",',
    '      "location": "paragraph 4",',
    '      "confidence": "high"',
    "    }",
    "  ],",
    '  "crossReferences": [',
    "    {",
    '      "id": "xref1",',
    '      "claimIds": ["hist1", "cul1"],',
    '      "inconsistency": "Draft says the event happened in 1958 but also says it was during the Cultural Revolution which started in 1966"',
    "    }",
    "  ]",
  ];

  if (levelConfig.enableEnrichment) {
    // Remove the trailing "]" from crossReferences to add a comma separator
    jsonExampleLines.push(",");
    jsonExampleLines.push(
      '  "enrichmentSuggestions": [',
      "    {",
      '      "claimId": "ref1",',
      '      "category": "historical",',
      '      "suggestion": "The castle was specifically built in the Manueline style, characterized by maritime motifs",',
      '      "rationale": "Adding architectural style would ground the scene in specific Portuguese history",',
      '      "confidence": "medium"',
      "    }",
      "  ]",
    );
  }

  if (levelConfig.enableResearchQuestions) {
    jsonExampleLines.push(",");
    jsonExampleLines.push(
      '  "researchQuestions": [',
      "    {",
      '      "claimIds": ["ref1", "hist1"],',
      '      "question": "What was daily life like for servants in this specific castle during this period?",',
      '      "impact": "Would add authentic texture to the domestic scenes",',
      '      "suggestedSources": ["Local historical archives", "Period diaries"]',
      "    }",
      "  ]",
    );
  }

  jsonExampleLines.push("}");

  const jsonExample = jsonExampleLines.join("\n");

  return [
    "You are an expert fact-checker and research analyst for fiction. Your task is to extract ALL real-world factual claims from the following narrative draft and assess their accuracy.",
    "",
    "## Your Role",
    "",
    'Great fiction is grounded in truth. "The Three-Body Problem" works because Liu Cixin accurately depicted the Cultural Revolution (1966-1976), the physics of three-body orbital mechanics, the environment of Proxima Centauri, and the speech patterns of Chinese intellectuals across different decades. Your job is to find every place where this draft makes a claim about the real world — and verify it or flag it for research.',
    "",
    "## What Counts as a Factual Claim",
    "",
    "1. **Historical**: References to real events, dates, figures, wars, political movements, institutions",
    '   - Example: "The Cultural Revolution began in 1966" -> historical claim',
    '   - Example: "During the Red Guard era, intellectuals were sent to re-education camps" -> historical claim',
    "",
    "2. **Geographic/Environmental**: Real places, natural phenomena, climate, terrain, celestial bodies",
    '   - Example: "Proxima Centauri is 4.24 light-years from Earth" -> geographic/celestial claim',
    '   - Example: "The Gobi Desert stretches across northern China and southern Mongolia" -> geographic claim',
    "",
    "3. **Cultural**: Customs, social norms, traditions, food, clothing, art of specific regions/eras",
    '   - Example: "In 1960s rural China, families shared a single coal stove" -> cultural claim',
    '   - Example: "Japanese tea ceremony involves specific hand movements called temae" -> cultural claim',
    "",
    "4. **Scientific/Technical**: Physics, biology, chemistry, medicine, engineering claims",
    '   - Example: "Radio waves travel at the speed of light" -> scientific claim',
    '   - Example: "The strong nuclear force binds quarks together" -> scientific claim',
    "   - Distinguish: claims presented as speculative fiction vs. asserted as real-world fact",
    "",
    "5. **Linguistic**: Dialogue patterns, dialect features, period-appropriate language, regional idioms",
    "   - Example: A character from 1960s Beijing using modern internet slang -> anachronism",
    "   - Example: Southern Chinese dialect features in a character from Heilongjiang -> linguistic mismatch",
    "   - Example: Period-specific honorifics or forms of address",
    loreContext,
    "",
    "## Output Format",
    "",
    "Return a JSON object with the following structure. Be thorough — extract EVERY factual claim, no matter how small.",
    "",
    FENCE + "json",
    jsonExample,
    FENCE,
    "",
    "## Confidence Assessment Guidelines",
    "",
    "- **high**: Well-known facts that you are very confident about (major historical events, basic science, famous places)",
    "- **medium**: Facts you believe are correct but have some uncertainty (specific dates, niche cultural details)",
    "- **low**: Facts you have limited knowledge about and cannot fully verify (regional dialects, obscure historical details)",
    '- **unverifiable**: Claims about very specific or obscure facts that require specialized research (local customs of a small village, exact dialogue patterns of a specific profession in a specific decade)',
    "",
    levelConfig.promptPreamble,
    "",
    "## Critical Rules",
    "",
    '1. Extract EVERY factual claim, even small ones. A story mentioning "the cobblestone streets of Prague" is making a geographic claim.',
    '2. For claims you cannot verify (confidence: "low" or "unverifiable"), set verdict to "needs_research". The author will need to verify these.',
    '3. Do NOT mark fictional elements as factual claims. "The alien spoke" is fiction. "The alien spoke in perfect Mandarin, using the Beijing dialect" contains a linguistic claim about what Beijing Mandarin sounds like.',
    "4. Anachronisms are critical errors. A 1960s character checking their phone, using modern slang, or referencing future events must be flagged.",
    '5. For speculative fiction science (FTL travel, alien technology), only flag if the story ALSO asserts real science incorrectly. "The sophon used quantum entanglement for FTL communication" is fiction. "Quantum entanglement allows FTL communication" asserted as fact is inaccurate.',
    "6. When in doubt, flag for research. It is better to ask the author to verify than to let an inaccuracy through.",
    "",
    "## Draft to Analyze",
    "",
    "---",
    draft,
    "---",
    "",
    "Return ONLY the JSON object. No commentary, no markdown explanation outside the code block.",
  ].join("\n");
}
