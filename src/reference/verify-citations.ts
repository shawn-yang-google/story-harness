/**
 * verify-citations: independently audit the `references` namespace of a
 * loreDb by checking each cited URL (HEAD/GET), each PubMed PMID (eutils
 * esummary against the actual paper title), and (optionally) each verbatim
 * quote (grounded LLM lookup against the live web). This catches LLM
 * fabrications such as off-by-one PMIDs, dead URLs, made-up papers, and
 * hallucinated quotes that grounded auto-research can still produce.
 *
 * Hermetic by design: all network I/O goes through global `fetch` (URL/PMID)
 * and `generateGroundedContent` (quotes), both of which tests stub out. The
 * CLI subcommand `verify-citations` calls this module.
 */

const URL_REGEX = /https?:\/\/[^\s)>"\u3000\u300d\u300f\u3011]+/g;
// Matches "PMID 12345678", "PubMed PMID 12345678", "PMID: 12345678", etc.
// PubMed PMIDs are 1-9 digits historically; we accept up to 11 digits to
// be future-proof. We deliberately do NOT trim leading zeros — the eutils
// API uses the exact string the caller supplies.
const PMID_REGEX = /(?:PubMed\s+)?PMID[:\s]+(\d{1,11})/gi;

const PUBMED_ESUMMARY_BASE =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=";

// Quote extraction:
//   "..."      English straight double quotes
//   "..."      English curly double quotes (U+201C/U+201D)
//   「...」     Chinese / Japanese single-line corner brackets (U+300C/U+300D)
//   『...』    Chinese / Japanese hollow corner brackets (U+300E/U+300F)
// We deliberately do NOT match single quotes ('foo') because they're
// pervasive in English prose (apostrophes, contractions) and would require
// expensive disambiguation. Quotes shorter than MIN_QUOTE_LEN are dropped to
// avoid checking trivial keywords like "ok" or "yes".
const QUOTE_REGEX = /"([^"]{1,400})"|\u201C([^\u201D]{1,400})\u201D|\u300C([^\u300D]{1,400})\u300D|\u300E([^\u300F]{1,400})\u300F/g;
const MIN_QUOTE_LEN = 20;

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
  /**
   * Opt-in: also verify verbatim quotes by calling a grounded LLM. Off by
   * default because (a) it costs LLM tokens and (b) grounding requires
   * network access. When false, refs whose only citation is a verbatim
   * quote remain "unverifiable" (the previous default behavior).
   */
  verifyQuotes?: boolean;
  /**
   * Optional LLM model id for the quote verifier. Defaults to MODELS.EVALUATOR
   * (flash-lite) since the verifier just needs yes/no judgment with grounding.
   */
  llmModel?: string;
}

export type UrlStatus = "live" | "dead" | "error";
export type PmidStatus = "match" | "mismatch" | "not_found" | "error";
export type QuoteStatus = "match" | "mismatch" | "error";
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

export interface QuoteCheck {
  /** First 80 chars of the verbatim quote, for the human-readable report. */
  quotePreview: string;
  status: QuoteStatus;
  /** URL the LLM (or its grounding sources) returned as the quote's home. */
  foundUrl?: string;
  /** Free-form raw model text — kept for debugging when status === "error". */
  rawResponse?: string;
}

export interface ReferenceReport {
  refKey: string;
  source: string;
  urlChecks: UrlCheck[];
  pmidChecks: PmidCheck[];
  quoteChecks: QuoteCheck[];
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
    const quoteChecks = input.verifyQuotes
      ? await checkQuotes(extractQuotes(source), source, input.llmModel)
      : [];

