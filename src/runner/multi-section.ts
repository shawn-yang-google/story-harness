import { RejectionSamplingRunner, type RunnerOptions } from "./index";
import { StorySplitter, type SplitSection } from "./story-splitter";

export interface MultiSectionOptions extends RunnerOptions {
  /** Maximum words per section (default: 1200). Sections exceeding this are split. */
  maxWordsPerSection: number;
}

export interface GeneratedSection {
  /** The title of this section. */
  title: string;
  /** The generated content for this section. */
  content: string;
  /** The prompt used to generate this section. */
  prompt: string;
}

export interface MultiSectionResult {
  /** Individual generated sections. */
  sections: GeneratedSection[];
  /** The combined full story text. */
  combined: string;
}

/**
 * Generates a multi-section story by:
 * 1. Splitting a long prompt into coherent sections using StorySplitter
 * 2. Generating each section sequentially via RejectionSamplingRunner
 * 3. Accumulating previousBeats for cross-section coherence
 */
export class MultiSectionRunner {
  private splitter: StorySplitter;
  private runnerOptions: RunnerOptions;

  constructor(private options: MultiSectionOptions) {
    this.splitter = new StorySplitter({
      maxWordsPerSection: options.maxWordsPerSection,
    });
    this.runnerOptions = {
      harnessDirectory: options.harnessDirectory,
      maxRetries: options.maxRetries,
      loreDb: options.loreDb,
      targetAudience: options.targetAudience,
      logDirectory: options.logDirectory,
      enabledHarnesses: options.enabledHarnesses,
      systemPrompt: options.systemPrompt,
      personaConfig: options.personaConfig,
    };
  }

  /**
   * Generate a full story by splitting the prompt and generating each section.
   *
   * @param prompt - The full story prompt.
   * @param previousBeats - Optional previous beats for continuity with prior stories.
   * @returns The generated sections and combined story.
   */
  async generate(
    prompt: string,
    previousBeats: string[] = []
  ): Promise<MultiSectionResult> {
    // Step 1: Split the prompt into sections
    const splitSections = await this.splitter.split(prompt, previousBeats);

    console.log(`Story split into ${splitSections.length} section(s):`);
    for (const section of splitSections) {
      console.log(`  - ${section.title} (~${section.estimatedWords} words)`);
    }

    // Step 2: Generate each section sequentially, accumulating beats
    const runner = new RejectionSamplingRunner(this.runnerOptions);

    // Seed the runner with any existing previous beats
    for (const beat of previousBeats) {
      runner.getPreviousBeats().push(beat);
    }

    const generatedSections: GeneratedSection[] = [];

    for (let i = 0; i < splitSections.length; i++) {
      const section = splitSections[i];
      const divider = "=".repeat(60);
      console.log("\n" + divider + "\nGenerating section " + (i + 1) + "/" + splitSections.length + ": " + section.title + "\n" + divider);

      try {
        const content = await runner.generateScene(section.prompt);
        generatedSections.push({
          title: section.title,
          content,
          prompt: section.prompt,
        });
      } catch (err: any) {
        console.error(
          `Section "${section.title}" failed after retries: ${err.message}`
        );
        // Still include the section with an error marker so we don't lose prior work
        generatedSections.push({
          title: section.title,
          content: `[Generation failed: ${err.message}]`,
          prompt: section.prompt,
        });
      }
    }

    // Step 3: Combine all sections
    const combined = generatedSections
      .map((s) => "## " + s.title + "\n\n" + s.content)
      .join("\n\n---\n\n");

    return { sections: generatedSections, combined };
  }
}
