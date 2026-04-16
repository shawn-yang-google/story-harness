/**
 * DialogueCraftHarness — Checks dialogue craft quality using [MASTER_THEORIST]'s dialogue principles.
 *
 * Applies [MASTER_THEORIST]'s dialogue principles to detect:
 * 1. Purposeless chitchat (filler dialogue with no dramatic action)
 * 2. Dialogue cliches (overused, stock phrases)
 * 3. [FORCED_EXPOSITION_TROP] exposition (forced telling of mutual knowledge)
 * 4. On-the-nose emotion (directly stating feelings instead of showing)
 * 5. No conflict in dialogue (characters all agreeing without friction)
 * 6. Unweaponized exposition (info-dumps without dramatic purpose)
 *
 * Based on [MASTER_THEORIST]'s Dialogue concepts: action-vs-activity, dialogue-as-action,
 * economy-and-pause, cliches-and-neutral-language, exposition-in-dialogue,
 * empty-and-emotive-talk, excuses-vs-motivation, balanced-conflict,
 * duelogue-and-trialogue, exposition-as-ammunition, backstory-and-revelations.
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
      "Draft is too short for meaningful dialogue craft analysis (" +
        draft.trim().length +
        " characters). Minimum " +
        MIN_DRAFT_LENGTH +
        " required."
    );
    return { valid: false, feedback: feedback };
  }

  // =========================================================
  // CHECK 1: Purposeless Chitchat
  // Detect dialogue lines that are pure filler with no
  // dramatic action. Greetings without subtext, weather
  // small talk, polite pleasantries that advance nothing.
  // (action-vs-activity, dialogue-as-action, economy-and-pause)
  // =========================================================

  var chitchatPatterns = [
    /(?:['"](?:hello|hi there|hey there|good morning|good afternoon|good evening|good day)[,.\-!?]?\s*['"]?)/gi,
    /(?:['"](?:how are you|how have you been|how do you do|nice to meet you)[,.\-!?]?\s*['"]?)/gi,
    /(?:['"](?:goodbye|bye|see you later|see you soon|take care|farewell|so long)[,.\-!?]?\s*['"]?)/gi,
    /(?:['"](?:nice weather|lovely day|beautiful day|terrible weather|cold today|hot today)[,.\-!?]?\s*['"]?)/gi,
    /(?:['"](?:what a lovely|what a beautiful|what a nice)\s+(?:day|morning|evening|afternoon)[,.\-!?]?\s*['"]?)/gi,
    /(?:['"](?:fine,?\s+thanks|fine,?\s+thank you|doing well|not bad|can't complain|pretty good)[,.\-!?]?\s*['"]?)/gi,
    /(?:['"](?:pleased to meet you|pleasure to meet you|nice meeting you)[,.\-!?]?\s*['"]?)/gi,
  ];

  var chitchatCount = 0;
  for (var ch = 0; ch < chitchatPatterns.length; ch++) {
    var chMatches = lowerDraft.match(chitchatPatterns[ch]);
    if (chMatches) {
      chitchatCount += chMatches.length;
    }
  }

  // Count total dialogue lines (rough heuristic: quoted segments)
  var dialogueLines = lowerDraft.match(/['"][^'"]{3,}['"]/g);
  var totalDialogueLines = dialogueLines ? dialogueLines.length : 0;

  // Dramatic action signals within dialogue (counters to chitchat)
  var dramaticDialoguePatterns = [
    /(?:['"][^'"]*(?:demand|threaten|confess|reveal|accuse|confront|challenge|refuse|beg|plead|warn|swear|vow|insist|betray)[^'"]*['"])/gi,
    /(?:['"][^'"]*(?:you\s+lied|you\s+betrayed|you\s+killed|you\s+stole|you\s+promised|I\s+know\s+what\s+you\s+did)[^'"]*['"])/gi,
  ];

  var dramaticDialogueCount = 0;
  for (var dd = 0; dd < dramaticDialoguePatterns.length; dd++) {
    var ddMatches = lowerDraft.match(dramaticDialoguePatterns[dd]);
    if (ddMatches) {
      dramaticDialogueCount += ddMatches.length;
    }
  }

  if (chitchatCount >= 3 && dramaticDialogueCount === 0) {
    valid = false;
    feedback.push(
      "Purposeless chitchat detected: " +
        chitchatCount +
        " filler dialogue lines (greetings, pleasantries, small talk) " +
        "with no dramatic action. Every line of dialogue must be an ACTION " +
        "that changes the dynamic between characters. Activity is not action " +
        "([MASTER_THEORIST]: action-vs-activity, dialogue-as-action, economy-and-pause). " +
        "Cut all dialogue that does not advance conflict or reveal character."
    );
  }

  // =========================================================
  // CHECK 2: Dialogue Cliches
  // Detect overused, stock dialogue phrases that signal
  // lazy writing and lack of originality.
  // (cliches-and-neutral-language)
  // =========================================================

  var clichePhrases = [
    "we need to talk",
    "it's not what it looks like",
    "i can explain",
    "you don't understand",
    "we're not so different you and i",
    "i've got a bad feeling about this",
    "is that all you've got",
    "you'll pay for this",
    "mark my words",
    "it was a dark and stormy night",
    "last time i checked",
    "at the end of the day",
    "it is what it is",
    "to be honest",
    "in my humble opinion"
  ];

  var clichesFound = [];
  for (var ci = 0; ci < clichePhrases.length; ci++) {
    if (lowerDraft.indexOf(clichePhrases[ci]) !== -1) {
      clichesFound.push(clichePhrases[ci]);
    }
  }

  if (clichesFound.length >= 2) {
    valid = false;
    var clicheList = "";
    for (var cl = 0; cl < clichesFound.length; cl++) {
      if (cl > 0) {
        clicheList += ", ";
      }
      clicheList += "'" + clichesFound[cl] + "'";
    }
    feedback.push(
      "Dialogue cliches detected: " +
        clichesFound.length +
        " overused phrases found: " +
        clicheList +
        ". Cliched dialogue signals the writer is reaching for stock phrases " +
        "instead of finding the character's unique voice. Every character " +
        "must speak in their own idiom " +
        "([MASTER_THEORIST]: cliches-and-neutral-language). " +
        "Replace each cliche with language specific to this character."
    );
  }

  // =========================================================
  // CHECK 3: [FORCED_EXPOSITION_TROP] Exposition
  // Detect forced exposition where characters tell each
  // other things they both already know.
  // (exposition-in-dialogue, empty-and-emotive-talk)
  // =========================================================

  var asYouKnowPatterns = [
    /as you know/gi,
    /as we discussed/gi,
    /as i mentioned/gi,
    /you remember when/gi,
    /let me remind you/gi,
    /as you're aware/gi,
    /as we both know/gi,
    /you already know this but/gi,
  ];

  var asYouKnowCount = 0;
  var asYouKnowPhrases = [];
  for (var ay = 0; ay < asYouKnowPatterns.length; ay++) {
    var ayMatches = lowerDraft.match(asYouKnowPatterns[ay]);
    if (ayMatches) {
      asYouKnowCount += ayMatches.length;
      for (var aym = 0; aym < ayMatches.length; aym++) {
        asYouKnowPhrases.push(ayMatches[aym]);
      }
    }
  }

  // Also detect characters stating their own identity/relationship
  var identityExpoPatterns = [
    /i,?\s+your\s+(?:brother|sister|father|mother|husband|wife|son|daughter|friend|partner)/gi,
    /we've been\s+(?:friends|partners|colleagues|allies|enemies)\s+for\s+\d+/gi,
    /as your\s+(?:brother|sister|father|mother|husband|wife|friend|partner)/gi,
  ];

  for (var ie = 0; ie < identityExpoPatterns.length; ie++) {
    var ieMatches = lowerDraft.match(identityExpoPatterns[ie]);
    if (ieMatches) {
      asYouKnowCount += ieMatches.length;
      for (var iem = 0; iem < ieMatches.length; iem++) {
        asYouKnowPhrases.push(ieMatches[iem]);
      }
    }
  }

  if (asYouKnowCount >= 2) {
    valid = false;
    var phraseList = "";
    for (var pl = 0; pl < asYouKnowPhrases.length; pl++) {
      if (pl > 0) {
        phraseList += ", ";
      }
      phraseList += "'" + asYouKnowPhrases[pl] + "'";
    }
    feedback.push(
      "[FORCED_EXPOSITION_TROP] exposition detected: " +
        asYouKnowCount +
        " instances of characters telling each other information " +
        "they both already know: " +
        phraseList +
        ". Exposition must be WEAPONIZED—delivered under pressure, " +
        "used as ammunition in conflict, or revealed as a surprise " +
        "([MASTER_THEORIST]: exposition-in-dialogue, exposition-as-ammunition). " +
        "Characters should never narrate their shared history to each other."
    );
  }

  // =========================================================
  // CHECK 4: On-the-Nose Emotion
  // Detect characters directly stating their emotions
  // instead of showing through action and subtext.
  // (empty-and-emotive-talk, excuses-vs-motivation)
  // =========================================================

  var onTheNoseEmotionPatterns = [
    /i\s+am\s+(?:so\s+)?(?:angry|furious|enraged|livid|mad)/gi,
    /i\s+feel\s+(?:so\s+)?(?:sad|depressed|miserable|unhappy|devastated)/gi,
    /i(?:'m|\s+am)\s+(?:so\s+)?(?:happy|thrilled|overjoyed|elated|excited|delighted)/gi,
    /i\s+(?:love|hate|despise|resent|adore|loathe)\s+(?:you|him|her|them|this|that)/gi,
    /i(?:'m|\s+am)\s+(?:so\s+)?(?:scared|afraid|terrified|frightened|anxious|worried)/gi,
    /i(?:'m|\s+am)\s+(?:so\s+)?(?:jealous|envious|bitter|resentful)/gi,
    /i(?:'m|\s+am)\s+(?:so\s+)?(?:lonely|alone|isolated|abandoned)/gi,
    /i(?:'m|\s+am)\s+(?:so\s+)?(?:hurt|betrayed|disappointed|heartbroken|devastated)/gi,
  ];

  var onTheNoseCount = 0;
  for (var otn = 0; otn < onTheNoseEmotionPatterns.length; otn++) {
    var otnMatches = lowerDraft.match(onTheNoseEmotionPatterns[otn]);
    if (otnMatches) {
      onTheNoseCount += otnMatches.length;
    }
  }

  // Self-explanation patterns
  var selfExplanationPatterns = [
    /the reason i did that is/gi,
    /i did it because/gi,
    /my motivation is/gi,
    /the reason i feel this way/gi,
    /i act this way because/gi,
    /let me explain why i/gi,
  ];

  var selfExplanationCount = 0;
  for (var se = 0; se < selfExplanationPatterns.length; se++) {
    var seMatches = lowerDraft.match(selfExplanationPatterns[se]);
    if (seMatches) {
      selfExplanationCount += seMatches.length;
    }
  }

  // Subtext signals (actions implying emotions instead of stating them)
  var subtextActionPatterns = [
    /(?:looked\s+away|turned\s+(?:away|his|her|their)\s+(?:face|head|back|gaze))/gi,
    /(?:silence\s+(?:between|said|spoke|hung|stretched|filled|fell))/gi,
    /(?:changed\s+the\s+subject|avoided\s+(?:the|his|her|their)\s+(?:eyes?|gaze|question|topic))/gi,
    /(?:voice\s+(?:quiet|low|barely|soft|tight|strained|flat|hollow|cracked))/gi,
    /(?:gripped|clenched|tightened|squeezed)\s+(?:the|his|her|their|a)/gi,
    /(?:said\s+nothing|did\s+not\s+(?:answer|reply|respond|speak|say))/gi,
    /(?:instead\s+(?:he|she|they)\s+(?:poured|picked|turned|walked|set|folded|straightened))/gi,
  ];

  var subtextActionCount = 0;
  for (var sa = 0; sa < subtextActionPatterns.length; sa++) {
    var saMatches = lowerDraft.match(subtextActionPatterns[sa]);
    if (saMatches) {
      subtextActionCount += saMatches.length;
    }
  }

  var totalOnTheNose = onTheNoseCount + selfExplanationCount;

  if (totalOnTheNose >= 3 && subtextActionCount === 0) {
    valid = false;
    feedback.push(
      "On-the-nose emotion detected: " +
        totalOnTheNose +
        " instances of characters directly stating their emotions " +
        "or neatly explaining their motivations with no subtext or " +
        "physical action implying feeling. Characters should SHOW " +
        "emotion through behavior, not TELL it through declaration " +
        "([MASTER_THEORIST]: empty-and-emotive-talk, excuses-vs-motivation). " +
        "Replace declarations with actions that imply the emotion."
    );
  }

  // =========================================================
  // CHECK 5: No Conflict in Dialogue
  // Detect dialogue exchanges where all characters agree
  // without any friction, pushback, or challenge.
  // (balanced-conflict, duelogue-and-trialogue)
  // =========================================================

  var agreementPatterns = [
    /['"](?:yes|yeah|yep|yup|agreed|of course|right|exactly|absolutely|definitely|certainly|sure|indeed|correct|precisely|i agree|you're right|totally|no doubt)['".,!?]/gi,
    /['"](?:that's true|that makes sense|good idea|sounds good|sounds great|perfect|wonderful|great|excellent|i think so too|i agree completely)['".,!?]/gi,
  ];

  var agreementCount = 0;
  for (var ag = 0; ag < agreementPatterns.length; ag++) {
    var agMatches = lowerDraft.match(agreementPatterns[ag]);
    if (agMatches) {
      agreementCount += agMatches.length;
    }
  }

  // Conflict/disagreement signals
  var conflictPatterns = [
    /['"][^'"]*(?:no[,.]|but |however|i disagree|you're wrong|that's not|never|stop|don't|won't|can't|refuse|impossible|nonsense|ridiculous|absurd)[^'"]*['"]/gi,
    /['"][^'"]*(?:how dare|why would|what makes you|who gave you|you have no right)[^'"]*['"]/gi,
    /(?:snapped|snarled|shot back|fired back|retorted|challenged|countered|interrupted|protested|objected)/gi,
  ];

  var conflictCount = 0;
  for (var cf = 0; cf < conflictPatterns.length; cf++) {
    var cfMatches = lowerDraft.match(conflictPatterns[cf]);
    if (cfMatches) {
      conflictCount += cfMatches.length;
    }
  }

  if (agreementCount >= 4 && conflictCount === 0 && totalDialogueLines >= 3) {
    valid = false;
    feedback.push(
      "No conflict in dialogue detected: " +
        agreementCount +
        " agreement markers with zero pushback, disagreement, or challenge. " +
        "Dialogue IS conflict. Every exchange must have opposing desires " +
        "where characters pursue different goals through verbal action " +
        "([MASTER_THEORIST]: balanced-conflict, duelogue-and-trialogue). " +
        "Characters who agree without friction produce activity, not drama."
    );
  }

  // =========================================================
  // CHECK 6: Unweaponized Exposition
  // Detect info-dumps where characters deliver paragraphs
  // of backstory without dramatic purpose or pressure.
  // (exposition-as-ammunition, backstory-and-revelations)
  // =========================================================

  // Find long monologue blocks (5+ sentences inside dialogue tags)
  var sentences = draft.split(/[.!?]+/).filter(function(s) {
    return s.trim().length > 0;
  });

  // Detect quoted monologue blocks
  var monologuePattern = /['"][^'"]{200,}['"]/g;
  var monologues = draft.match(monologuePattern);
  var longMonologueCount = monologues ? monologues.length : 0;

  // Info-dump language (factual narration within dialogue)
  var infoDumpPatterns = [
    /(?:the\s+history\s+of|for\s+(?:many\s+)?(?:hundreds|thousands)\s+of\s+years|long\s+ago|in\s+ancient\s+times|back\s+in\s+the\s+year)/gi,
    /(?:was\s+founded|was\s+established|was\s+built|was\s+created|was\s+constructed)\s+(?:in|by|during)/gi,
    /(?:according\s+to\s+(?:legend|history|the\s+records|the\s+archives|the\s+scrolls))/gi,
    /(?:there\s+(?:are|were)\s+(?:five|six|seven|eight|nine|ten|twelve|thirteen|twenty|thirty|forty|fifty|a\s+hundred)\s+(?:kingdoms|nations|clans|tribes|houses|families|provinces|regions|districts))/gi,
    /(?:the\s+first\s+(?:king|queen|emperor|ruler|chief|lord)\s+was)/gi,
    /(?:it\s+is\s+said\s+that|legends?\s+(?:say|tell|speak)\s+of|the\s+prophecy\s+states)/gi,
  ];

  var infoDumpCount = 0;
  for (var id = 0; id < infoDumpPatterns.length; id++) {
    var idMatches = lowerDraft.match(infoDumpPatterns[id]);
    if (idMatches) {
      infoDumpCount += idMatches.length;
    }
  }

  // Pressure context signals (exposition delivered under duress)
  var pressureContextPatterns = [
    /(?:before\s+(?:we|they|you)\s+(?:die|run\s+out\s+of\s+time|lose\s+everything))/gi,
    /(?:you\s+need\s+to\s+know\s+(?:this|the\s+truth|before|now|right\s+now))/gi,
    /(?:listen\s+carefully|there's\s+no\s+time|we\s+don't\s+have\s+(?:much\s+)?time)/gi,
    /(?:if\s+(?:you|we|they)\s+(?:don't|do\s+not)\s+(?:understand|know|act|listen))/gi,
  ];

  var pressureContextCount = 0;
  for (var px = 0; px < pressureContextPatterns.length; px++) {
    var pxMatches = lowerDraft.match(pressureContextPatterns[px]);
    if (pxMatches) {
      pressureContextCount += pxMatches.length;
    }
  }

  if ((longMonologueCount >= 1 && infoDumpCount >= 2 && pressureContextCount === 0) ||
      (infoDumpCount >= 3 && pressureContextCount === 0)) {
    valid = false;
    feedback.push(
      "Unweaponized exposition detected: " +
        infoDumpCount +
        " info-dump markers " +
        (longMonologueCount > 0 ? "with " + longMonologueCount + " long monologue block(s) " : "") +
        "delivered without dramatic pressure or stakes. Exposition must be " +
        "WEAPONIZED—used as ammunition in conflict, revealed under pressure, " +
        "or delivered as a surprise that changes the power dynamic " +
        "([MASTER_THEORIST]: exposition-as-ammunition, backstory-and-revelations). " +
        "Facts without stakes are lectures, not drama."
    );
  }

  // =========================================================
  // CHECK 7: Knowing / Perceptive Talk
  // Detect characters displaying impossible self-awareness
  // or therapy-speak self-diagnosis patterns.
  // (knowing-and-perceptive-talk)
  // =========================================================

  var therapySpeakPatterns = [
    /i suppose i(?:\s+have)?\s+(?:always|never|only)/gi,
    /i realize now that i/gi,
    /the truth is i/gi,
    /i understand now that my/gi,
    /my fear of\s+\w+\s+stems from/gi,
    /i know that deep down/gi,
    /my\s+\w+\s+stems from/gi,
    /i(?:'ve|\s+have)\s+always been afraid of/gi,
    /my\s+(?:anger|fear|anxiety|insecurity|jealousy|resentment)\s+(?:is|comes from|derives from|originates from|is rooted in)/gi,
    /i(?:'m|\s+am)\s+(?:only|just)\s+(?:pushing|pulling|running|hiding|avoiding)\s+(?:you|people|everyone|him|her|them)\s+(?:away|back)/gi,
  ];

  var therapySpeakCount = 0;
  for (var ts = 0; ts < therapySpeakPatterns.length; ts++) {
    var tsMatches = lowerDraft.match(therapySpeakPatterns[ts]);
    if (tsMatches) {
      therapySpeakCount += tsMatches.length;
    }
  }

  if (therapySpeakCount >= 3) {
    valid = false;
    feedback.push(
      "Knowing/perceptive talk detected: " +
        therapySpeakCount +
        " instances of therapy-speak self-diagnosis where characters display " +
        "impossible self-awareness. Real people rarely understand their own " +
        "deepest motivations with clinical precision. Characters who explain " +
        "their own psychology are performing the author's analysis, not living " +
        "their struggle ([MASTER_THEORIST]: knowing-and-perceptive-talk). " +
        "Replace self-aware psychoanalysis with messy, subjective behavior."
    );
  }

  // =========================================================
  // CHECK 8: Monologue Fallacy
  // Detect uninterrupted character speeches that are
  // excessively long without beats or listener reactions.
  // (monologue-fallacy)
  // =========================================================

  var longQuotedBlocks = draft.match(/['"][^'"]{300,}['"]/g);
  var longMonologueBlocks = longQuotedBlocks ? longQuotedBlocks.length : 0;

  // Also look for very long quoted passages (100+ words)
  if (longMonologueBlocks === 0) {
    var allQuotedBlocks = draft.match(/['"][^'"]+['"]/g);
    if (allQuotedBlocks) {
      for (var qb = 0; qb < allQuotedBlocks.length; qb++) {
        var wordCount = allQuotedBlocks[qb].split(/\s+/).length;
        if (wordCount > 100) {
          longMonologueBlocks++;
        }
      }
    }
  }

  // Check for listener reactions or beats within long speeches
  var beatPatterns = [
    /(?:he|she|they)\s+(?:paused|hesitated|stopped|looked|glanced|shifted|nodded|shook)/gi,
    /(?:the\s+(?:listener|audience|other|crowd))\s+(?:reacted|stirred|murmured|gasped|shifted)/gi,
    /(?:interrupted|interjected|cut\s+(?:in|him|her|them)\s+off)/gi,
  ];

  var beatCount = 0;
  for (var bt = 0; bt < beatPatterns.length; bt++) {
    var btMatches = draft.match(beatPatterns[bt]);
    if (btMatches) {
      beatCount += btMatches.length;
    }
  }

  if (longMonologueBlocks >= 1 && beatCount === 0) {
    valid = false;
    feedback.push(
      "Monologue fallacy detected: " +
        longMonologueBlocks +
        " uninterrupted speech block(s) exceeding 100 words with no " +
        "listener reactions, beats, or interruptions. Human interaction " +
        "is a constant cycle of action and reaction. Long speeches without " +
        "physical beats or listener responses lose dramatic pulse " +
        "([MASTER_THEORIST]: monologue-fallacy). " +
        "Break long speeches with reactions, beats, or interruptions."
    );
  }

  // =========================================================
  // CHECK 9: Melodramatic Expression
  // Detect emotional expression that far exceeds the
  // situation's stakes. Disproportionate reactions.
  // (melodrama)
  // =========================================================

  var melodramaPatterns = [
    /!!+/g,
    /the (?:most|worst|greatest|darkest)\s+(?:terrible|horrible|awful|devastating|tragic|catastrophic|heartbreaking)\s/gi,
    /the (?:worst|greatest)\s+(?:tragedy|disaster|catastrophe|nightmare|horror)/gi,
    /the worst day of my life/gi,
    /(?:my|the)\s+(?:soul|heart|spirit|world|universe)\s+(?:shattered|collapsed|crumbled|exploded|died|broke|imploded)/gi,
    /the (?:universe|heavens|world|sky)\s+(?:collapsed|wept|shattered|crumbled|fell\s+apart|ended)/gi,
    /(?:devastating|earth-shattering|soul-crushing|heart-rending|world-ending|life-destroying)/gi,
  ];

  var melodramaCount = 0;
  var melodramaExamples = [];
  for (var md = 0; md < melodramaPatterns.length; md++) {
    var mdMatches = lowerDraft.match(melodramaPatterns[md]);
    if (mdMatches) {
      melodramaCount += mdMatches.length;
      for (var mdi = 0; mdi < mdMatches.length; mdi++) {
        if (melodramaExamples.length < 3) {
          melodramaExamples.push(mdMatches[mdi]);
        }
      }
    }
  }

  if (melodramaCount >= 3) {
    valid = false;
    var melodramaList = "";
    for (var ml = 0; ml < melodramaExamples.length; ml++) {
      if (ml > 0) {
        melodramaList += ", ";
      }
      melodramaList += "'" + melodramaExamples[ml].trim() + "'";
    }
    feedback.push(
      "Melodramatic expression detected: " +
        melodramaCount +
        " instances of disproportionate or hyperbolic emotional expression " +
        "including: " + melodramaList +
        ". Melodrama occurs when intensity of expression exceeds the " +
        "motivation provided by the stakes. High stakes demand quiet control; " +
        "low stakes with cosmic reactions produce unintentional comedy " +
        "([MASTER_THEORIST]: melodrama). " +
        "Scale emotional expression to match the actual stakes of the scene."
    );
  }

  // =========================================================
  // CHECK 10: Ostentatious Language
  // Detect dialogue that is excessively showy or
  // self-consciously literary with archaic vocabulary.
  // (ostentatious-and-arid-language)
  // =========================================================

  var archaicWords = [
    "perchance", "forthwith", "whereupon", "whilst", "betwixt",
    "henceforth", "verily", "alas", "thrice", "forsooth",
    "hitherto", "heretofore", "whence", "whereby", "thereof"
  ];

  var archaicCount = 0;
  var archaicFound = [];
  for (var aw = 0; aw < archaicWords.length; aw++) {
    var archaicRegex = new RegExp("\\b" + archaicWords[aw] + "\\b", "gi");
    var awMatches = lowerDraft.match(archaicRegex);
    if (awMatches) {
      archaicCount += awMatches.length;
      archaicFound.push(archaicWords[aw]);
    }
  }

  if (archaicCount >= 3) {
    valid = false;
    var archaicList = "";
    for (var al = 0; al < archaicFound.length; al++) {
      if (al > 0) {
        archaicList += ", ";
      }
      archaicList += "'" + archaicFound[al] + "'";
    }
    feedback.push(
      "Ostentatious language detected: " +
        archaicCount +
        " instances of archaic or self-consciously literary vocabulary " +
        "in dialogue: " + archaicList +
        ". Ostentatious dialogue calls attention to itself as writing, " +
        "breaking the bond of belief. The author's thesaurus is showing. " +
        "Dialogue should feel like it arose naturally from the character, " +
        "not from the writer's desire to impress " +
        "([MASTER_THEORIST]: ostentatious-and-arid-language). " +
        "Replace showy vocabulary with language true to the character."
    );
  }

  // =========================================================
  // CHECK 11: Dead Metaphors / Cliched Figurative Language
  // Detect dead or cliched metaphors and similes in dialogue.
  // (figurative-language)
  // =========================================================

  var deadMetaphors = [
    "raining cats and dogs",
    "needle in a haystack",
    "light at the end of the tunnel",
    "tip of the iceberg",
    "broken heart",
    "cold as ice",
    "sharp as a tack",
    "blind as a bat",
    "tough as nails",
    "quiet as a mouse",
    "clear as mud",
    "fit as a fiddle",
    "sick as a dog",
    "old as the hills",
    "dead as a doornail"
  ];

  var deadMetaphorCount = 0;
  var deadMetaphorsFound = [];
  for (var dm = 0; dm < deadMetaphors.length; dm++) {
    if (lowerDraft.indexOf(deadMetaphors[dm]) !== -1) {
      deadMetaphorCount++;
      deadMetaphorsFound.push(deadMetaphors[dm]);
    }
  }

  if (deadMetaphorCount >= 2) {
    valid = false;
    var deadMetaphorList = "";
    for (var dml = 0; dml < deadMetaphorsFound.length; dml++) {
      if (dml > 0) {
        deadMetaphorList += ", ";
      }
      deadMetaphorList += "'" + deadMetaphorsFound[dml] + "'";
    }
    feedback.push(
      "Dead metaphors detected: " +
        deadMetaphorCount +
        " cliched figurative expressions found: " +
        deadMetaphorList +
        ". Dead metaphors have lost their sensory impact through overuse. " +
        "If the reader does not FEEL the image, the metaphor is dead. " +
        "Characters who use cliched figurative language are being lazy, " +
        "not colorful ([MASTER_THEORIST]: figurative-language). " +
        "Replace each dead metaphor with a fresh, character-specific image."
    );
  }

  // =========================================================
  // CHECK 12: Shapeless Scene
  // Detect dialogue sequences that end exactly where they
  // started with no turning point or value change.
  // (misshapen-scenes, misshapen-lines)
  // =========================================================

  // Extract dialogue lines from quoted segments
  var sceneDialogueLines = draft.match(/['"][^'"]{5,}['"]/g);
  if (sceneDialogueLines && sceneDialogueLines.length >= 4) {
    var firstLine = sceneDialogueLines[0].toLowerCase().replace(/['".,!?]/g, "").trim();
    var lastLine = sceneDialogueLines[sceneDialogueLines.length - 1].toLowerCase().replace(/['".,!?]/g, "").trim();

    // Collect content words (length > 2) from first and last lines
    var stopWords = ["the", "and", "but", "for", "not", "you", "she", "his", "her", "has", "was", "are", "had", "that", "this", "with", "from", "they", "been", "have", "said", "does"];
    var firstWords = firstLine.split(/\s+/).filter(function(w) {
      return w.length > 2 && stopWords.indexOf(w) === -1;
    });
    var lastWords = lastLine.split(/\s+/).filter(function(w) {
      return w.length > 2 && stopWords.indexOf(w) === -1;
    });

    // Check for echo: last line restates or closely mirrors the first
    var sharedWords = 0;
    for (var fw = 0; fw < firstWords.length; fw++) {
      for (var lw = 0; lw < lastWords.length; lw++) {
        if (firstWords[fw] === lastWords[lw]) {
          sharedWords++;
          break;
        }
      }
    }

    var echoRatio = firstWords.length > 0 ? sharedWords / firstWords.length : 0;

    // Check for explicit circular/repetition phrases
    var circularPhrasePatterns = [
      /(?:like i said|as i said|as i mentioned|i still think|i still say|my point is|my point stands|i repeat|once again|again i say)/gi,
      /(?:i already told you|i said it before|nothing has changed|same as before|just like before)/gi,
    ];

    var circularPhraseCount = 0;
    for (var cpat = 0; cpat < circularPhrasePatterns.length; cpat++) {
      var cpatMatches = lowerDraft.match(circularPhrasePatterns[cpat]);
      if (cpatMatches) {
        circularPhraseCount += cpatMatches.length;
      }
    }

    // Check for overall lack of progression: many lines on the same topic
    // without any turning point or power shift
    var allDialogueWords = [];
    for (var adw = 0; adw < sceneDialogueLines.length; adw++) {
      var lineWords = sceneDialogueLines[adw].toLowerCase().replace(/['".,!?]/g, "").trim().split(/\s+/).filter(function(w) {
        return w.length > 2 && stopWords.indexOf(w) === -1;
      });
      for (var lwi = 0; lwi < lineWords.length; lwi++) {
        allDialogueWords.push(lineWords[lwi]);
      }
    }

    // Count unique vs total content words to measure vocabulary diversity
    var uniqueWords = [];
    for (var uw = 0; uw < allDialogueWords.length; uw++) {
      if (uniqueWords.indexOf(allDialogueWords[uw]) === -1) {
        uniqueWords.push(allDialogueWords[uw]);
      }
    }
    var diversityRatio = allDialogueWords.length > 0 ? uniqueWords.length / allDialogueWords.length : 1;

    // Detect turning point signals (power shifts, revelations, reversals)
    var turningPointPatterns = [
      /(?:but\s+then|suddenly|however|wait|actually|unless|except|reveal|confess|realize)/gi,
      /(?:changed\s+(?:his|her|their)\s+mind|took\s+a\s+step\s+back|stood\s+up|slammed|stormed\s+out)/gi,
      /(?:never\s+(?:thought|expected|imagined|knew)|for\s+the\s+first\s+time)/gi,
    ];

    var turningPointCount = 0;
    for (var tp = 0; tp < turningPointPatterns.length; tp++) {
      var tpMatches = draft.match(turningPointPatterns[tp]);
      if (tpMatches) {
        turningPointCount += tpMatches.length;
      }
    }

    // Trigger if: echo between first/last + no turning point
    // OR explicit circular phrases + no turning point
    var isShapeless = false;
    if (turningPointCount === 0) {
      if (echoRatio >= 0.3 && sceneDialogueLines.length >= 6) {
        isShapeless = true;
      }
      if (circularPhraseCount >= 2) {
        isShapeless = true;
      }
    }

    if (isShapeless) {
      valid = false;
      feedback.push(
        "Shapeless scene detected: dialogue ends where it started with no " +
          "turning point or value change. The first line echoes the last " +
          "without progression. A scene is a unit of change " +
          "where values shift from positive to negative or vice versa. " +
          "If the scene ends with the same emotional charge it began with, " +
          "it is a nonevent ([MASTER_THEORIST]: misshapen-scenes, misshapen-lines). " +
          "Add a turning point that shifts power, reveals truth, or " +
          "reverses the circular dynamic."
      );
    }
  }

  // =========================================================
  // CHECK 13: Writing On-the-Nose
  // Detect dialogue where text = subtext: characters say
  // exactly what they think/feel with zero gap.
  // (writing-on-the-nose, text-and-subtext)
  // =========================================================

  var onTheNosePatterns2 = [
    /i(?:'m|\s+am)\s+(?:trying|going)\s+to\s+(?:say|tell you|explain)/gi,
    /what i(?:'m|\s+am)\s+(?:really\s+)?(?:saying|feeling|thinking)\s+is/gi,
    /the point i(?:'m|\s+am)\s+(?:trying to\s+)?mak(?:e|ing)\s+is/gi,
    /i\s+(?:just\s+)?want(?:ed)?\s+(?:you\s+)?to\s+know\s+(?:that\s+)?i/gi,
    /i\s+need\s+(?:you\s+)?to\s+(?:understand|hear|listen|know)\s+(?:that\s+)?/gi,
    /let me be (?:clear|honest|frank|direct|blunt|straight with you)/gi,
    /(?:honestly|truthfully|frankly),?\s+i\s+(?:feel|think|believe|want)/gi,
  ];

  var onTheNose2Count = 0;
  for (var otn2 = 0; otn2 < onTheNosePatterns2.length; otn2++) {
    var otn2Matches = lowerDraft.match(onTheNosePatterns2[otn2]);
    if (otn2Matches) {
      onTheNose2Count += otn2Matches.length;
    }
  }

  if (onTheNose2Count >= 3 && subtextActionCount === 0) {
    valid = false;
    feedback.push(
      "On-the-nose dialogue detected: " +
        onTheNose2Count +
        " instances of characters announcing exactly what they think or feel " +
        "with zero gap between text and subtext. When text equals subtext, " +
        "dialogue dies. Real people deflect, lie, change the subject, or talk " +
        "about the weather when they mean goodbye " +
        "([MASTER_THEORIST]: writing-on-the-nose, text-and-subtext). " +
        "Ask: what would the character say INSTEAD of the truth?"
    );
  }

  // =========================================================
  // CHECK 14: Repetition Flaw
  // Detect the same dramatic beat repeated in different words.
  // The law of diminishing returns: one strong choice beats
  // three weak variations.
  // (repetition-flaw)
  // =========================================================

  var repetitionIndicators = [
    /please\s+(?:stay|don't\s+(?:go|leave))/gi,
    /(?:don't\s+(?:go|leave)|stay\s+(?:here|with me))/gi,
    /i(?:'m|\s+am)\s+(?:begging|asking|pleading|imploring)\s+you/gi,
    /you\s+(?:have|need)\s+to\s+(?:listen|understand|hear me|believe me)/gi,
    /i\s+(?:need|want)\s+you\s+to\s+(?:stay|listen|understand|trust me)/gi,
  ];

  var repetitionCounts = [];
  for (var ri = 0; ri < repetitionIndicators.length; ri++) {
    var riMatches = lowerDraft.match(repetitionIndicators[ri]);
    if (riMatches && riMatches.length >= 2) {
      repetitionCounts.push(riMatches.length);
    }
  }

  // Also check for repeated sentence openers (same first 3 words)
  var dialogueOpeners = [];
  var quotedSegments = draft.match(/['"][^'"]{10,}['"]/g);
  if (quotedSegments) {
    for (var qs = 0; qs < quotedSegments.length; qs++) {
      var opener = quotedSegments[qs].toLowerCase().replace(/['"]/g, "").trim().split(/\s+/).slice(0, 3).join(" ");
      if (opener.length > 5) {
        dialogueOpeners.push(opener);
      }
    }
  }

  var openerDuplicates = 0;
  for (var od1 = 0; od1 < dialogueOpeners.length; od1++) {
    for (var od2 = od1 + 1; od2 < dialogueOpeners.length; od2++) {
      if (dialogueOpeners[od1] === dialogueOpeners[od2]) {
        openerDuplicates++;
      }
    }
  }

  if (repetitionCounts.length >= 2 || openerDuplicates >= 3) {
    valid = false;
    feedback.push(
      "Repetition flaw detected: the same dramatic beat is repeated " +
        "in different words. The law of diminishing returns applies to " +
        "drama. If a character begs three times using different vocabulary, " +
        "that is one beat repeated three times, not three beats " +
        "([MASTER_THEORIST]: repetition-flaw). " +
        "Write every option, then choose the single strongest version " +
        "and cut the rest."
    );
  }

  // =========================================================
  // CHECK 15: Showing vs Telling in Dialogue
  // Detect characters explaining their history or feelings
  // rather than using them as ammunition in conflict.
  // (showing-vs-telling)
  // =========================================================

  var tellingPatterns = [
    /i(?:'ve|\s+have)\s+always\s+been\s+(?:a\s+)?(?:kind|good|bad|honest|loyal|brave|afraid|lonely|sad|happy)/gi,
    /ever\s+since\s+(?:i\s+was\s+(?:a\s+)?(?:child|young|little|kid|boy|girl))/gi,
    /(?:you\s+see|you\s+have\s+to\s+understand),?\s+(?:when\s+i\s+was|growing\s+up|back\s+when)/gi,
    /(?:the\s+thing\s+(?:is|about\s+me)|what\s+you\s+(?:need|have)\s+to\s+(?:know|understand)\s+(?:is|about))/gi,
    /i\s+(?:feel|am)\s+(?:so\s+)?(?:lonely|sad|happy|angry|afraid)\s+(?:because|since|ever\s+since|now\s+that)/gi,
  ];

  var tellingCount = 0;
  for (var tl = 0; tl < tellingPatterns.length; tl++) {
    var tlMatches = lowerDraft.match(tellingPatterns[tl]);
    if (tlMatches) {
      tellingCount += tlMatches.length;
    }
  }

  // Showing signals: concrete actions replacing emotional declarations
  var showingPatterns = [
    /(?:slammed|threw|hurled|kicked|punched|shoved|pushed|pulled|grabbed|dropped)/gi,
    /(?:whispered|muttered|hissed|growled|snapped|barked|spat|choked)/gi,
    /(?:turned\s+(?:away|his|her|their)\s+back|walked\s+(?:out|away)|left\s+the\s+room)/gi,
  ];

  var showingCount = 0;
  for (var sh = 0; sh < showingPatterns.length; sh++) {
    var shMatches = draft.match(showingPatterns[sh]);
    if (shMatches) {
      showingCount += shMatches.length;
    }
  }

  if (tellingCount >= 3 && showingCount === 0) {
    valid = false;
    feedback.push(
      "Telling instead of showing detected: " +
        tellingCount +
        " instances of characters explaining their feelings or history " +
        "rather than demonstrating them through action. " +
        "If a character says 'I am sad,' delete it and show them doing " +
        "something that proves they are sad while talking about something " +
        "else entirely ([MASTER_THEORIST]: showing-vs-telling). " +
        "Replace feeling words with concrete actions and specific details."
    );
  }

  // =========================================================
  // CHECK 16: Word Choice — Abstract and Passive
  // Detect abstract, passive, or circumlocutory language
  // in dialogue where concrete, active, direct speech is better.
  // (word-choice-preferences)
  // =========================================================

  var abstractPatterns = [
    /(?:facilitate|utilize|implement|leverage|synergize|optimize|incentivize|operationalize)/gi,
    /(?:in\s+terms\s+of|with\s+regard\s+to|in\s+relation\s+to|pertaining\s+to|in\s+respect\s+of)/gi,
    /(?:it\s+(?:is|was|has\s+been)\s+(?:determined|decided|established|concluded)\s+that)/gi,
    /(?:the\s+(?:implementation|utilization|facilitation|optimization)\s+of)/gi,
  ];

  var abstractCount = 0;
  for (var ab = 0; ab < abstractPatterns.length; ab++) {
    var abMatches = lowerDraft.match(abstractPatterns[ab]);
    if (abMatches) {
      abstractCount += abMatches.length;
    }
  }

  // Passive voice in dialogue
  var passivePatterns = [
    /(?:was|were|been|being)\s+(?:\w+ed|given|taken|made|done|told|shown|seen|heard|felt|left|sent|brought|caught|found|known)\s+(?:by|to|from)/gi,
  ];

  var passiveCount = 0;
  for (var pv = 0; pv < passivePatterns.length; pv++) {
    var pvMatches = lowerDraft.match(passivePatterns[pv]);
    if (pvMatches) {
      passiveCount += pvMatches.length;
    }
  }

  if (abstractCount >= 3 || (abstractCount >= 2 && passiveCount >= 2)) {
    valid = false;
    feedback.push(
      "Abstract and passive language detected: " +
        abstractCount +
        " abstract/corporate phrases" +
        (passiveCount > 0 ? " and " + passiveCount + " passive constructions" : "") +
        " in dialogue. Prefer concrete over abstract, familiar over exotic, " +
        "short over long, active over passive, direct over circumlocution " +
        "([MASTER_THEORIST]: word-choice-preferences). " +
        "Replace corporate jargon with the specific nouns and active verbs " +
        "that reflect the character's world."
    );
  }

  // =========================================================
  // CHECK 17: Indistinct Character Voices
  // Detect when multiple characters use identical vocabulary
  // or speech patterns, erasing individual voice.
  // (vocabulary-and-characterization, write-in-character)
  // =========================================================

  // Extract dialogue attributed to different speakers
  var speakerPattern = /['"]([^'"]{10,})['"]\s*(?:,?\s*)?(?:said|asked|replied|answered|whispered|muttered|shouted|cried|called|snapped|hissed|growled|murmured|exclaimed|declared|insisted|demanded|pleaded|begged|sighed|groaned|yelled|screamed)\s+(\w+)/gi;
  var speakerDialogue = {};
  var spMatch;
  while ((spMatch = speakerPattern.exec(draft)) !== null) {
    var speakerName = spMatch[2].toLowerCase();
    if (!speakerDialogue[speakerName]) {
      speakerDialogue[speakerName] = [];
    }
    speakerDialogue[speakerName].push(spMatch[1].toLowerCase());
  }

  var speakers = [];
  for (var spk in speakerDialogue) {
    if (speakerDialogue.hasOwnProperty(spk)) {
      speakers.push(spk);
    }
  }

  if (speakers.length >= 2) {
    // Compare word frequency profiles between speakers
    var speakerProfiles = {};
    for (var sp = 0; sp < speakers.length; sp++) {
      var words = speakerDialogue[speakers[sp]].join(" ").split(/\s+/);
      var profile = {};
      for (var w = 0; w < words.length; w++) {
        var word = words[w].replace(/[^a-z]/g, "");
        if (word.length > 3 && stopWords.indexOf(word) === -1) {
          if (!profile[word]) {
            profile[word] = 0;
          }
          profile[word]++;
        }
      }
      speakerProfiles[speakers[sp]] = profile;
    }

    // Calculate overlap between speaker pairs
    var totalOverlap = 0;
    var pairCount = 0;
    for (var s1 = 0; s1 < speakers.length; s1++) {
      for (var s2 = s1 + 1; s2 < speakers.length; s2++) {
        var prof1 = speakerProfiles[speakers[s1]];
        var prof2 = speakerProfiles[speakers[s2]];
        var shared = 0;
        var total1 = 0;
        for (var k in prof1) {
          if (prof1.hasOwnProperty(k)) {
            total1++;
            if (prof2[k]) {
              shared++;
            }
          }
        }
        if (total1 > 0) {
          totalOverlap += shared / total1;
          pairCount++;
        }
      }
    }

    var avgOverlap = pairCount > 0 ? totalOverlap / pairCount : 0;

    if (avgOverlap > 0.7 && speakers.length >= 2) {
      var speakerList = "";
      for (var sl = 0; sl < speakers.length; sl++) {
        if (sl > 0) {
          speakerList += ", ";
        }
        speakerList += speakers[sl];
      }
      feedback.push(
        "Indistinct character voices detected: speakers (" +
          speakerList +
          ") share " +
          Math.round(avgOverlap * 100) +
          "% vocabulary overlap. Each character must have a distinctive " +
          "voice shaped by education, class, region, era, and psychology. " +
          "If dialogue tags were removed, readers should still identify " +
          "who is speaking ([MASTER_THEORIST]: vocabulary-and-characterization, " +
          "write-in-character). " +
          "Use the inside-out method: start with each character's unique " +
          "knowledge and filter the world through their specific lens."
      );
    }
  }

  // --- Summary feedback ---
  if (valid && feedback.length === 0) {
    feedback.push(
      "Dialogue craft check passed. Dialogue shows purposeful action through conflict, " +
        "original language free of cliches, weaponized exposition under pressure, " +
        "subtext-driven emotion, and dynamic power shifts between characters."
    );
  }

  return { valid: valid, feedback: feedback };
}
