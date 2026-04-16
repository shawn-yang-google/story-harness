const defaultTensionKeywords = [
  "suddenly", "danger", "threat", "fear", "struggle", "conflict", "panic", "anxiety",
  "desperate", "urgent", "crisis", "peril", "trapped", "fought", "chase", "escape",
  "confrontation", "tension", "nervous", "heartbeat", "breathless", "shiver", "tremble",
  "ominous", "dread", "suspense", "unsettling", "alarming", "terrifying", "horrifying",
  "nightmare", "grappled", "clash", "showdown", "standoff", "pressure", "intense",
  "tight", "strained", "unease", "discomfort", "agitation", "distress", "grim",
  "foreboding", "shadowy", "whisper", "crept", "lurked", "watched", "silence",
  "stillness", "waiting", "anticipation", "climax", "escalate", "unravel", "unfold",
  "reveal", "secret", "mystery", "puzzle", "riddle", "enigma", "unknown", "uncertainty",
  "doubt", "suspicion", "betrayal", "deception", "lie", "trick", "trap", "ambush",
  "attack", "wound", "injury", "pain", "scream", "cry", "gasp", "choke", "battle", "war",
  "dispute", "argument", "quarrel", "disagreement", "disruption", "chaos", "turmoil",
  "uproar", "commotion", "disorder", "confusion", "bewilderment", "shock", "surprise",
  "astonishment", "fearful", "scared", "afraid", "terrified", "horrified", "petrified",
  "apprehensive", "worried", "anxious", "restless", "disturbed", "troubled", "upset",
  "distressed", "miserable", "unhappy", "sad", "depressed", "gloomy", "melancholy",
  "somber", "dark", "bleak", "desolate", "empty", "hollow", "void", "nothingness",
  "alone", "isolated", "abandoned", "lost", "helpless", "powerless", "vulnerable",
  "exposed", "defenseless", "fragile", "weak", "frail", "delicate", "brittle",
  "shattered", "broken", "cracked", "torn", "ripped", "shredded", "destroyed", "ruined",
  "devastated", "wrecked", "smashed", "crushed", "pulverized", "obliterated",
  "annihilated", "extinguished", "vanished", "disappeared", "gone", "forgotten",
  "erased", "wiped out", "eliminated", "removed", "taken away", "stolen", "robbed",
  "deprived", "bereft", "bereaved", "widowed", "orphaned", "homeless", "destitute",
  "impoverished", "poor", "needy", "indigent", "beggar", "pauper", "vagabond",
  "wanderer", "drifter", "nomad", "exile", "refugee", "fugitive", "outcast", "pariah",
  "loner", "hermit", "recluse", "solitary", "separated", "detached", "disconnected",
  "alienated", "estranged", "unfamiliar", "strange", "foreign", "mysterious",
  "secretive", "hidden", "concealed", "veiled", "shrouded", "obscure", "vague",
  "ambiguous", "unclear", "indistinct", "blurry", "hazy", "foggy", "misty", "cloudy",
  "darkened", "dim", "faint", "feeble", "languid", "sluggish", "slow", "lethargic",
  "drowsy", "sleepy", "tired", "exhausted", "fatigued", "weary", "worn out", "spent",
  "drained", "depleted",
  // Added keywords to better capture action-oriented tension from examples
  "shook", "lunged", "dodged", "singeing", "chance"
];

async function evaluate(draft, context) {
  const feedback = [];
  let valid = true;

  const keywordsToUse = context.customTensionKeywords && context.customTensionKeywords.length > 0
    ? context.customTensionKeywords
    : defaultTensionKeywords;

  const minTensionKeywords = context.minTensionKeywords !== undefined
    ? context.minTensionKeywords
    : 3; // Default minimum

  const lowerCaseDraft = draft.toLowerCase();
  let tensionKeywordCount = 0;
  const foundKeywords = new Set();

  for (const keyword of keywordsToUse) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi'); // Whole word match, case-insensitive
    let match;
    while ((match = regex.exec(lowerCaseDraft)) !== null) {
      tensionKeywordCount++;
      foundKeywords.add(keyword);
    }
  }

  // Keyword-based tension detection is informational only.
  // Structural tension (conflict, obstacles, stakes) is evaluated by the
  // NarrativeChecker in Tier 2, which understands dramatic structure.
  if (draft.trim().length === 0) {
    feedback.push("The draft is empty. No tension can be evaluated.");
    valid = false;
  } else if (tensionKeywordCount < minTensionKeywords) {
    // Informational — does not fail validation
    feedback.push(`Note: Only ${tensionKeywordCount} tension-related keywords found. Structural tension is evaluated separately by the narrative checker.`);
  }

  if (foundKeywords.size > 0) {
    feedback.push(`Found specific tension keywords: ${Array.from(foundKeywords).join(', ')}.`);
  }

  return { valid, feedback };
}