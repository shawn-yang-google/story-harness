# StoryHarness - GEMINI.md

## PROJECT KNOWLEDGE BASE

### TDD (Test-Driven Development)
**MANDATORY.** RED-GREEN-REFACTOR:
1. **RED**: Write test → `bun test` → FAIL
2. **GREEN**: Implement minimum → PASS
3. **REFACTOR**: Clean up → stay GREEN

**Rules:**
- NEVER write implementation before test.
- NEVER delete failing tests - fix the code.

### CONVENTIONS
- **Package manager**: Bun only (`bun run`, `bun build`, `bunx`).
- **Types**: bun-types (NEVER types-node).
- **Testing**: BDD comments, 100 test files.
- **Language**: English ONLY for code, comments, issues, and commits.
- **Git**: Always commit work before asking for review.

### OVERVIEW
StoryHarness is a framework that bridges the gap between structured AI generation and the nuanced art of human storytelling by automatically synthesizing code harnesses.

### RUNNING
```bash
bun run src/cli/index.ts <command>
bun test
```