    reports.push({
      refKey,
      source,
      urlChecks,
      pmidChecks,
      quoteChecks,
      overall: classify(urlChecks, pmidChecks, quoteChecks),
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

export function extractQuotes(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  QUOTE_REGEX.lastIndex = 0;
  while ((m = QUOTE_REGEX.exec(text)) !== null) {
    // Exactly one capture group fires per alternation arm; pick the
    // first non-empty one.
    const inner = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
    if (inner.length >= MIN_QUOTE_LEN) out.push(inner);
  }
  return out;
}

async function checkQuotes(
  quotes: string[],
  source: string,
  llmModel?: string,
): Promise<QuoteCheck[]> {
  if (quotes.length === 0) return [];

  // Lazy import so the test mock for "../llm" catches this before the
  // module-level binding resolves at import time.
  const { generateGroundedContent, MODELS } = await import("../llm");
  const model = llmModel ?? MODELS.EVALUATOR;

  const out: QuoteCheck[] = [];
  for (const quote of quotes) {
    const preview = quote.slice(0, 80);
    try {
      const prompt = [
        "Use Google Search to verify whether the verbatim QUOTE below appears",
        "(or appears in substantively equivalent form) at the SOURCE described.",
        "Reply with ONE-LINE strict JSON: {\"verified\": true|false, \"url\": \"...\"}",
        "where:",
        "  - verified=true means you found the quote at an authoritative source matching the cited description.",
        "  - verified=false means the quote is not found, or only appears at unrelated/unauthoritative sources.",
        "  - url is the most authoritative URL where the quote appears (omit when verified=false).",
        "Do NOT include markdown code fences, explanation, or extra fields.",
        "",
        "QUOTE:",
        quote,
        "",
        "SOURCE DESCRIPTION (free-form, may include the source name + URL hints):",
        source,
      ].join("\n");
      const r = await generateGroundedContent(model, prompt, undefined, 0);
      const parsed = parseQuoteResponse(r.text);
      if (parsed === null) {
        out.push({ quotePreview: preview, status: "error", rawResponse: r.text.slice(0, 200) });
      } else if (parsed.verified) {
        // Prefer the LLM-supplied URL, but fall back to the first grounding source.
        const foundUrl = parsed.url ?? r.sources.find((s) => s.uri)?.uri;
        out.push({ quotePreview: preview, status: "match", foundUrl });
      } else {
        out.push({ quotePreview: preview, status: "mismatch" });
      }
    } catch (e) {
      out.push({
        quotePreview: preview,
        status: "error",
        rawResponse: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}

/**
 * Parse `{verified: bool, url?: string}` from a model response. Tolerates
 * markdown code fences (``` and ```json) and surrounding whitespace.
 * Returns null on any parse failure or shape mismatch.
 */
function parseQuoteResponse(raw: string): { verified: boolean; url?: string } | null {
  const stripped = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    const obj = JSON.parse(stripped);
    if (typeof obj?.verified !== "boolean") return null;
    return {
      verified: obj.verified,
      url: typeof obj.url === "string" ? obj.url : undefined,
    };
  } catch {
    return null;
  }
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

function classify(
  urlChecks: UrlCheck[],
  pmidChecks: PmidCheck[],
  quoteChecks: QuoteCheck[],
): OverallStatus {
  const totalChecks = urlChecks.length + pmidChecks.length + quoteChecks.length;
  if (totalChecks === 0) return "unverifiable";

  const goodChecks =
    urlChecks.filter((u) => u.status === "live").length +
    pmidChecks.filter((p) => p.status === "match").length +
    quoteChecks.filter((q) => q.status === "match").length;
  const badChecks =
    urlChecks.filter((u) => u.status === "dead").length +
    pmidChecks.filter((p) => p.status === "mismatch" || p.status === "not_found").length +
    quoteChecks.filter((q) => q.status === "mismatch").length;

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
    for (const q of ref.quoteChecks) {
      const symbol =
        q.status === "match" ? `${c.green}✓${c.reset}` :
        q.status === "mismatch" ? `${c.red}✗${c.reset}` :
        `${c.yellow}!${c.reset}`;
      const ellipsis = q.quotePreview.length === 80 ? "…" : "";
      lines.push(`    ${symbol} QUOTE "${q.quotePreview}${ellipsis}" [${q.status}]`);
      if (q.foundUrl) lines.push(`        found at: ${q.foundUrl}`);
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
