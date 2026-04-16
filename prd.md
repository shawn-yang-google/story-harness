# Pitch Proposal: Story Harness

# Pitch Proposal: StoryHarness
## Executive Summary
StoryHarness is a proposed framework that bridges the gap between structured AI generation and the nuanced art of human storytelling. By automatically synthesizing code harnesses that act as a strict control loop for Large Language Models (LLMs), StoryHarness evaluates and guides narrative generation across critical dimensions such as logic, structure, emotion, and tension. This tool aims to empower creators by providing an impossibly thorough, multi-disciplinary review system, aligning with the vision of utilizing AI to explore the future of AI storytellers and building a filmmaking ecosystem for the future \[1\].
## The Problem Space
While LLMs excel at generating text, their long-form planning, narrative consistency, and pacing can be brittle. In strictly defined environments (like coding or games), models often fail by proposing invalid states. Traditional mitigation involves labor-intensive hand-coded rules or expensive fine-tuning \[2\]. In creative writing, the "rules" are subjective heuristics (e.g., maintaining tension, avoiding plot holes). Currently, no system programmatically enforces these narrative heuristics in an automated verification-and-refinement loop (referred to as "rejection sampling" throughout this project — see [Design Philosophy](docs/design-philosophy.md) for the precise terminology).
## The StoryHarness Architecture
Drawing inspiration from recent advancements in LLM agent control loops \[2\], StoryHarness adapts the concept of "code as policy" into a narrative environment.

### 1. The Multi-Disciplinary Verifier Sub-Harnesses
Instead of checking code syntax, StoryHarness trains an ensemble of specialized sub-harnesses that act as programmatic editors:

* **LogicHarness:** Cross-references the generated text against a persistent "lore database" or world-building document to prevent plot holes and inconsistencies.
* **StructureHarness:** The 5 Cs & Scope Limiter. Evaluates the overarching narrative arc (e.g., Hero's Journey, Three-Act Structure) to ensure story beats are hit at the appropriate times.
* **TensionHarness:** Enforcing "Start Late, Exit Early" & Hooks. Analyzes pacing. It flags the text if the current scene fails to escalate the stakes or if the tension prematurely flatlines.
* **EmotionHarness:** Evaluates character arcs and emotional resonance based on the specified target audience, ensuring emotional payoffs feel earned.
* **StyleHarness**: Enforcing "Show, Don't Tell" & Cliché Checking, acts as a strict line editor. It forces the LLM to use sensory language and rejects lazy, exposition-heavy writing or overused phrases.
* **And more customizable Harness!
**

### 2. The Rejection Sampling Control Loop
The core of the framework is a feedback loop that evaluates and refines drafts:

1. The base LLM generates a draft scene or chapter.
1. The draft is passed through the ensemble of sub-harnesses (is\_legal\_action()).
1. If a sub-harness returns a failure (e.g., "Error: The protagonist achieved their goal too easily, lowering the stakes"), the control loop rejects the draft.
1. The specific error feedback is sent back to the LLM as a refinement prompt, forcing it to rewrite the scene until it passes all sub-harness verifications.

### 3. Rule Synthesis via Narrative Trajectories
To avoid rigid, hand-coded rules, the system learns from "trajectories" \[2\]. By analyzing winning trajectories (e.g., award-winning scripts, classic literature) and losing trajectories (e.g., poorly rated stories), StoryHarness extracts underlying structural heuristics. It learns _why_ a specific script works for a specific audience and codifies those best practices into the sub-harnesses automatically.
## Alignment with Team Goals
This project merges deep technical architecture (LLM rejection sampling, code synthesis) with the humanities (literary analysis, narrative empathy) \[1\].

* **Human-Centric Technology:** It translates complex technical research into a tool that elevates human storytelling rather than replacing the writer.
* **Forward-Looking Experimentation:** It asks the provocative question: Can we systemize narrative empathy and structural pacing through AI?

---
## References
1. [https://blog.google/innovation-and-ai/products/ai-on-screen-short-films/](https://blog.google/innovation-and-ai/products/ai-on-screen-short-films/) 
1. [AutoHarness: improving LLM agents by automatically synthesizing a code harness](https://arxiv.org/html/2603.03329v1)

