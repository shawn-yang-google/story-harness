# Needs-Research Workflow

Complete guide for the needs-research.json round-trip workflow.

## Overview

When the Reference Harness encounters claims it cannot verify (confidence: `low`/`unverifiable`, verdict: `needs_research`/`partially_accurate`), it exports them as a structured research checklist.

## Output Schema

```json
{
  "generatedAt": "2024-01-01T00:00:00Z",
  "summary": {
    "totalClaims": 15,
    "verifiedClaims": 10,
    "needsResearchClaims": 4,
    "inaccurateClaims": 1,
    "byCategory": { "cultural": 2, "linguistic": 1, "historical": 1 }
  },
  "instructions": "...",
  "items": [
    {
      "id": "ref3",
      "category": "cultural",
      "priority": "high",
      "claim": "Rain dances are performed at midnight",
      "excerpt": "the villagers began their midnight rain dance",
      "location": "paragraph 4",
      "reason": "The model believes this is partially accurate but cannot fully verify",
      "modelAssessment": "Rain dances exist in various cultures but midnight timing is uncertain",
      "suggestedSources": [
        "Ethnographic studies and cultural anthropology papers",
        "Interviews with people from the referenced culture/era",
        "Documentary films about the region/period",
        "Cultural heritage organizations"
      ],
      "resolution": null
    }
  ]
}
```

## Priority Levels

| Priority | Meaning | Action |
|----------|---------|--------|
| **high** | Likely inaccurate or partially accurate | Research urgently before publishing |
| **medium** | Model has limited knowledge | Verify for high-authenticity work |
| **low** | Very niche/specific topic | Verify if targeting expert audience |

## Resolution Format

Fill in the `resolution` field for each researched item:

```json
{
  "resolution": {
    "accurate": true,
    "verifiedFact": "The Hopi rain dance is performed at dawn, not midnight",
    "source": "Ethnographic study by Smith (2019)",
    "addToLoreDb": true
  }
}
```

Fields:
- `accurate`: Whether the original claim was correct
- `verifiedFact`: The actual fact as verified by research
- `source`: Citation for the verification
- `addToLoreDb`: Set `true` to auto-import into loreDb for future stories

## Suggested Sources by Category

| Category | Sources |
|----------|---------|
| historical | JSTOR, Google Scholar, Wikipedia (verify with primaries), government archives |
| geographic | Google Earth, National Geographic, NASA databases, local government sites |
| cultural | Ethnographic studies, interviews, documentaries, heritage organizations |
| scientific | Nature, Science, arXiv, domain textbooks, expert consultation |
| linguistic | Linguistic atlases, period literature, language documentation projects, native speakers |

## Import Command

After completing research:

```bash
bun run src/cli/index.ts import-research <path-to-resolved-file.json>
```

This extracts all items with `resolution.addToLoreDb: true` and merges them into the project's loreDb.

## Example Workflow

1. Generate a story set in 1960s China
2. Reference Harness extracts 20 factual claims
3. 15 verified accurately, 3 need research, 2 inaccurate
4. `needs-research.json` generated with 3 items (priority-sorted)
5. Author researches: consults history books, talks to family members
6. Fills in `resolution` for each item
7. Runs `import-research` — 2 facts added to loreDb
8. Next story generation uses these facts as ground truth
