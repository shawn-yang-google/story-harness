# StoryHarness — Speaker Notes

Scripts to speak while presenting each slide. Read naturally, not word-for-word. Bold text = key phrases to hit. Italics = stage directions.

---

## Slide 1: "The Draft — Looks Great, Right?" (~1.5 min)

*[The animation starts automatically — paragraphs fade in one by one. Let the first few paragraphs stream before speaking.]*

"So I gave Gemini Flash Lite one sentence: *'A software engineer was L9, down-leveling to L3, then quickly climbs up to CEO.'* And it wrote this.

*[Let it stream for a few seconds]*

Read along — it's actually pretty good. It sets up the character, establishes the stakes, builds tension with the server crisis. The dialogue flows. The grammar is perfect. It's a perfectly readable 1,500-word story.

*[Let a few more paragraphs stream — especially the crisis and 'concert pianist' parts]*

If you just read this casually, you'd think the LLM nailed it. And most AI storytelling products would ship this as-is.

**But is it actually good?** Let's find out."

---

## Slide 2: "But The Harness Found 9 Issues" (~2 min)

*[Click to slide 2. The annotated excerpts appear.]*

"This is the same story — but now I've run it through StoryHarness. And look what it found.

*[Point at the first excerpt — yellow highlight]*

**Broken obligation.** The story explicitly says Marcus promised himself he wouldn't get involved. Then he does — and the story treats it as heroic. No guilt, no inner conflict, no cost. A good story makes you *pay* for breaking your own rules.

*[Point at the second excerpt — red highlight]*

**Cringe.** *'His fingers hit the mechanical keyboard with the speed and precision of a concert pianist.'* The system literally called this a juvenile power fantasy. That's the kind of thing a human editor would circle in red.

*[Point at the third excerpt — magenta highlight]*

**Psychic knowledge.** Evelyn recognizes Marcus through a webcam — but he used a fake name. The story never explains how she knows. The knowledge just appears out of thin air.

*[Point at the fourth excerpt — cyan highlight]*

**Exposition dump.** Evelyn reads Marcus's entire resume out loud to a room of strangers. *'He designed the cloud infrastructure that half the modern internet runs on.'* That's a Wikipedia dump disguised as dialogue.

*[Pause]*

Four checks shown, **nine issues found in total.** And this isn't a cherry-picked bad example — **this is what every raw LLM output looks like** when you verify it with formal rules."

---

## Slide 3: "The Insight" (~2 min)

*[Click to slide 3]*

"So how do we fix this? Our key insight is simple: **what if stories had type checkers?**

*[Point at the top row]*

If you're an engineer, you know this pipeline. You write source code. The compiler catches type errors. You fix them. You get a working program. We take this exact same idea and apply it to stories.

*[Point at the bottom row]*

A story draft goes through our harness. The harness catches plot holes, cliché dialogue, psychic knowledge, flat characters. The model fixes them. And you get a published-quality story.

*[Point at the insight box]*

But here's the trick — **we don't ask the LLM to judge the story.** That's what everyone else does, and it only gets 53% accuracy. Instead, we split the problem.

**Phase A**: a cheap, fast LLM — Flash Lite — reads the story and extracts its structure into a JSON knowledge graph. It's acting as a parser, not a judge. It's just saying 'here's what happened in the story.'

**Phase B**: then deterministic code — plain TypeScript — checks 48 formal rules against that graph. No LLM involved. No hallucination possible. Same graph, same result, every time.

**The result: 88% accuracy.** Nearly double what you get from asking an LLM to do both at once. The secret is separation of concerns — the LLM does what it's good at, code does what code is good at."

---

## Slide 4: "Knowledge Graphs" (~2 min)

*[Click to slide 4]*

"So what does this knowledge graph actually look like? Let me show you a real one.

*[Point at the JSON on the left]*

This is the **Character Graph** extracted from our demo story. Look at this structure. The model identified that Marcus Vance's **mask** — his public persona — is *'a mid-level code monkey content with Jira tickets.'* But his **true nature** is *'a brilliant L9 Architect offended by incompetence.'*

