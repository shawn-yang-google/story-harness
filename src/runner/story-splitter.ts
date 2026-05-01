import { generateContent, MODELS } from "../llm";

export interface SplitSection {
  /** A short title for this section. */
  title: string;
  /** The prompt/description for generating this section. */
  prompt: string;
  /** Estimated word count for this section. */
  estimatedWords: number;
}

export interface StorySplitterOptions {
  /** Maximum words per generated section (default: 1200). */
  maxWordsPerSection: number;
}

/**
 * Splits a long story prompt into smaller, coherent sections using an LLM.
 *
 * Each section is designed to be independently generatable while maintaining
 * narrative coherence through accumulated previousBeats context.
 */
export class StorySplitter {
  constructor(private options: StorySplitterOptions) {}

  /**
   * Split a story prompt into sections.
   *
   * If the prompt describes a short story (estimated under maxWordsPerSection),
   * returns a single section wrapping the original prompt.
   *
   * @param prompt - The full story prompt to split.
   * @param previousBeats - Optional previous story beats for context.
   * @returns An array of sections to generate sequentially.
   */
  async split(prompt: string, previousBeats: string[] = []): Promise<SplitSection[]> {
    const splitPrompt = this.buildSplitPrompt(prompt, previousBeats);

    try {
      const response = await generateContent(MODELS.EVALUATOR, splitPrompt);
      if (!response) {
        return this.fallback(prompt);
      }

      const sections = this.parseResponse(response, prompt);
      return sections;
    } catch {
      return this.fallback(prompt);
    }
  }

  private buildSplitPrompt(prompt: string, previousBeats: string[]): string {
    const nl = "\n";
    const beatsContext =
      previousBeats.length > 0
        ? nl + nl + "Previous story beats (for context):" + nl +
          previousBeats.map((b, i) => `${i + 1}. ${b}`).join(nl)
        : "";

    return [
      "Split the following story prompt into sequential sections that can each be generated as an independent scene of approximately",
      `${this.options.maxWordsPerSection} words or fewer.`,
      "",
      "Each section should:",
      "- Have a clear dramatic purpose (setup, escalation, climax, resolution, etc.)",
      "- Be self-contained enough to generate independently",
      "- Flow naturally into the next section",
      "",
      "Return a JSON array (no markdown fences, no commentary) with this structure:",
      '[{ "title": "Section Title", "prompt": "Detailed prompt for generating this section", "estimatedWords": 500 }]',
      "",
      "If the story is short enough for a single section, return an array with one element.",
      beatsContext,
      "",
      "Story prompt:",
      prompt,
    ].join(nl);
  }

  private parseResponse(response: string, originalPrompt: string): SplitSection[] {
    // Strip markdown code fences if present
    let cleaned = response.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    try {
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return this.fallback(originalPrompt);
      }

      // Validate structure
      const sections: SplitSection[] = [];
      for (const item of parsed) {
        if (typeof item.prompt === "string" && item.prompt.length > 0) {
          sections.push({
            title: String(item.title || `Section ${sections.length + 1}`),
            prompt: item.prompt,
            estimatedWords: Number(item.estimatedWords) || this.options.maxWordsPerSection,
          });
        }
      }

      return sections.length > 0 ? sections : this.fallback(originalPrompt);
    } catch {
      return this.fallback(originalPrompt);
    }
  }

  private fallback(prompt: string): SplitSection[] {
    return [
      {
        title: "Full Story",
        prompt,
        estimatedWords: this.options.maxWordsPerSection,
      },
    ];
  }
}
