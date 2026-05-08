/**
 * verify-citations: independently audit the `references` namespace of a
 * loreDb by checking each cited URL (HEAD/GET) and each PubMed PMID
 * (eutils esummary) against the actual paper title. This catches LLM
 * fabrications such as off-by-one PMIDs, dead URLs, and made-up papers
 * that grounded auto-research can still produce.
 *
 * Hermetic by design: all network I/O goes through global `fetch`, which
 * tests stub out. The CLI subcommand `verify-citations` calls this module.
 */

const URL_REGEX = /https?:\/\/[^\s)>"\u3000\u300d\u300f\u3011]+/g;
// Matches "PMID 12345678", "PubMed PMID 12345678", "PMID: 12345678", etc.
// PubMed PMIDs are 1-9 digits historically; we accept up to 11 digits to
// be future-proof. We deliberately do NOT trim leading zeros — the eutils
// API uses the exact string the caller supplies.
const PMID_REGEX = /(?:PubMed\s+)?PMID[:\s]+(\d{1,11})/gi;

const PUBMED_ESUMMARY_BASE =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=";

export interface ReferenceEntry {
  fact: string;
  source: string;
  addedAt: string;
  originalClaim: string;
  originalLocation: string;
  // Optional fields written by patches like the verify-citations audit.
  verifiedAt?: string;
  [k: string]: unknown;
}

export interface VerifyCitationsInput {
  loreDb: { references?: Record<string, ReferenceEntry>; [k: string]: unknown };
  /**
   * If provided, each fetch is given this AbortController-wrapped timeout.
   * Defaults to 15_000 ms.
   */
  timeoutMs?: number;
}

export type UrlStatus = "live" | "dead" | "error";
export type PmidStatus = "match" | "mismatch" | "not_found" | "error";
export type OverallStatus = "verified" | "partial" | "broken" | "unverifiable";

export interface UrlCheck {
  url: string;
  status: UrlStatus;
  httpStatus?: number;
  error?: string;
}

export interface PmidCheck {
  pmid: string;
  status: PmidStatus;
  actualTitle?: string;
  actualAuthors?: string[];
  actualYear?: string;
  citedContext?: string;
  error?: string;
}

export interface ReferenceReport {
  refKey: string;
  source: string;
  urlChecks: UrlCheck[];
  pmidChecks: PmidCheck[];
  overall: OverallStatus;
}

export interface VerifyCitationsReport {
  references: ReferenceReport[];
  summary: {
    total: number;
    verified: number;
    partial: number;
    broken: number;
    unverifiable: number;
  };
}

export async function verifyCitations(
  input: VerifyCitationsInput,
): Promise<VerifyCitationsReport> {
  const refs = input.loreDb.references ?? {};
  const timeoutMs = input.timeoutMs ?? 15_000;
  const reports: ReferenceReport[] = [];

  for (const [refKey, entry] of Object.entries(refs)) {
    const source = entry.source ?? "";
    const urlChecks = await checkUrls(extractUrls(source), timeoutMs);
    const pmidChecks = await checkPmids(extractPmids(source), source, timeoutMs);

    reports.push({
      refKey,
      source,
      urlChecks,
      pmidChecks,
      overall: classify(urlChecks, pmidChecks),
    });
  }

  const summary = {
    total: reports.length,
    verified: reports.filter((r) => r.overall === "verified").length,
    partial: reports.filter((r) => r.overall === "partial").length,
    broken: reports.filter((r) => r.overall === "broken").length,
    unverifiable: reports.filter((r) => r.overall === "unverifiable").length,
  };

  return { references: reports, summary };
}

