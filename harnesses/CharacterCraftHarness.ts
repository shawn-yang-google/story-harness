/**
 * CharacterCraftHarness — Checks character craft quality using [MASTER_THEORIST]'s character principles.
 *
 * Applies [MASTER_THEORIST]'s character creation principles to detect:
 * 1. Cement-block characters (no gap between mask and true character)
 * 2. Choices without pressure (no genuine dilemma or stakes)
 * 3. Flat characters (no dimensional contradiction)
 * 4. Sentimentality (unearned, disproportionate emotion)
 * 5. On-the-nose dialogue (no subtext)
 * 6. Missing character desire (no conscious want/drive)
 *
 * Based on [MASTER_THEORIST]'s Character concepts: characterization-vs-true-character,
 * principle-of-the-mask, choice-under-pressure, unity-of-opposites,
 * defining-dimension, six-types-of-dimensions, sentiment-vs-sentimentality,
 * life-in-the-subtext, motivation-vs-desire, conscious-vs-subconscious-desire.
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
  var MIN_DRAFT_LENGTH = 30;

  // --- Pre-check: Draft Length ---
  if (draft.trim().length < MIN_DRAFT_LENGTH) {
    feedback.push(
      "Draft is too short for meaningful character craft analysis (" +
        draft.trim().length +
        " characters). Minimum " +
        MIN_DRAFT_LENGTH +
        " required."
    );
    return { valid: false, feedback: feedback };
  }

  // =========================================================
  // CHECK 1: Mask vs True Character
  // Detect cement-block characters — same inside as outside,
  // no gap between appearance and reality.
  // Look for: characters described through adjective lists
  // with no pressure revealing inner nature.
  // =========================================================

  // Positive signals: mask being stripped or true self revealed
  var maskRevealPatterns = [
    /(?:revealed|unmasked|true\s+self|true\s+character|really\s+was|who\s+(?:he|she|they)\s+truly)/gi,
    /(?:beneath\s+the\s+surface|under(?:neath)?\s+(?:the|that|his|her|their)\s+(?:mask|exterior|facade|armor))/gi,
    /(?:mask\s+(?:shattered|cracked|fell|dropped|crumbled|slipped|broke))/gi,
    /(?:pretended|hidden\s+(?:behind|beneath|under)|concealed|disguised)/gi,
    /(?:but\s+(?:inside|within|underneath|beneath|deep\s+down|secretly|privately))/gi,
    /(?:stripped\s+(?:away|bare)|laid\s+bare|exposed\s+(?:the|his|her|their))/gi,
    /(?:appeared\s+(?:to\s+be|calm|strong|brave)\s+but\s+(?:was|felt|inside))/gi,
  ];

  var maskRevealCount = 0;
  for (var mr = 0; mr < maskRevealPatterns.length; mr++) {
    var mrMatches = lowerDraft.match(maskRevealPatterns[mr]);
    if (mrMatches) {
      maskRevealCount += mrMatches.length;
    }
  }

  // Adjective-list characterization (surface traits only)
  var adjectiveListPatterns = [
    /(?:(?:he|she|they)\s+was\s+(?:brave|strong|kind|loyal|honorable|noble|wise|clever|gentle|generous|determined|fierce|bold))/gi,
    /(?:(?:he|she|they)\s+was\s+(?:the\s+)?perfect\s+(?:hero|heroine|warrior|knight|leader))/gi,
    /(?:everyone\s+(?:admired|loved|respected|feared)\s+(?:him|her|them))/gi,
    /(?:(?:he|she|they)\s+always\s+(?:did\s+the\s+right\s+thing|knew\s+what\s+to\s+do|succeeded|won))/gi,
    /(?:(?:he|she|they)\s+never\s+(?:hesitated|faltered|wavered|doubted|failed|gave\s+up))/gi,
    /(?:in\s+every\s+way|inside\s+and\s+out|through\s+and\s+through|perfectly\s+virtuous)/gi,
  ];

  var adjectiveListCount = 0;
  for (var al = 0; al < adjectiveListPatterns.length; al++) {
    var alMatches = lowerDraft.match(adjectiveListPatterns[al]);
    if (alMatches) {
      adjectiveListCount += alMatches.length;
    }
  }

  // Pressure/crisis signals (needed for true character to emerge)
  var pressurePatterns = [
    /(?:under\s+pressure|pushed\s+to\s+(?:the|his|her|their)\s+(?:limit|breaking\s+point|edge))/gi,
    /(?:forced\s+to\s+(?:choose|decide|act|reveal|confront|face))/gi,
    /(?:crisis|desperate|cornered|trapped|impossible\s+choice|breaking\s+point)/gi,
    /(?:when\s+(?:the|everything)\s+(?:blade|sword|fire|threat|danger|pressure|moment))/gi,
    /(?:screamed|broke\s+down|collapsed|shattered|crumbled|snapped)/gi,
  ];

  var pressureCount = 0;
  for (var pc = 0; pc < pressurePatterns.length; pc++) {
    var pcMatches = lowerDraft.match(pressurePatterns[pc]);
    if (pcMatches) {
      pressureCount += pcMatches.length;
    }
  }

  if (adjectiveListCount >= 3 && maskRevealCount === 0 && pressureCount === 0) {
    valid = false;
    feedback.push(
      "Cement-block character detected: the character is described through surface traits (" +
        adjectiveListCount +
        " adjective-list markers) with no gap between mask and true character. " +
        "True character is revealed only under pressure, through choices made in dilemmas " +
        "([MASTER_THEORIST]: characterization-vs-true-character, principle-of-the-mask). " +
        "Characterization is the mask; true character is what lies beneath."
    );
  }

  // =========================================================
  // CHECK 2: Choice Under Pressure
  // Detect whether characters face genuine dilemmas with
  // two equally weighted options and real stakes.
  // =========================================================

  // Dilemma/choice language
  var dilemmaPatterns = [
    /(?:chose\s+between|had\s+to\s+choose|torn\s+between|either[\s.]+or)/gi,
    /(?:dilemma|impossible\s+choice|no\s+(?:good|easy|right)\s+(?:option|choice|answer))/gi,
    /(?:sacrifice|sacrificed|gave\s+up|surrendered|abandoned|relinquished)/gi,
    /(?:cost\s+(?:him|her|them|everything)|price\s+(?:of|to\s+pay|was))/gi,
    /(?:risked\s+(?:his|her|their|everything)|gambl(?:ed|e)|wager(?:ed)?|on\s+the\s+line)/gi,
    /(?:could\s+not\s+do\s+both|one\s+or\s+the\s+other|only\s+one\s+(?:choice|option|path))/gi,
  ];

  var dilemmaCount = 0;
  for (var dm = 0; dm < dilemmaPatterns.length; dm++) {
    var dmMatches = lowerDraft.match(dilemmaPatterns[dm]);
    if (dmMatches) {
      dilemmaCount += dmMatches.length;
    }
  }

  // Pressure/stakes indicators
  var stakesPatterns = [
    /(?:life\s+or\s+death|live\s+or\s+die|survived?\s+or\s+(?:die|perish))/gi,
    /(?:everything\s+(?:depended|hinged|rested)\s+(?:on|upon))/gi,
    /(?:if\s+(?:he|she|they)\s+failed|failure\s+(?:meant|would\s+mean))/gi,
    /(?:the\s+(?:fate|future|lives?)\s+(?:of|depended|hung))/gi,
    /(?:everything\s+to\s+(?:lose|gain))/gi,
    /(?:last\s+(?:chance|hope|resort|opportunity))/gi,
  ];

  var stakesCount = 0;
  for (var sk = 0; sk < stakesPatterns.length; sk++) {
    var skMatches = lowerDraft.match(stakesPatterns[sk]);
    if (skMatches) {
      stakesCount += skMatches.length;
    }
  }

  // No-stakes indicators — actions without consequence
  var noStakesPatterns = [
    /(?:nothing\s+(?:was\s+)?(?:at\s+risk|at\s+stake|to\s+lose|to\s+gain|to\s+fear))/gi,
    /(?:without\s+(?:any\s+)?(?:pressure|risk|cost|consequence|stakes|danger|urgency))/gi,
    /(?:it\s+(?:did\s+not|didn't)\s+(?:matter|make\s+(?:a\s+)?difference))/gi,
    /(?:pleasant|comfortable|easygoing|leisurely|carefree|relaxed)/gi,
    /(?:nothing\s+to\s+(?:lose|gain|fear|risk))/gi,
  ];

  var noStakesCount = 0;
  for (var ns = 0; ns < noStakesPatterns.length; ns++) {
    var nsMatches = lowerDraft.match(noStakesPatterns[ns]);
    if (nsMatches) {
      noStakesCount += nsMatches.length;
    }
  }

  // Count sentences to assess passage length
  var sentences = draft.split(/[.!?]+/).filter(function(s) {
    return s.trim().length > 0;
  });

  if (dilemmaCount === 0 && stakesCount === 0 && noStakesCount >= 2 && sentences.length >= 3) {
    valid = false;
    feedback.push(
      "No choice under pressure detected: characters act without genuine dilemma, " +
        "stakes, or pressure (" +
        noStakesCount +
        " no-stakes markers, 0 dilemma markers). " +
        "True character is revealed only through choices made under pressure—when both " +
        "options carry real consequences ([MASTER_THEORIST]: choice-under-pressure). " +
        "Choices without cost reveal nothing about character."
    );
  }

  // =========================================================
  // CHECK 3: Dimensional Contradiction
  // Detect whether characters display contradictions
  // (brave but fearful, kind but cruel).
  // Flag purely good or purely evil characters.
  // =========================================================

  // Contradiction connectors between opposing traits
  var contradictionPatterns = [
    /(?:brave|courageous|fearless|bold)\s+(?:but|yet|although|despite|however)\s+(?:afraid|fearful|terrified|scared|anxious)/gi,
    /(?:kind|gentle|compassionate|generous)\s+(?:but|yet|although|despite|however)\s+(?:cruel|harsh|cold|ruthless|merciless)/gi,
    /(?:loyal|faithful|devoted)\s+(?:but|yet|although|despite|however)\s+(?:deceitful|treacherous|dishonest|unfaithful)/gi,
    /(?:but|yet|despite|although)\s+(?:inside|within|secretly|deep\s+down|privately|at\s+heart)/gi,
    /(?:a\s+man|a\s+woman|a\s+person|a\s+creature)\s+of\s+contradictions/gi,
  ];

  var contradictionCount = 0;
  for (var cc = 0; cc < contradictionPatterns.length; cc++) {
    var ccMatches = lowerDraft.match(contradictionPatterns[cc]);
    if (ccMatches) {
      contradictionCount += ccMatches.length;
    }
  }

  // General opposition connectors joining character traits
  var oppositionTraitPatterns = [
    /(?:(?:he|she|they)\s+(?:was|were|seemed|appeared)\s+\w+\s+(?:but|yet|although|despite|however|and\s+yet)\s+(?:also\s+)?(?:was|were|seemed|could\s+be)\s+\w+)/gi,
    /(?:generous\s+(?:with|to)\s+\w+,?\s+(?:yet|but)\s+(?:cruel|cold|harsh|stingy)\s+(?:to|with))/gi,
    /(?:(?:despite|although|though)\s+(?:his|her|their)\s+(?:\w+\s+){0,2}(?:discipline|strength|courage|kindness|intelligence))/gi,
  ];

  var oppositionTraitCount = 0;
  for (var ot = 0; ot < oppositionTraitPatterns.length; ot++) {
    var otMatches = lowerDraft.match(oppositionTraitPatterns[ot]);
    if (otMatches) {
      oppositionTraitCount += otMatches.length;
    }
  }

  // Purely-one-sided character indicators
  var purelyOneSidedPatterns = [
    /(?:purely\s+(?:good|evil|virtuous|wicked|noble|corrupt))/gi,
    /(?:(?:absolute(?:ly)?|completely|entirely|utterly|perfectly|totally)\s+(?:good|evil|virtuous|wicked|noble|corrupt|kind|cruel|honest|pure))/gi,
    /(?:no\s+(?:darkness|flaw|weakness|contradiction|nuance|complexity|doubt)\s+in\s+(?:him|her|them))/gi,
    /(?:(?:was|were)\s+(?:evil|wicked|cruel|vile)\s+(?:because|simply|just)\s+(?:because|he|she|they|born))/gi,
    /(?:(?:unwavering|unfailing|unerring|unshakeable|unbreakable)\s+(?:goodness|virtue|evil|cruelty|kindness))/gi,
    /(?:every\s+(?:dimension|aspect|facet|way)\s+of\s+(?:his|her|their)\s+character)/gi,
  ];

  var purelyOneSidedCount = 0;
  for (var po = 0; po < purelyOneSidedPatterns.length; po++) {
    var poMatches = lowerDraft.match(purelyOneSidedPatterns[po]);
    if (poMatches) {
      purelyOneSidedCount += poMatches.length;
    }
  }

  var totalContradiction = contradictionCount + oppositionTraitCount;

  if (purelyOneSidedCount >= 2 && totalContradiction === 0) {
    valid = false;
    feedback.push(
      "Flat character detected: the character is described as purely good or purely evil " +
        "with no dimensional contradiction (" +
        purelyOneSidedCount +
        " one-sided markers, 0 contradiction markers). " +
        "Compelling characters contain a unity of opposites—contradictory qualities " +
        "that create depth and unpredictability ([MASTER_THEORIST]: unity-of-opposites, defining-dimension). " +
        "A character who is the same in every dimension is flat and uninteresting."
    );
  }

  // =========================================================
  // CHECK 4: Earned vs Sentimentality
  // Detect unearned emotion — excessive emotional reaction
  // to minor events. Emotion must be proportionate to stakes.
  // =========================================================

  // High-intensity emotion markers
  var intenseEmotionPatterns = [
    /(?:tears\s+stream(?:ed|ing))/gi,
    /(?:sobb(?:ed|ing)\s+(?:uncontrollably|violently|wildly|helplessly|hysterically))/gi,
    /(?:heart\s+(?:broke|shattered|crumbled|tore|split|ached)\s+(?:into|in|with))/gi,
    /(?:devastated\s+(?:beyond|completely|utterly|totally))/gi,
    /(?:(?:deepest|most\s+profound|overwhelming|unbearable)\s+(?:grief|sorrow|pain|agony|despair))/gi,
    /(?:wept\s+(?:and\s+wept|bitterly|openly|freely|endlessly|inconsolably))/gi,
    /(?:body\s+(?:shaking|trembling|convulsing)\s+with\s+(?:grief|sobs|emotion|sorrow|pain))/gi,
  ];

  var intenseEmotionCount = 0;
  for (var ie = 0; ie < intenseEmotionPatterns.length; ie++) {
    var ieMatches = lowerDraft.match(intenseEmotionPatterns[ie]);
    if (ieMatches) {
      intenseEmotionCount += ieMatches.length;
    }
  }

  // Trivial-trigger indicators — minor events
  var trivialTriggerPatterns = [
    /(?:(?:slightly|a\s+little|somewhat|mildly|faintly)\s+(?:wilted|broken|bent|torn|faded|scratched|chipped|dented))/gi,
    /(?:(?:a\s+)?(?:single|fallen|dropped|lost|missing)\s+(?:petal|leaf|button|coin|crumb|feather))/gi,
    /(?:meant\s+nothing\s+special|nothing\s+(?:important|significant|special|meaningful))/gi,
    /(?:minor\s+(?:occurrence|event|inconvenience|setback|disappointment))/gi,
    /(?:just\s+(?:bought|found|seen|noticed)\s+(?:it\s+)?(?:yesterday|today|recently|moments?\s+ago))/gi,
  ];

  var trivialTriggerCount = 0;
  for (var tt = 0; tt < trivialTriggerPatterns.length; tt++) {
    var ttMatches = lowerDraft.match(trivialTriggerPatterns[tt]);
    if (ttMatches) {
      trivialTriggerCount += ttMatches.length;
    }
  }

  // Real-stakes emotion triggers (earned emotion)
  var earnedEmotionTriggers = [
    /(?:death|dying|killed|murdered|lost\s+(?:forever|everything|everyone))/gi,
    /(?:betrayal|betrayed\s+by|abandoned\s+by|left\s+to\s+die)/gi,
    /(?:war|battle|massacre|catastrophe|destruction|ruin)/gi,
    /(?:child(?:ren)?\s+(?:died|killed|lost|taken|stolen|drowned))/gi,
    /(?:years?\s+of\s+(?:abuse|suffering|torment|grief|loss))/gi,
  ];

  var earnedTriggerCount = 0;
  for (var et = 0; et < earnedEmotionTriggers.length; et++) {
    var etMatches = lowerDraft.match(earnedEmotionTriggers[et]);
    if (etMatches) {
      earnedTriggerCount += etMatches.length;
    }
  }

  if (intenseEmotionCount >= 2 && trivialTriggerCount >= 1 && earnedTriggerCount === 0) {
    valid = false;
    feedback.push(
      "Sentimentality detected: excessive emotional reaction (" +
        intenseEmotionCount +
        " intense emotion markers) triggered by trivial events (" +
        trivialTriggerCount +
        " trivial triggers) with no proportionate stakes. " +
        "Unearned emotion is sentimentality, not genuine feeling. Emotion must be " +
        "EARNED through the weight of events and stakes established in the narrative " +
        "([MASTER_THEORIST]: sentiment-vs-sentimentality). " +
        "Disproportionate emotion to minor events undermines credibility."
    );
  }

  // =========================================================
  // CHECK 5: Subtext Presence
  // Detect whether dialogue has implied meaning or is
  // entirely on-the-nose (characters stating feelings directly).
  // =========================================================

  // On-the-nose dialogue patterns — direct emotional statements
  var onTheNosePatterns = [
    /['"]i\s+(?:am|feel)\s+(?:angry|sad|happy|hurt|betrayed|frustrated|confused|jealous|guilty|scared|afraid|lonely|depressed)/gi,
    /['"]i\s+(?:love|hate|despise|resent|adore|loathe)\s+(?:you|him|her|them|this)/gi,
    /['"]i\s+(?:am\s+)?(?:so\s+)?(?:disappointed|devastated|heartbroken|furious|overjoyed|thrilled|terrified)/gi,
    /['"](?:that\s+makes\s+me\s+(?:feel|so)\s+(?:angry|sad|happy|hurt|betrayed|frustrated))/gi,
    /['"]i\s+feel\s+(?:like|as\s+if|that)\s+(?:you|he|she|they|nobody|everyone)/gi,
  ];

  var onTheNoseCount = 0;
  for (var otn = 0; otn < onTheNosePatterns.length; otn++) {
    var otnMatches = lowerDraft.match(onTheNosePatterns[otn]);
    if (otnMatches) {
      onTheNoseCount += otnMatches.length;
    }
  }

  // Subtext indicators — implying meaning through action/deflection
  var subtextPatterns = [
    /(?:looked\s+away|turned\s+(?:away|his|her|their)\s+(?:face|head|back|gaze))/gi,
    /(?:silence\s+(?:between|said|spoke|hung|stretched|filled|fell))/gi,
    /(?:changed\s+the\s+subject|avoided\s+(?:the|his|her|their)\s+(?:eyes?|gaze|question|topic))/gi,
    /(?:voice\s+(?:quiet|low|barely|soft|tight|strained|flat|hollow|cracked))/gi,
    /(?:gripped|clenched|tightened|squeezed)\s+(?:the|his|her|their|a)/gi,
    /(?:said\s+nothing|did\s+not\s+(?:answer|reply|respond|speak|say))/gi,
    /(?:instead\s+(?:he|she|they)\s+(?:poured|picked|turned|walked|set|folded|straightened))/gi,
    /(?:(?:what|everything)\s+(?:he|she|they|the|their)\s+(?:words|silence)\s+(?:chose\s+not|did\s+not|left\s+unsaid))/gi,
  ];

  var subtextCount = 0;
  for (var st = 0; st < subtextPatterns.length; st++) {
    var stMatches = lowerDraft.match(subtextPatterns[st]);
    if (stMatches) {
      subtextCount += stMatches.length;
    }
  }

  // Check if dialogue is present at all
  var dialogueQuotes = lowerDraft.match(/['"][^'"]{5,}['"]/g);
  var hasDialogue = dialogueQuotes && dialogueQuotes.length >= 2;

  if (hasDialogue && onTheNoseCount >= 3 && subtextCount === 0) {
    valid = false;
    feedback.push(
      "On-the-nose dialogue detected: characters directly state their emotions " +
        "and feelings (" +
        onTheNoseCount +
        " on-the-nose markers) with no subtext, deflection, or implied meaning. " +
        "In life, people rarely say exactly what they think or feel. Dialogue must " +
        "have a gap between what is said and what is meant " +
        "([MASTER_THEORIST]: life-in-the-subtext). " +
        "Subtext is the true dialogue—what lies beneath the spoken words."
    );
  }

  // =========================================================
  // CHECK 6: Conscious Desire
  // Detect whether characters have a clear want/drive.
  // Check loreDb for character desire info.
  // Look for contradiction between stated desire and actions.
  // =========================================================

  // Desire/want indicators
  var desireIndicators = [
    /(?:wanted|needed|desired|sought|yearned|longed|hoped|wished|dreamed|craved|demanded)/gi,
    /(?:had\s+to|must|determined\s+to|resolved\s+to|set\s+out\s+to|vowed\s+to)/gi,
    /(?:her|his|their)\s+(?:goal|mission|quest|purpose|objective|ambition|aim|desire|want|need)/gi,
    /(?:find|save|rescue|stop|destroy|protect|escape|reach|retrieve|reclaim|avenge|discover)/gi,
    /(?:fought\s+for|struggled\s+to|desperate\s+to|refused\s+to\s+(?:let|give|stop|accept))/gi,
    /(?:drove\s+(?:him|her|them)|driven\s+by|motivated\s+by|fueled\s+by|consumed\s+by)/gi,
  ];

  var desireCount = 0;
  for (var di = 0; di < desireIndicators.length; di++) {
    var desMatches = lowerDraft.match(desireIndicators[di]);
    if (desMatches) {
      desireCount += desMatches.length;
    }
  }

  // Aimlessness indicators
  var aimlessIndicators = [
    /(?:without\s+(?:thinking|purpose|direction|reason|knowing\s+why))/gi,
    /(?:nothing\s+(?:in\s+)?particular\s+(?:drew|called|motivated|attracted))/gi,
    /(?:wandered|drifted|meandered|strolled)\s+(?:aimlessly|without\s+direction)/gi,
    /(?:(?:no|without)\s+(?:purpose|direction|goal|ambition|motivation|desire|drive))/gi,
  ];

  var aimlessCount = 0;
  for (var ai = 0; ai < aimlessIndicators.length; ai++) {
    var aimMatches = lowerDraft.match(aimlessIndicators[ai]);
    if (aimMatches) {
      aimlessCount += aimMatches.length;
    }
  }

  // Check loreDb for character desire
  var loreDesireFound = false;
  if (context.loreDb && context.loreDb.characters) {
    for (var lc = 0; lc < context.loreDb.characters.length; lc++) {
      var character = context.loreDb.characters[lc];
      if (character.desire) {
        var charDesire = character.desire.toLowerCase();
        var charWords = charDesire.split(/\s+/);
        for (var cw = 0; cw < charWords.length; cw++) {
          if (charWords[cw].length > 3 && lowerDraft.includes(charWords[cw])) {
            loreDesireFound = true;
            desireCount += 1;
            break;
          }
        }
      }
    }
  }

  // Also check protagonist desire from loreDb
  if (
    context.loreDb &&
    context.loreDb.protagonist &&
    context.loreDb.protagonist.desire
  ) {
    var protDesire = context.loreDb.protagonist.desire.toLowerCase();
    var protWords = protDesire.split(/\s+/);
    for (var pw = 0; pw < protWords.length; pw++) {
      if (protWords[pw].length > 3 && lowerDraft.includes(protWords[pw])) {
        loreDesireFound = true;
        desireCount += 1;
        break;
      }
    }
  }

  // Subconscious desire contradiction (bonus positive signal)
  var subconsciousPatterns = [
    /(?:claimed\s+(?:to\s+)?(?:want|not\s+(?:to\s+)?care|not\s+(?:to\s+)?need))/gi,
    /(?:said\s+(?:he|she|they)\s+(?:didn't|did\s+not)\s+(?:want|need|care))/gi,
    /(?:(?:actions?|behavior|deeds?)\s+(?:contradicted|betrayed|belied)\s+(?:his|her|their)\s+(?:words|claims))/gi,
    /(?:(?:despite|although)\s+(?:claiming|saying|insisting))/gi,
  ];

  var subconsciousCount = 0;
  for (var sc = 0; sc < subconsciousPatterns.length; sc++) {
    var scMatches = lowerDraft.match(subconsciousPatterns[sc]);
    if (scMatches) {
      subconsciousCount += scMatches.length;
    }
  }

  if (subconsciousCount > 0) {
    desireCount += subconsciousCount;
  }

  if (desireCount === 0 && aimlessCount > 0 && sentences.length >= 3) {
    valid = false;
    feedback.push(
      "No character desire detected: the passage shows characters acting without clear " +
        "want, goal, or motivation (" +
        aimlessCount +
        " aimlessness markers, 0 desire markers). " +
        "Every character MUST have a conscious desire—a specific want that drives action " +
        "([MASTER_THEORIST]: motivation-vs-desire, conscious-vs-subconscious-desire). " +
        "A character without desire is not truly a character."
    );
  }

  // --- Summary feedback ---
  if (valid && feedback.length === 0) {
    feedback.push(
      "Character craft check passed. Characters show depth through mask/true-character gaps, " +
        "choices under pressure, dimensional contradictions, earned emotion, subtext in dialogue, " +
        "and clear conscious desire."
    );
  }

  return { valid: valid, feedback: feedback };
}
