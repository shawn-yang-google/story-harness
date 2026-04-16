/**
 * @typedef {object} HarnessContext
 * @property {number} [minLength=100] - Minimum required length of the draft in characters. Defaults to 100.
 * @property {number} [maxConsecutiveEmptyLines=2] - Maximum allowed consecutive empty lines. Defaults to 2.
 * @property {boolean} [requireTitle=true] - Whether the draft must start with a non-empty line (considered a title). Defaults to true.
 * @property {boolean} [checkOverallWhitespace=true] - Whether to check for excessive leading/trailing whitespace on the entire draft. Defaults to true.
 * @property {number} [minTitleLength=5] - Minimum length for what is considered a 'title' line. Defaults to 5.
 * @property {number} [minNonEmptyLines=2] - Minimum number of non-empty lines required for basic structure. Defaults to 2.
 */

/**
 * Evaluates a narrative draft based on structural criteria.
 * @param {string} draft - The narrative draft to evaluate.
 * @param {HarnessContext} context - Configuration options for the evaluation.
 * @returns {Promise<{valid: boolean, feedback: string[]}>} - An object indicating validity and a list of feedback messages.
 */
async function evaluate(draft, context) {
    const feedback = [];
    let valid = true;

    // Default configuration
    const config = {
        minLength: context.minLength ?? 100,
        maxConsecutiveEmptyLines: context.maxConsecutiveEmptyLines ?? 2,
        requireTitle: context.requireTitle ?? true,
        checkOverallWhitespace: context.checkOverallWhitespace ?? true,
        minTitleLength: context.minTitleLength ?? 5,
        minNonEmptyLines: context.minNonEmptyLines ?? 2,
    };

    // 1. Check overall draft length
    if (draft.length < config.minLength) {
        feedback.push(`Draft is too short. Expected at least ${config.minLength} characters, but got ${draft.length}.`);
        valid = false;
    }

    // 1b. Check word count (scenes should be substantial)
    const minWords = context.minWords ?? 500;
    const wordCount = draft.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < minWords) {
        feedback.push(`Draft is only ${wordCount} words. A complete scene should be at least ${minWords} words. Expand the narrative with more detail, dialogue, and action.`);
        valid = false;
    }

    // 1c. Check for incomplete ending (mid-sentence cutoff)
    const trimmedDraft = draft.trim();
    if (trimmedDraft.length > 0) {
        const lastChar = trimmedDraft[trimmedDraft.length - 1];
        if (!['.', '!', '?', '"', "'", '…', '—'].includes(lastChar)) {
            feedback.push("Draft appears to end mid-sentence. Ensure the scene reaches a complete ending.");
            valid = false;
        }
    }

    // 2. Check for excessive leading/trailing whitespace on the entire draft
    if (config.checkOverallWhitespace) {
        if (draft.length > 0 && (draft[0] === ' ' || draft[0] === '\n' || draft[0] === '\t')) {
            feedback.push("Draft has leading whitespace or empty lines. Please start your narrative directly with content.");
            valid = false;
        }
        if (draft.length > 0 && (draft[draft.length - 1] === ' ' || draft[draft.length - 1] === '\n' || draft[draft.length - 1] === '\t')) {
            feedback.push("Draft has trailing whitespace or empty lines. Please end your narrative cleanly.");
            valid = false;
        }
    }

    const lines = draft.split('\n');
    const trimmedLines = lines.map(line => line.trim());
    const nonEmptyLines = trimmedLines.filter(line => line.length > 0);

    // 3. Check for presence of content
    if (nonEmptyLines.length === 0) {
        feedback.push("Draft contains no discernible content (only whitespace or empty lines).");
        valid = false;
    }

    // 4. Check for excessive consecutive empty lines
    let consecutiveEmptyLines = 0;
    for (const line of trimmedLines) {
        if (line.length === 0) {
            consecutiveEmptyLines++;
            if (consecutiveEmptyLines > config.maxConsecutiveEmptyLines) {
                feedback.push(`Excessive consecutive empty lines detected (more than ${config.maxConsecutiveEmptyLines}). Please format your narrative more cleanly.`);
                valid = false;
                break;
            }
        } else {
            consecutiveEmptyLines = 0;
        }
    }

    // 5. Check for a "title" (first non-empty line)
    if (config.requireTitle) {
        const firstNonEmptyLine = nonEmptyLines[0];
        if (!firstNonEmptyLine) {
            feedback.push("Draft is empty or contains only whitespace; a title is required.");
            valid = false;
        } else {
            if (firstNonEmptyLine.length < config.minTitleLength) {
                feedback.push(`The first non-empty line appears too short to be a proper title (expected at least ${config.minTitleLength} characters).`);
                valid = false;
            }
            if (!/[A-Za-z]/.test(firstNonEmptyLine)) {
                feedback.push("The first non-empty line does not contain any letters, suggesting it might not be a proper title.");
                valid = false;
            }
        }
    }

    // 6. Check for basic paragraph separation
    // This check only makes sense if the draft is otherwise long enough to expect paragraphs.
    if (nonEmptyLines.length < config.minNonEmptyLines && draft.length >= config.minLength) {
        feedback.push(`Draft appears to be a single block of text or too few distinct lines (${nonEmptyLines.length} found). Consider breaking it into paragraphs for better readability.`);
        valid = false;
    }

    return { valid, feedback };
}