And critically, `maskMatchesTruth` is **false**. That's good! That means the character has depth. In Robert McKee's terms, there's a gap between characterization and true character. If this were `true`, our Character Checker would flag it as a 'cement-block character' — no depth, no layers, no interest.

*[Point at the table on the right]*

We have four of these graphs. The **Logic Graph** is the most complex — 27 checks covering propositional logic, temporal reasoning, what characters know and when they learned it, obligations, world rules, inventory tracking. If a dead character picks up a sword, the Entity Checker catches it.

**Dialogue Graph** — 8 checks based on McKee's dialogue theory. Subtext, exposition quality, character voice distinctiveness.

**Character Graph** — 6 checks. Mask versus truth, pressure choices, dimensional contradictions.

**Narrative Graph** — 7 checks. Do scenes turn on values? Do stakes escalate? Is the theme shown or stated?

48 checks total. All deterministic. **Same graph in, same result out.** You can debug it, you can audit it, you can unit test it. Try doing that with an LLM evaluation."

---

## Slide 5: "What The Harness Catches" (~2 min)

*[Click to slide 5]*

"Let me show you three real checks — with the exact draft text that triggered each one.

*[Point at the first card]*

**Psychic knowledge.** Marcus applied to Synthetix under a fake name. He left his L9 career off the resume. Nobody knows who he is. Richard screams *'Get this junior dev out of here!'* — he clearly has no idea. But then Evelyn — watching through a webcam — instantly says *'That man is the former L9 Chief Architect of NovaTech.'* How? The story never explains it. She didn't investigate, nobody told her, the recognition just... happens. The `EpistemicChecker` flags this because **the knowledge has no narrative source.**

*[Point at the second card]*

**Broken obligation.** Look at this — the story explicitly says *'He had promised himself he wouldn't get involved in management. He had promised himself he was just an L3.'* That's a self-imposed obligation. Then, three paragraphs later, he pushes the CTO aside and takes over the terminal. And the story... celebrates it. No guilt, no internal conflict, no cost. The `DeonticChecker` flags this because **an obligation was violated without any narrative consequence or acknowledgment.** In a well-crafted story, breaking a promise should mean something.

*[Point at the third card]*

**Exposition dump.** Read Evelyn's speech here — *'That man is the former L9 Chief Architect of NovaTech. He designed the cloud infrastructure that half the modern internet runs on.'* She's reading his resume out loud to a room full of people who have no reason to care about his job history. This is classic 'as you know, Bob' writing — characters explaining things to each other that they already know, purely so the reader gets the backstory. The `DialogueChecker` flags it because **McKee says exposition should be weaponized, not dumped.**

*[Pause]*

Three different checkers. Three different domains — epistemic logic, deontic logic, dialogue craft. Each one **points to the exact text that triggered it.** That's the difference between this and asking an LLM to rate a story 1 to 10."

---

## Slide 6: "Before vs After" (~2 min)

*[Click to slide 6]*

"Let me show you the actual transformation.

*[Point at the left column]*

**Round 1** — the raw LLM output. Read this: *'His fingers hit the mechanical keyboard with the speed and precision of a concert pianist.'* That's cringe. The system flagged it.

And then Richard — the CEO — screams *'You reckless idiot! You are fired!'* That's on-the-nose dialogue. He's directly stating his emotions. No subtext, no complexity.

Then Evelyn says *'Richard, you absolute clown. That man is the former L9 Chief Architect.'* That's an exposition dump — she's explaining things to characters who should already know them, purely for the reader's benefit. That's 'as-you-know-Bob' writing.

*[Point at the right column]*

**Round 5** — after the harness refined it. Look at the difference.

*'Marcus stood up without announcing himself, walking over to step directly into Greg's space.'* No concert pianist. Just action.

*'Security. Get this idiot away from the console.'* Richard's reaction is proportionate — he doesn't know who Marcus is. He just sees a random employee touching production. That's realistic.

