#!/usr/bin/env bun
/**
 * R11 supplementary — per-category verdict-distribution.
 *
 * The grand histogram (r11-verdict-audit.ts) showed (accurate, high)
 * accounts for 80.5% of all claims across the corpus. But that's an
 * average; the question we actually care about for source-checker.ts
 * is whether this is uniform across categories or whether some
 * categories (e.g. linguistic, geographic) get more scepticism than
 * others (e.g. historical, cultural).
 *
 * If the bias is uniform, broadening the tally the same way for every
 * category is fine. If it is NOT uniform — e.g. scientific claims
 * routinely get (partially_accurate, *) while historical claims are
 * almost always (accurate, high) — then a category-specific fix is
 * smarter than a global broadening.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

interface FactualClaimLite {
  category?: string;
  verdict?: string;
  confidence?: string;
}

const logsDir = process.argv[2] ?? "logs";
const perCategory = new Map<string, Map<string, number>>();

function listDirsSafe(p: string): string[] {
  try {
    return readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory());
  } catch {
    return [];
  }
}

for (const sessionId of readdirSync(logsDir)) {
  const sessionPath = join(logsDir, sessionId);
  if (!statSync(sessionPath).isDirectory()) continue;
  if (!sessionId.startsWith("generate-")) continue;
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
    for (const claim of graph.claims) {
      const cat = typeof claim.category === "string" ? claim.category : "uncategorized";
      const v = typeof claim.verdict === "string" ? claim.verdict : "?";
      const cf = typeof claim.confidence === "string" ? claim.confidence : "?";
      const key = `${v}|${cf}`;
      let bucket = perCategory.get(cat);
      if (!bucket) {
        bucket = new Map();
        perCategory.set(cat, bucket);
      }
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
    }
  }
}

console.log("# R11 — Per-category verdict distribution\n");

interface Row {
  category: string;
  total: number;
  accurateHigh: number;
  accurateMedium: number;
  partiallyAny: number;
  inaccurateHigh: number;
  needsResearch: number;
}

const rows: Row[] = [];
for (const [cat, hist] of perCategory) {
  let total = 0;
  for (const v of hist.values()) total += v;
  const accurateHigh = hist.get("accurate|high") ?? 0;
  const accurateMedium = hist.get("accurate|medium") ?? 0;
  const partiallyAny =
    (hist.get("partially_accurate|high") ?? 0) +
    (hist.get("partially_accurate|medium") ?? 0) +
    (hist.get("partially_accurate|low") ?? 0) +
    (hist.get("partially_accurate|unverifiable") ?? 0);
  const inaccurateHigh = hist.get("inaccurate|high") ?? 0;
  const needsResearch =
    (hist.get("needs_research|high") ?? 0) +
    (hist.get("needs_research|medium") ?? 0) +
    (hist.get("needs_research|low") ?? 0) +
    (hist.get("needs_research|unverifiable") ?? 0);
  rows.push({
    category: cat,
    total,
    accurateHigh,
    accurateMedium,
    partiallyAny,
    inaccurateHigh,
    needsResearch,
  });
}
rows.sort((a, b) => b.total - a.total);

function pct(n: number, d: number): string {
  if (d === 0) return "  -  ";
  return `${((n / d) * 100).toFixed(0).padStart(3, " ")}%`;
}

console.log("| category       | total | acc-hi    | acc-med   | part-acc  | inacc-hi  | needs-res |");
console.log("|----------------|-------|-----------|-----------|-----------|-----------|-----------|");
for (const r of rows) {
  console.log(
    `| ${r.category.padEnd(14)} | ${String(r.total).padStart(5)} | ${String(r.accurateHigh).padStart(3)} (${pct(r.accurateHigh, r.total)}) | ${String(r.accurateMedium).padStart(3)} (${pct(r.accurateMedium, r.total)}) | ${String(r.partiallyAny).padStart(3)} (${pct(r.partiallyAny, r.total)}) | ${String(r.inaccurateHigh).padStart(3)} (${pct(r.inaccurateHigh, r.total)}) | ${String(r.needsResearch).padStart(3)} (${pct(r.needsResearch, r.total)}) |`
  );
}
console.log();

// Categories where (accurate, high) dominates AND there's no diversity
// at all are the ones where broadening does nothing useful.
console.log("## Categories with no diversity beyond (accurate, high)\n");
const monoculture = rows.filter(
  (r) => r.total >= 5 && r.accurateMedium === 0 && r.partiallyAny === 0 && r.needsResearch === 0
);
if (monoculture.length === 0) {
  console.log("None — every category with >=5 claims has SOME verdict diversity.");
} else {
  for (const r of monoculture) {
    console.log(`- ${r.category}: ${r.accurateHigh}/${r.total} = 100% (accurate, high), 0 diversity`);
  }
}
console.log();

console.log("## Categories where broadening would help\n");
const wouldHelp = rows.filter(
  (r) => r.total >= 3 && (r.accurateMedium + r.partiallyAny) >= 2
);
if (wouldHelp.length === 0) {
  console.log("None — no category has >=2 lower-confidence claims.");
} else {
  for (const r of wouldHelp) {
    const broadenedDelta = r.accurateMedium + r.partiallyAny;
    console.log(
      `- ${r.category}: would add ${broadenedDelta} claim(s) to the tally (currently ${r.accurateHigh})`
    );
  }
}
