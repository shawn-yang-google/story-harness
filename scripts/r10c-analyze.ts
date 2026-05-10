#!/usr/bin/env bun
/**
 * R10-C: A/B test PARTIAL_MIN_CLAIMS=2 vs =3.
 *
 * Replays the lore_coverage_partial heuristic (lines 192-211 of
 * src/reference/source-checker.ts) against every reference-graph
 * fixture in the three R9 session directories at both thresholds, and
 * prints a diff: which (session, round, category) cells fire newly
 * when we drop the threshold from 3 to 2.
 *
 * Sessions:
 *   * Q1 persona: logs/generate-2026-05-10T04-25-31-969Z (lore.family-history-cn.json)
 *   * Q1 bare:    logs/generate-2026-05-10T04-26-05-132Z (lore.family-history-cn.json)
 *   * Q2:         logs/generate-2026-05-10T04-27-43-656Z (lore.q2-multi-domain.json)
 *
 * No LLM calls. No file mutations. Just numbers.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import type { ReferenceGraph } from "../src/types/reference-graph";

const PARTIAL_THRESHOLD = 0.5;

type LoreDb = Record<string, unknown>;

const SESSIONS: Array<{ id: string; dir: string; lore: string }> = [
  {
    id: "Q1-persona",
    dir: "logs/generate-2026-05-10T04-25-31-969Z",
    lore: "datasets/lore.family-history-cn.json",
  },
  {
    id: "Q1-bare",
    dir: "logs/generate-2026-05-10T04-26-05-132Z",
    lore: "datasets/lore.family-history-cn.json",
  },
  {
    id: "Q2-multi",
    dir: "logs/generate-2026-05-10T04-27-43-656Z",
    lore: "datasets/lore.q2-multi-domain.json",
  },
];

/** Collect all string values from a loreDb-shaped object (mirrors source-checker.ts). */
function collectLoreValues(obj: unknown, out: string[] = []): string {
  if (obj == null) return out.join(" ");
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    out.push(String(obj));
  } else if (Array.isArray(obj)) {
    for (const item of obj) collectLoreValues(item, out);
  } else if (typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      collectLoreValues(v, out);
    }
  }
  return out.join(" ");
}

interface CategoryTally {
  total: number;
  covered: number;
}

/** Mirrors the per-category tally inside checkLoreCoverage. */
function tallyByCategory(graph: ReferenceGraph, loreDb: LoreDb): Map<string, CategoryTally> {
  const haystack = collectLoreValues(loreDb).toLowerCase();
  const tally = new Map<string, CategoryTally>();
  for (const claim of graph.claims) {
    if (claim.verdict !== "accurate" || claim.confidence !== "high") continue;
    const claimTerms = claim.claim
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 4);
    const isCovered = claimTerms.some((t) => haystack.includes(t));
    const bucket = tally.get(claim.category) ?? { total: 0, covered: 0 };
    bucket.total += 1;
    if (isCovered) bucket.covered += 1;
    tally.set(claim.category, bucket);
  }
  return tally;
}

interface FiringRow {
  session: string;
  round: number;
  category: string;
  total: number;
  covered: number;
  uncoveredFrac: number;
  firesAt: number[]; // which thresholds this row fires at (2, 3, or both)
}

function evalFiring(
  tally: Map<string, CategoryTally>,
  thresholds: number[]
): Map<number, Array<{ category: string; total: number; covered: number; uncoveredFrac: number }>> {
  const out = new Map<number, Array<{ category: string; total: number; covered: number; uncoveredFrac: number }>>();
  for (const t of thresholds) out.set(t, []);
  for (const [category, { total, covered }] of tally) {
    if (covered === 0) continue; // covered by lore_coverage (no minimum)
    const uncoveredFrac = (total - covered) / total;
    if (uncoveredFrac < PARTIAL_THRESHOLD) continue;
    for (const t of thresholds) {
      if (total >= t) {
        out.get(t)!.push({ category, total, covered, uncoveredFrac });
      }
    }
  }
  return out;
}

function listRounds(sessionDir: string): number[] {
  if (!existsSync(sessionDir)) return [];
  return readdirSync(sessionDir)
    .filter((d) => d.startsWith("round-"))
    .map((d) => parseInt(d.slice("round-".length), 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

const allRows: FiringRow[] = [];

console.log("# R10-C — PARTIAL_MIN_CLAIMS A/B test\n");
console.log("Replaying checkLoreCoverage (partial branch) against every R9 reference-graph at thresholds {2, 3}.\n");

for (const session of SESSIONS) {
  const lore = JSON.parse(readFileSync(session.lore, "utf-8")) as LoreDb;
  const rounds = listRounds(session.dir);
  console.log(`## ${session.id} (${rounds.length} rounds, lore=${session.lore})`);

  for (const r of rounds) {
    const path = join(session.dir, `round-${r}`, "reference-graph.json");
    if (!existsSync(path)) continue;
    const graph = JSON.parse(readFileSync(path, "utf-8")) as ReferenceGraph;
    const tally = tallyByCategory(graph, lore);
    const firing = evalFiring(tally, [2, 3]);
    const firesAt2 = firing.get(2)!;
    const firesAt3 = firing.get(3)!;

    if (firesAt2.length === 0 && firesAt3.length === 0) {
      console.log(`  round ${r}: tally=${JSON.stringify([...tally].map(([k, v]) => [k, v]))} — no firings at either threshold`);
      continue;
    }

    const firesAt3Cats = new Set(firesAt3.map((f) => f.category));
    for (const f of firesAt2) {
      const firesAt = f.total >= 3 ? [2, 3] : [2];
      allRows.push({
        session: session.id,
        round: r,
        category: f.category,
        total: f.total,
        covered: f.covered,
        uncoveredFrac: f.uncoveredFrac,
        firesAt,
      });
      const tag = firesAt3Cats.has(f.category) ? "(fires at both 2 and 3)" : "(NEW at threshold=2)";
      console.log(
        `  round ${r}: [${f.category}] ${f.covered}/${f.total} covered, ${(f.uncoveredFrac * 100).toFixed(0)}% uncovered ${tag}`
      );
    }
  }
  console.log();
}

console.log("## Summary\n");
const totalFirings = allRows.length;
const newAt2 = allRows.filter((r) => !r.firesAt.includes(3)).length;
const sharedFirings = allRows.filter((r) => r.firesAt.includes(3)).length;
console.log(`Total firings at threshold=2: ${totalFirings}`);
console.log(`  - Also fire at threshold=3: ${sharedFirings}`);
console.log(`  - NEW (only fire at threshold=2): ${newAt2}`);

if (newAt2 === 0) {
  console.log(
    "\nVerdict: dropping the threshold to 2 changes nothing on these fixtures. " +
      "Either the data is too sparse OR threshold=3 already captures the relevant cases. " +
      "Recommend: keep PARTIAL_MIN_CLAIMS=3."
  );
} else {
  console.log(
    `\nVerdict: ${newAt2} category-rounds gain a warning at threshold=2. ` +
      "Inspect these manually — if they're real coverage gaps, lower the constant; " +
      "if they're false positives (e.g. a single uncovered claim out of 2 in a niche category), keep the constant at 3."
  );
}
