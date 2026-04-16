async function evaluate(draft, context) {
    const feedback = [];
    let valid = true;

    if (!draft || draft.trim().length === 0) {
        feedback.push("Draft cannot be empty.");
        valid = false;
    }

    if (draft.length < 20) {
        feedback.push("Draft is too short. Please elaborate more.");
        valid = false;
    }

    // Note: Logic checking is handled by the Tier 2 LogicCraftHarness hybrid pipeline.
    // This Tier 1 harness only validates basic draft hygiene.

    return { valid, feedback };
}