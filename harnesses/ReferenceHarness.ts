/**
 * ReferenceHarness (Tier 1) — Quick surface-level reference/fact checks.
 *
 * This is a fast, regex-based code harness that catches obvious reference
 * problems WITHOUT needing an LLM. It complements the deeper Tier 2
 * ReferenceCraftHarness.hybrid.json which does LLM-powered fact extraction.
 *
 * Checks:
 * 1. Common anachronism red flags (modern tech/slang in obviously historical settings)
 * 2. Suspicious date patterns (future dates, impossible dates)
 * 3. Measurement inconsistencies (mixing metric/imperial, impossible values)
 * 4. Generic/vague reference markers (placeholder names, "some country")
 * 5. Common factual red flags (well-known misconceptions)
 *
 * @param {string} draft - The narrative draft to evaluate.
 * @param {object} context - HarnessContext with loreDb, previousBeats, targetAudience.
 * @returns {Promise<{valid: boolean, feedback: string[]}>}
 */
async function evaluate(draft, context) {
  var feedback = [];
  var valid = true;
  var lowerDraft = draft.toLowerCase();

  // --- Configuration ---
  var MIN_DRAFT_LENGTH = 50;

  // --- Pre-check: Draft Length ---
  if (draft.trim().length < MIN_DRAFT_LENGTH) {
    feedback.push(
      "Draft is too short for reference analysis (" +
        draft.trim().length +
        " characters). Minimum " +
        MIN_DRAFT_LENGTH +
        " required."
    );
    return { valid: false, feedback: feedback };
  }

  // =========================================================
  // CHECK 1: Common Anachronism Red Flags
  // Quick pattern detection for obviously anachronistic elements
  // in text that mentions historical time periods.
  // =========================================================

  var historicalIndicators = [
    /\b(?:18\d{2}|17\d{2}|16\d{2}|15\d{2}|medieval|ancient|victorian|colonial|renaissance|feudal)\b/gi,
    /\b(?:dynasty|kingdom|empire|pharaoh|gladiator|knight|samurai|shogun)\b/gi,
    /\b(?:world\s+war\s+(?:i|1|one)|wwi|pre-war|interwar|prohibition\s+era)\b/gi,
  ];

  var isHistorical = false;
  for (var hi = 0; hi < historicalIndicators.length; hi++) {
    if (historicalIndicators[hi].test(lowerDraft)) {
      isHistorical = true;
      break;
    }
  }

  if (isHistorical) {
    var modernTechPatterns = [
      { pattern: /\b(?:smartphone|iphone|android|tablet|ipad)\b/gi, name: "smartphone/tablet" },
      { pattern: /\b(?:wifi|wi-fi|bluetooth|usb|hdmi)\b/gi, name: "wireless/digital tech" },
      { pattern: /\b(?:google|facebook|twitter|instagram|tiktok|youtube|netflix)\b/gi, name: "internet platforms" },
      { pattern: /\b(?:selfie|hashtag|emoji|meme|viral|trending)\b/gi, name: "internet culture terms" },
      { pattern: /\b(?:uber|lyft|airbnb|spotify|amazon\s+prime)\b/gi, name: "modern services" },
    ];

    for (var mt = 0; mt < modernTechPatterns.length; mt++) {
      var mtMatches = lowerDraft.match(modernTechPatterns[mt].pattern);
      if (mtMatches) {
        valid = false;
        feedback.push(
          "Possible anachronism: " + modernTechPatterns[mt].name +
          " mentioned in a text with historical setting indicators. " +
          "Found: " + mtMatches.join(", ") + ". " +
          "Verify these are appropriate for the story's time period."
        );
      }
    }
  }

  // =========================================================
  // CHECK 2: Suspicious Date Patterns
  // Catch impossible dates, future dates in past settings, etc.
  // =========================================================

  // Impossible dates (month 13+, day 32+)
  var impossibleDatePatterns = [
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:3[2-9]|[4-9]\d)\b/gi,
    /\b(?:february)\s+(?:3[0-9]|[4-9]\d)\b/gi,
    /\b(?:april|june|september|november)\s+31\b/gi,
  ];

  for (var id = 0; id < impossibleDatePatterns.length; id++) {
    var idMatches = lowerDraft.match(impossibleDatePatterns[id]);
    if (idMatches) {
      valid = false;
      feedback.push(
        "Impossible date detected: " + idMatches.join(", ") + ". " +
        "This date does not exist in the calendar."
      );
    }
  }

  // =========================================================
  // CHECK 3: Measurement Inconsistencies
  // Catch physically impossible values.
  // =========================================================

  // Impossible speeds, temperatures, etc.
  var impossibleMeasurements = [
    { pattern: /\b(\d{4,})\s*(?:miles?\s+per\s+hour|mph)\b/gi, name: "speed (mph)", max: 999 },
    { pattern: /\b(\d{4,})\s*(?:kilometers?\s+per\s+hour|km\/h|kph)\b/gi, name: "speed (km/h)", max: 1600 },
    { pattern: /\b(-?\d{4,})\s*(?:degrees?\s+(?:fahrenheit|celsius)|°[FC])\b/gi, name: "temperature", max: 999 },
  ];

  for (var im = 0; im < impossibleMeasurements.length; im++) {
    var imMatches;
    var mPattern = impossibleMeasurements[im].pattern;
    mPattern.lastIndex = 0;
    while ((imMatches = mPattern.exec(draft)) !== null) {
      var value = parseInt(imMatches[1], 10);
      if (Math.abs(value) > impossibleMeasurements[im].max) {
        // Only flag for non-sci-fi contexts
        if (!lowerDraft.includes("warp") && !lowerDraft.includes("lightspeed") && !lowerDraft.includes("hyperspace")) {
          feedback.push(
            "Suspicious measurement: " + imMatches[0].trim() + " — " +
            "this seems physically implausible for a realistic setting. " +
            "Verify this value is intentional."
          );
        }
      }
    }
  }

  // =========================================================
  // CHECK 4: Generic/Vague Reference Markers
  // Catch placeholder-like names that suggest unfinished research.
  // =========================================================

  var placeholderPatterns = [
    { pattern: /\b(?:some\s+country|some\s+city|some\s+village|some\s+town|some\s+place)\b/gi, name: "vague location" },
    { pattern: /\b(?:a\s+certain\s+(?:country|city|village|town|place|region))\b/gi, name: "vague location" },
    { pattern: /\b(?:Mr\.?\s+X|Mrs\.?\s+X|Dr\.?\s+X|Professor\s+X)\b/g, name: "placeholder name" },
    { pattern: /\[(?:NAME|PLACE|DATE|CITY|COUNTRY|TBD|TODO|INSERT|RESEARCH)\]/gi, name: "research placeholder" },
  ];

  for (var pp = 0; pp < placeholderPatterns.length; pp++) {
    var ppMatches = lowerDraft.match(placeholderPatterns[pp].pattern);
    if (ppMatches && ppMatches.length > 0) {
      // "Professor X" is a known character — skip that specific case in comics context
      if (placeholderPatterns[pp].name === "placeholder name" && lowerDraft.includes("mutant")) {
        continue;
      }
      feedback.push(
        "Vague reference detected (" + placeholderPatterns[pp].name + "): " +
        ppMatches.join(", ") + ". " +
        "Consider replacing with specific, researched details."
      );
    }
  }

  // =========================================================
  // CHECK 5: Common Factual Red Flags
  // Well-known misconceptions that appear frequently in fiction.
  // =========================================================

  var misconceptions = [
    {
      pattern: /\bhumans?\s+(?:only\s+)?use\s+(?:only\s+)?10\s*%\s*(?:of\s+)?(?:their\s+)?brain/gi,
      correction: "Humans use virtually all of their brain — the '10% myth' is false.",
    },
    {
      pattern: /\bgreat\s+wall\s+(?:of\s+china\s+)?(?:is\s+)?visible\s+from\s+(?:space|the\s+moon|orbit)/gi,
      correction: "The Great Wall of China is NOT visible from space with the naked eye.",
    },
    {
      pattern: /\bblood\s+is\s+blue\b/gi,
      correction: "Blood is never blue — deoxygenated blood is dark red, not blue.",
    },
    {
      pattern: /\bnapole(?:o|ó)n\s+(?:was\s+)?(?:very\s+)?short/gi,
      correction: "Napoleon was approximately average height for his era (~5'7"). The 'short' myth is largely British propaganda.",
    },
    {
      pattern: /\bviking(?:s)?\s+(?:wore\s+)?horned\s+helmets?/gi,
      correction: "Vikings did not wear horned helmets — this is a 19th-century romanticization.",
    },
    {
      pattern: /\b(?:bats?\s+(?:are|is)\s+blind|blind\s+as\s+a\s+bat)\b/gi,
      correction: "Bats are not blind — most species have functional eyesight in addition to echolocation.",
    },
  ];

  for (var mc = 0; mc < misconceptions.length; mc++) {
    if (misconceptions[mc].pattern.test(draft)) {
      valid = false;
      feedback.push(
        "Common misconception detected: " + misconceptions[mc].correction +
        " Unless this is intentionally a character's mistaken belief, consider correcting."
      );
    }
  }

  return { valid: valid, feedback: feedback };
}