// ---------- internals ----------

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  // Strip trailing punctuation that often appears next to URLs in prose.
  return matches.map((u) => u.replace(/[),.;:!?'"\u3001\u3002]+$/, ""));
}

export function extractPmids(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  // Reset lastIndex defensively — caller may reuse the regex.
  PMID_REGEX.lastIndex = 0;
  while ((m = PMID_REGEX.exec(text)) !== null) {
    out.push(m[1]!);
  }
  return out;
}

async function checkUrls(urls: string[], timeoutMs: number): Promise<UrlCheck[]> {
  const out: UrlCheck[] = [];
  for (const url of urls) {
    try {
      const resp = await fetchWithTimeout(url, timeoutMs);
      out.push({
        url,
        status: resp.ok ? "live" : "dead",
        httpStatus: resp.status,
      });
    } catch (e) {
      out.push({
        url,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}

async function checkPmids(
  pmids: string[],
  source: string,
  timeoutMs: number,
): Promise<PmidCheck[]> {
  const out: PmidCheck[] = [];
  for (const pmid of pmids) {
    try {
      const resp = await fetchWithTimeout(
        PUBMED_ESUMMARY_BASE + pmid,
        timeoutMs,
      );
      if (!resp.ok) {
        out.push({ pmid, status: "error", error: `HTTP ${resp.status}` });
        continue;
      }
      const json = (await resp.json()) as {
        result?: Record<string, { title?: string; authors?: Array<{ name: string }>; pubdate?: string; source?: string }>;
      };
      const paper = json.result?.[pmid];
      if (!paper || !paper.title) {
        out.push({ pmid, status: "not_found" });
        continue;
      }
      const status: PmidStatus = titlesMatch(paper.title, source) ? "match" : "mismatch";
      out.push({
        pmid,
        status,
        actualTitle: paper.title,
        actualAuthors: paper.authors?.map((a) => a.name) ?? [],
        actualYear: paper.pubdate,
      });
    } catch (e) {
      out.push({ pmid, status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}

/**
 * Heuristic: a cited title "matches" the actual title if at least 2 of
 * the actual title's content words (length >= 5, lowercased) appear in
 * the source string. This is intentionally lenient — exact-string
 * matching fails on punctuation and word-order differences.
 */
export function titlesMatch(actualTitle: string, citedSource: string): boolean {
  const stopwords = new Set([
    "with", "from", "into", "onto", "after", "before", "during",
    "their", "there", "where", "which", "while", "would", "could", "should",
    "about", "above", "below", "again", "between", "other", "those", "these",
  ]);
  const actualWords = actualTitle
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 5 && !stopwords.has(w));
  if (actualWords.length === 0) return false;
  const cited = citedSource.toLowerCase();
  const hits = actualWords.filter((w) => cited.includes(w)).length;
  return hits >= 2;
}

function classify(urlChecks: UrlCheck[], pmidChecks: PmidCheck[]): OverallStatus {
  const totalChecks = urlChecks.length + pmidChecks.length;
  if (totalChecks === 0) return "unverifiable";

  const goodChecks =
    urlChecks.filter((u) => u.status === "live").length +
    pmidChecks.filter((p) => p.status === "match").length;
  const badChecks =
    urlChecks.filter((u) => u.status === "dead").length +
    pmidChecks.filter((p) => p.status === "mismatch" || p.status === "not_found").length;

  if (badChecks > 0 && goodChecks === 0) return "broken";
  if (badChecks > 0) return "partial";
  if (goodChecks === totalChecks) return "verified";
  // Only "error" results — treat as unverifiable rather than broken.
  return "unverifiable";
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Render a VerifyCitationsReport as human-readable terminal text with
 * ANSI color codes. Used by the CLI subcommand.
 */
export function formatReport(report: VerifyCitationsReport): string {
  const c = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
  };
  const lines: string[] = [];
  lines.push(`${c.bold}=== Citation Audit Report ===${c.reset}`);
  for (const ref of report.references) {
    const tag =
      ref.overall === "verified" ? `${c.green}✓ VERIFIED${c.reset}` :
      ref.overall === "partial" ? `${c.yellow}△ PARTIAL${c.reset}` :
      ref.overall === "broken" ? `${c.red}✗ BROKEN${c.reset}` :
      `${c.dim}? UNVERIFIABLE${c.reset}`;
    lines.push("");
    lines.push(`${tag}  ${c.cyan}${ref.refKey}${c.reset}`);
    for (const u of ref.urlChecks) {
      const symbol =
        u.status === "live" ? `${c.green}✓${c.reset}` :
        u.status === "dead" ? `${c.red}✗${c.reset}` :
        `${c.yellow}!${c.reset}`;
      const detail = u.httpStatus ? `HTTP ${u.httpStatus}` : (u.error ?? "?");
      lines.push(`    ${symbol} URL ${u.url}  [${detail}]`);
    }
    for (const p of ref.pmidChecks) {
      const symbol =
        p.status === "match" ? `${c.green}✓${c.reset}` :
        p.status === "mismatch" ? `${c.red}✗${c.reset}` :
        p.status === "not_found" ? `${c.red}∅${c.reset}` :
        `${c.yellow}!${c.reset}`;
      const head = `${symbol} PMID ${p.pmid} [${p.status}]`;
      lines.push("    " + head);
      if (p.actualTitle) {
        lines.push(`        actual: ${p.actualTitle}`);
        if (p.actualAuthors && p.actualAuthors.length > 0) {
          lines.push(`        authors: ${p.actualAuthors.slice(0, 3).join(", ")}${p.actualAuthors.length > 3 ? ", et al." : ""}`);
        }
        if (p.actualYear) lines.push(`        year: ${p.actualYear}`);
      }
    }
  }
  lines.push("");
  lines.push(`${c.bold}Summary:${c.reset}  ${report.summary.total} refs  |  ` +
    `${c.green}${report.summary.verified} verified${c.reset}  ` +
    `${c.yellow}${report.summary.partial} partial${c.reset}  ` +
    `${c.red}${report.summary.broken} broken${c.reset}  ` +
    `${c.dim}${report.summary.unverifiable} unverifiable${c.reset}`);
  return lines.join("\n");
}
