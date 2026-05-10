#!/usr/bin/env bun
/**
 * R11: verifier verdict-distribution audit.
 *
 * R10-C surfaced a hypothesis: the upstream LLM verifier almost
 * always marks claims as `(accurate, high)`, which makes
 * `lore_coverage_partial` structurally unreachable because
 * the partial-coverage tally only counts `(accurate, high)` claims
 * and the categories then come out as 100% covered.
 *
 * This script tests that hypothesis at scale by scanning every
 * `reference-graph.json` in `logs/generate-*` and producing:
 *
 *   1. A 4×4 (verdict × confidence) histogram across all claims.
 *   2. The same histogram broken out per category.
 *   3. A "stuck-at-(accurate,high)" rate per session — what fraction
 *      of each session's claims fall in that one cell.
 *   4. The implied actionable-rate of the partial-coverage tally
 *      as currently implemented vs. a hypothetical broadened tally
 *      that also counts (accurate, medium) and (partially_accurate, *).
 *
 * No LLM calls. No file mutations. Just numbers.
 *
 * Output is plain text intended for copy-paste into HISTORY.md.
 *
 * Usage:
 *   bun run scripts/r11-verdict-audit.ts [logs-dir]
 *     - logs-dir defaults to "logs"
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

interface FactualClaimLite {
  category?: string;
  verdict?: string;
  confidence?: string;
}

const VERDICTS = [
  "accurate",
  "inaccurate",
  "partially_accurate",
  "needs_research",
] as const;

const CONFIDENCES = ["high", "medium", "low", "unverifiable"] as const;

type Verdict = (typeof VERDICTS)[number] | "other";
type Confidence = (typeof CONFIDENCES)[number] | "other";

const logsDir = process.argv[2] ?? "logs";
if (!existsSync(logsDir)) {
  console.error(`No such directory: ${logsDir}`);
  process.exit(2);
}

interface SessionRollup {
  sessionId: string;
  totalClaims: number;
  accurateHigh: number;
}

const grandHistogram = new Map<string, number>(); // "verdict|confidence" → count
const perCategory = new Map<string, Map<string, number>>(); // category → cell histogram
const sessionRollups: SessionRollup[] = [];

function bucketKey(c: FactualClaimLite): string {
  const v: Verdict =
    typeof c.verdict === "string" && (VERDICTS as readonly string[]).includes(c.verdict)
      ? (c.verdict as Verdict)
      : "other";
  const cf: Confidence =
    typeof c.confidence === "string" && (CONFIDENCES as readonly string[]).includes(c.confidence)
      ? (c.confidence as Confidence)
      : "other";
  return `${v}|${cf}`;
}

function categoryOf(c: FactualClaimLite): string {
  return typeof c.category === "string" ? c.category : "uncategorized";
}

function listDirsSafe(p: string): string[] {
  try {
    return readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory());
  } catch {
    return [];
  }
}

let scannedFiles = 0;
let scannedSessions = 0;

for (const sessionId of readdirSync(logsDir)) {
  const sessionPath = join(logsDir, sessionId);
  if (!statSync(sessionPath).isDirectory()) continue;
  if (!sessionId.startsWith("generate-")) continue;

  scannedSessions++;
  let sessionTotal = 0;
  let sessionAccurateHigh = 0;

  for (const round of listDirsSafe(sessionPath)) {
    if (!round.startsWith("round-")) continue;
    const graphPath = join(sessionPath, round, "reference-graph.json");
    if (!existsSync(graphPath)) continue;
    let graph: { claims?: FactualClaimLite[] };
    try {
      graph = JSON.parse(readFileSync(graphPath, "utf-8"));
    } catch {
      continue;
    }
    if (!Array.isArray(graph.claims)) continue;
    scannedFiles++;
    for (const claim of graph.claims) {
      const key = bucketKey(claim);
      grandHistogram.set(key, (grandHistogram.get(key) ?? 0) + 1);
      const cat = categoryOf(claim);
      let bucket = perCategory.get(cat);
      if (!bucket) {
        bucket = new Map();
        perCategory.set(cat, bucket);
      }
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
      sessionTotal++;
      if (key === "accurate|high") sessionAccurateHigh++;
    }
  }

  if (sessionTotal > 0) {
    sessionRollups.push({
      sessionId,
      totalClaims: sessionTotal,
      accurateHigh: sessionAccurateHigh,
    });
  }
}

const totalClaims = [...grandHistogram.values()].reduce((a, b) => a + b, 0);

console.log(`# R11 — Verifier verdict-distribution audit\n`);
console.log(
  `Scanned ${scannedSessions} session(s), ${scannedFiles} reference-graph(s), ${totalClaims} total claim(s).\n`
);

function pct(n: number, d: number): string {
  if (d === 0) return "  -  ";
  return `${((n / d) * 100).toFixed(1).padStart(5, " ")}%`;
}

console.log("## Grand histogram — (verdict, confidence)\n");
console.log("| verdict             | high      | medium    | low       | unverif.  | other     | total     |");
console.log("|---------------------|-----------|-----------|-----------|-----------|-----------|-----------|");
const verdictsToShow: Verdict[] = [...VERDICTS, "other"];
const confsToShow: Confidence[] = [...CONFIDENCES, "other"];
for (const v of verdictsToShow) {
  let row = `| ${v.padEnd(20)}|`;
  let rowTotal = 0;
  for (const cf of confsToShow) {
    const n = grandHistogram.get(`${v}|${cf}`) ?? 0;
    rowTotal += n;
    row += ` ${String(n).padStart(4)} ${pct(n, totalClaims)} |`;
  }
  row += ` ${String(rowTotal).padStart(4)} ${pct(rowTotal, totalClaims)} |`;
  console.log(row);
}
console.log();

const accurateHigh = grandHistogram.get("accurate|high") ?? 0;
const accurateMedium = grandHistogram.get("accurate|medium") ?? 0;
const partiallyAny =
  (grandHistogram.get("partially_accurate|high") ?? 0) +
  (grandHistogram.get("partially_accurate|medium") ?? 0) +
  (grandHistogram.get("partially_accurate|low") ?? 0) +
  (grandHistogram.get("partially_accurate|unverifiable") ?? 0);

console.log("## Key cells\n");
console.log(`(accurate, high):              ${accurateHigh} (${pct(accurateHigh, totalClaims).trim()})`);
console.log(`(accurate, medium):            ${accurateMedium} (${pct(accurateMedium, totalClaims).trim()})`);
console.log(`(partially_accurate, *):       ${partiallyAny} (${pct(partiallyAny, totalClaims).trim()})`);
const broadenedSet = accurateHigh + accurateMedium + partiallyAny;
console.log(`Broadened tally (sum above):   ${broadenedSet} (${pct(broadenedSet, totalClaims).trim()})`);
console.log();

console.log("## Per-session 'stuck-at-(accurate, high)' rate\n");
console.log("| session                                          | claims | acc-hi | rate   |");
console.log("|--------------------------------------------------|--------|--------|--------|");
const sortedSessions = [...sessionRollups].sort((a, b) => b.totalClaims - a.totalClaims);
const top = sortedSessions.slice(0, 20);
for (const s of top) {
  console.log(
    `| ${s.sessionId.padEnd(48)} | ${String(s.totalClaims).padStart(6)} | ${String(s.accurateHigh).padStart(6)} | ${pct(s.accurateHigh, s.totalClaims)} |`
  );
}
if (sortedSessions.length > 20) {
  console.log(`| ... ${sortedSessions.length - 20} more session(s) ...                                                              |`);
}
console.log();

const sessionsWith100AcsHi = sessionRollups.filter((s) => s.accurateHigh === s.totalClaims).length;
const sessionsWithGE90 = sessionRollups.filter((s) => s.totalClaims > 0 && s.accurateHigh / s.totalClaims >= 0.9).length;
const sessionsWithLT50 = sessionRollups.filter((s) => s.totalClaims > 0 && s.accurateHigh / s.totalClaims < 0.5).length;

console.log("## Aggregate session statistics\n");
console.log(`Sessions with 100% (accurate, high):    ${sessionsWith100AcsHi} / ${sessionRollups.length}`);
console.log(`Sessions with >=90% (accurate, high):   ${sessionsWithGE90} / ${sessionRollups.length}`);
console.log(`Sessions with <50% (accurate, high):    ${sessionsWithLT50} / ${sessionRollups.length}`);
console.log();

console.log("## Verdict\n");
const stuckRate = totalClaims > 0 ? accurateHigh / totalClaims : 0;
if (stuckRate >= 0.9) {
  console.log(
    `(accurate, high) accounts for ${(stuckRate * 100).toFixed(1)}% of all claims. ` +
      `R10-C's hypothesis is CONFIRMED: the verifier strongly under-uses lower-confidence and partially-accurate ` +
      `verdicts, starving the partial-coverage heuristic. ` +
      `Recommended action: broaden the lore_coverage_partial tally to also count (accurate, medium) and ` +
      `(partially_accurate, *), which would expand the input set from ${accurateHigh} to ${broadenedSet} claims ` +
      `(+${broadenedSet - accurateHigh}, +${(((broadenedSet - accurateHigh) / accurateHigh) * 100).toFixed(0)}%).`
  );
} else if (stuckRate >= 0.7) {
  console.log(
    `(accurate, high) accounts for ${(stuckRate * 100).toFixed(1)}% of claims — high but not overwhelming. ` +
      `R10-C's hypothesis is PARTIALLY confirmed; the broadened tally would add ${broadenedSet - accurateHigh} more claims. ` +
      `Worth doing if (accurate, medium) and (partially_accurate, *) tend to indicate genuinely weaker coverage.`
  );
} else {
  console.log(
    `(accurate, high) accounts for only ${(stuckRate * 100).toFixed(1)}% of claims. ` +
      `R10-C's hypothesis is REFUTED at scale; the verdict distribution is more diverse than the 3-session R10-C sample suggested. ` +
      `The partial-coverage heuristic's narrow tally is probably not the bottleneck. Investigate elsewhere.`
  );
}