And Marcus? *'His muscle memory taking over.'* **Competence shown, not told.** The reader figures out he's exceptional from his actions, not from the narrator saying so.

That's the difference between a first draft and an edited draft. Normally, a human editor does this. **StoryHarness does it in five rounds, automatically.**"

---

## Slide 7: "Live Terminal Demo" (~2 min)

*[Click to slide 7. The animation starts automatically. Let it run — don't talk over the first few lines.]*

*[Wait for the command to type out, then start narrating:]*

"So here's an actual run. The prompt goes in... the model generates a draft... and now the verification starts.

*[As Round 1 output appears:]*

Watch this — Round 1. Nine issues found. Look at the color coding. **Red** is Tier 2 — that's our knowledge graph checks. Formal logic violations, psychic knowledge, broken obligations. These are precise, evidence-based findings with specific checker names.

**Yellow** is Tier 3 — that's the subjective evaluation. Cringe factor, style issues.

*[As structural rewrite appears:]*

Now it's doing a structural rewrite — three scene-level issues that can't be fixed with a find-and-replace. The model rewrites the whole scene...

*[As Round 2 appears:]*

Round 2 — down to four issues. It's patching them one by one. Each patch is a minimal diff, not a full rewrite.

*[As Rounds 3-4 appear:]*

Round 3 — just one issue left. Exposition dump. Patches it. Round 4 — **all substantive checks pass.**

*[As Round 5 appears:]*

Now the final round adds Tier 1 — the style checks. Word frequency, exclamation marks, sentence length. These are the polish issues you save for last.

*[As "Draft accepted!" appears:]*

**Draft accepted.** Five rounds. From nine issues to zero. That's the whole system working end-to-end."

---

## Slide 8: "The Moat" (~2 min)

*[Click to slide 8]*

"So let me talk about defensibility — why this is hard to replicate.

*[Point at the numbers]*

**48 deterministic checks.** Each one encodes domain expertise — Robert McKee's story theory, formal propositional logic, epistemic reasoning, temporal consistency. This isn't prompt engineering. This is **narrative theory compiled into code.** You can't just ask ChatGPT to do this.

**34 structured interfaces.** Four knowledge graph schemas with 14 types for logic alone — propositions, conditional rules, temporal events, knowledge entries, obligations, prohibitions, world rules, inventory, locations, statuses. This took weeks to design and test.

**88% accuracy** — vs 53% for the approach everyone else uses, which is 'ask the LLM if the story is good.' Our approach nearly doubles accuracy because we separate extraction from evaluation.

**Less than a tenth of a cent per story.** The pure code checks — pattern matching, style rules — are completely free. No API call, five milliseconds. The knowledge graph step — where Flash Lite extracts structure — costs two hundredths of a cent. The expensive LLM judge? That's only used during training, never at runtime.

**100% deterministic.** Same input, same output. You can unit test it. You can audit it. You can debug it. Try debugging why GPT-4 gave your story a 7 instead of an 8.

*[Pause, read the bottom line]*

**Anyone can prompt an LLM to write a story. Nobody else has formal verification for narrative.** That's the moat."

---

## Slide 9: "Roadmap" (~1 min)

*[Click to slide 9]*

"Where we're going.

**Right now**, we have 48 checks across four domains — logic, dialogue, character, narrative.

**Next**, we're adding more domains. Worldbuilding consistency, pacing analysis, humor detection. Each domain is a new knowledge graph schema plus deterministic checkers.

We're also building **beam search** — instead of generating one draft and refining it, we generate N diverse drafts in parallel and pick the best one. That explores the creative space before the harness narrows it down.

**Later**, we want intentional rule-breaking. If an author deliberately uses an unreliable narrator, the system should respect that instead of flagging it as a contradiction. And interactive author mode — human-in-the-loop editing where you can accept or reject each harness suggestion.

*[Pause]*

**StoryHarness. A compiler for stories.** Thanks."

*[Stop. Wait for questions.]*
