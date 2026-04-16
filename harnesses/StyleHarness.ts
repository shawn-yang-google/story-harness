async function evaluate(draft, context) {
    const feedback = [];
    let valid = true;

    // No hard length limit — quality is judged by content, not character count.
    // Pacing, structure, and style checks handle verbosity implicitly.

    const fillerWords = ['just', 'very', 'really', 'basically', 'actually', 'quite', 'perhaps', 'maybe', 'sort of', 'kind of', 'you know', 'like'];
    const lowerDraft = draft.toLowerCase();
    fillerWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = lowerDraft.match(regex);
        if (matches && matches.length > 2) {
            feedback.push(`Consider reducing the use of "${word}". It appears ${matches.length} times. Try to be more direct.`);
            valid = false;
        }
    });

    const exclamationMarks = (draft.match(/!/g) || []).length;
    if (exclamationMarks > 2) {
        feedback.push(`Be mindful of excessive exclamation marks. You used ${exclamationMarks} of them. Use sparingly for emphasis.`);
        valid = false;
    }

    const sentences = draft.split(/[.!?]+\s*/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
        const totalWords = draft.split(/\s+/).filter(w => w.length > 0).length;
        const averageWordsPerSentence = totalWords / sentences.length;

        const minAvgSentenceLength = 8;
        const maxAvgSentenceLength = 30;

        if (averageWordsPerSentence < minAvgSentenceLength) {
            feedback.push(`Average sentence length is quite short (${averageWordsPerSentence.toFixed(1)} words). Consider varying sentence structure or combining some for better flow.`);
            valid = false;
        }
        if (averageWordsPerSentence > maxAvgSentenceLength) {
            feedback.push(`Average sentence length is quite long (${averageWordsPerSentence.toFixed(1)} words). Consider breaking down some complex sentences for clarity.`);
            valid = false;
        }
    } else if (draft.trim().length > 0) {
        feedback.push("Could not detect clear sentences. Ensure proper punctuation (periods, question marks, exclamation marks) to define sentences.");
        valid = false;
    }

    const paragraphs = draft.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    if (paragraphs.length === 0 && draft.trim().length > 0) {
        feedback.push("The draft appears to be a single block of text. Consider breaking it into paragraphs for readability.");
        valid = false;
    } else {
        // Short paragraphs are a deliberate pacing tool in fiction — not flagged.
        // Only flag excessively long paragraphs (walls of text).
        const maxParagraphLengthWords = 200;
        paragraphs.forEach((paragraph, index) => {
            const paragraphWords = paragraph.split(/\s+/).filter(w => w.length > 0).length;
            if (paragraphWords > maxParagraphLengthWords) {
                feedback.push(`Paragraph ${index + 1} is quite long (${paragraphWords} words). Consider breaking it into smaller paragraphs for better readability.`);
                valid = false;
            }
        });
    }

    const words = draft.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    for (let i = 0; i < words.length - 1; i++) {
        if (words[i] === words[i+1]) {
            feedback.push(`Avoid immediate word repetition like "${words[i]} ${words[i+1]}". Try to rephrase.`);
            valid = false;
            break;
        }
    }

    sentences.forEach((sentence, index) => {
        const trimmedSentence = sentence.trim();
        if (trimmedSentence.length > 0) {
            const firstChar = trimmedSentence[0];
            // Skip dialogue fragments: if this "sentence" appears right after
            // a quote character in the original draft, it's likely a dialogue
            // continuation (e.g. `"What?" it's looping back`).
            const posInDraft = draft.indexOf(trimmedSentence);
            const precedingText = posInDraft > 0 ? draft.substring(Math.max(0, posInDraft - 5), posInDraft) : "";
            const isAfterQuote = /["'"'\u201C\u201D\u2018\u2019]/.test(precedingText);
            const isSpecialStart =
                /^["'"'\u201C\u201D\u2018\u2019]/.test(trimmedSentence) || // starts with quote
                /^\.\.\./.test(trimmedSentence) || // starts with ellipsis
                /^—/.test(trimmedSentence); // starts with em-dash
            if (!isAfterQuote && !isSpecialStart && firstChar.match(/[a-z]/i) && firstChar !== firstChar.toUpperCase()) {
                feedback.push(`Sentence ${index + 1} might not start with a capital letter: "${trimmedSentence.substring(0, Math.min(trimmedSentence.length, 20))}..."`);
                valid = false;
            }
        }
    });

    return { valid, feedback };
}