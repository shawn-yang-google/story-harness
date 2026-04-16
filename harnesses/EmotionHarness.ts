/**
 * @typedef {object} HarnessContext
 * @property {('positive' | 'negative' | 'neutral')[]} [requiredEmotionCategories] - Optional array of emotion categories that *must* be detected in the draft. Valid categories: 'positive', 'negative', 'neutral'.
 * @property {('positive' | 'negative' | 'neutral')[]} [forbiddenEmotionCategories] - Optional array of emotion categories that *must not* be detected in the draft. Valid categories: 'positive', 'negative', 'neutral'.
 * @property {number} [minDetectedKeywords] - Minimum number of distinct emotion keywords that should be detected. Defaults to 1 if not specified.
 * @property {number} [minDraftLength] - Minimum length of the draft for meaningful emotional analysis. Defaults to 20 if not specified.
 */

/**
 * Evaluates the emotional content of a draft based on specified criteria.
 * @param {string} draft - The text draft to evaluate.
 * @param {HarnessContext} context - The context object containing evaluation parameters.
 * @returns {Promise<{valid: boolean, feedback: string[]}>} A promise that resolves to an object indicating validity and feedback messages.
 */
async function evaluate(draft, context) {
    const feedback = [];
    let valid = true;

    const lowerDraft = draft.toLowerCase();

    const MIN_DRAFT_LENGTH = context.minDraftLength ?? 20;
    const MIN_DETECTED_KEYWORDS = context.minDetectedKeywords ?? 1;

    // --- Pre-check: Draft Length ---
    if (draft.length < MIN_DRAFT_LENGTH) {
        valid = false;
        feedback.push(`Draft is too short (${draft.length} characters). Emotional analysis requires more context. Minimum ${MIN_DRAFT_LENGTH} characters.`);
        return { valid, feedback }; // Early exit if too short
    }

    // --- Emotion Keyword Definitions ---
    const emotionKeywords = {
        positive: ['happy', 'joy', 'delight', 'excited', 'love', 'glad', 'optimistic', 'hopeful', 'elated', 'thrilled', 'content', 'peace'],
        negative: ['sad', 'anger', 'fear', 'grief', 'frustration', 'anxious', 'despair', 'lonely', 'upset', 'worried', 'stressed', 'resentment', 'bitter'],
        neutral: ['calm', 'peaceful', 'serene', 'thoughtful', 'reflective', 'observant', 'indifferent', 'apathetic']
    };

    // --- Detected Emotions ---
    const detectedCategories = new Set();
    const detectedKeywords = [];

    for (const category of Object.keys(emotionKeywords)) {
        for (const keyword of emotionKeywords[category]) {
            if (lowerDraft.includes(keyword)) {
                detectedCategories.add(category);
                detectedKeywords.push(keyword);
            }
        }
    }

    // --- Feedback on detected emotions ---
    if (detectedKeywords.length > 0) {
        feedback.push(`Detected keywords: ${detectedKeywords.map(k => `'${k}'`).join(', ')}.`);
        feedback.push(`Detected emotion categories: ${Array.from(detectedCategories).join(', ')}.`);
    } else {
        feedback.push("No explicit emotional keywords detected in the draft.");
    }

    // --- Validation Rules ---

    // Rule 1: Minimum keyword detection is informational only.
    // Emotional depth is properly evaluated by CharacterChecker (unearned_emotion,
    // disproportionate_emotion) in Tier 2, which understands narrative context.
    if (detectedKeywords.length < MIN_DETECTED_KEYWORDS) {
        feedback.push(`Note: Found ${detectedKeywords.length} emotional keyword(s). Emotional depth is evaluated separately by the character checker.`);
    }

    // Rule 2: Required emotion categories
    if (context.requiredEmotionCategories && context.requiredEmotionCategories.length > 0) {
        for (const requiredCategory of context.requiredEmotionCategories) {
            if (!detectedCategories.has(requiredCategory)) {
                valid = false;
                feedback.push(`Validation failed: Required emotion category '${requiredCategory}' was not detected.`);
            }
        }
    }

    // Rule 3: Forbidden emotion categories
    if (context.forbiddenEmotionCategories && context.forbiddenEmotionCategories.length > 0) {
        for (const forbiddenCategory of context.forbiddenEmotionCategories) {
            if (detectedCategories.has(forbiddenCategory)) {
                valid = false;
                feedback.push(`Validation failed: Forbidden emotion category '${forbiddenCategory}' was detected.`);
            }
        }
    }

    return { valid, feedback };
}