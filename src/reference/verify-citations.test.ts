import { describe, it, expect, mock, beforeEach } from "bun:test";

// ---------- LLM mock (for the verbatim-quote verifier) ----------

let mockGroundedResponses: Array<{ text: string; sources: Array<{ title?: string; uri?: string }> }> = [];
let mockGroundedCalls = 0;

mock.module("../llm", () => ({
  MODELS: {
    REFINER: "gemini-3.1-flash-lite-preview",
    CRITIC: "gemini-3.1-pro-preview",
    GENERATOR: "gemini-3.1-pro-preview",
    EVALUATOR: "gemini-3.1-flash-lite-preview",
  },
  generateGroundedContent: mock(async () => {
    const next = mockGroundedResponses.shift();
    if (!next) throw new Error("Test: ran out of mock grounded LLM responses");
    mockGroundedCalls++;
    return next;
  }),
}));

// ---------- fetch mock (for URL/PMID checks) ----------

type StubResponse = {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};
let fetchStubs: Map<string, StubResponse> = new Map();
let fetchCalls: string[] = [];

const fetchMock = mock(async (input: string | URL | Request) => {
  const url = typeof input === "string" ? input : input.toString();
  fetchCalls.push(url);
  // Match exact URL first, then prefix match.
  const exact = fetchStubs.get(url);
  if (exact) return exact as unknown as Response;
  for (const [pattern, resp] of fetchStubs) {
    if (url.startsWith(pattern)) return resp as unknown as Response;
  }
  // Default 404.
  return {
    ok: false,
    status: 404,
    text: async () => "not stubbed",
  } as unknown as Response;
});

// Patch global fetch for the duration of the test module.
(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

import { verifyCitations, extractQuotes, type VerifyCitationsInput } from "./verify-citations";

function loreWithRef(refKey: string, source: string): VerifyCitationsInput {
  return {
    loreDb: {
      references: {
        [refKey]: {
          fact: "some fact",
          source,
          addedAt: "2026-05-08T00:00:00Z",
          originalClaim: "some claim",
          originalLocation: "p1",
        },
      },
    },
  };
}

describe("verifyCitations", () => {
  beforeEach(() => {
    fetchStubs = new Map();
    fetchCalls = [];
    mockGroundedResponses = [];
    mockGroundedCalls = 0;
  });

  //#given a reference whose source contains a single live URL
  //#when verifyCitations runs
  //#then the URL is reported as live and the reference status is "verified"
  it("marks live URLs as verified", async () => {
    fetchStubs.set("https://example.com/article", { ok: true, status: 200 });
    const input = loreWithRef("scientific:phonebook", "Medscape, https://example.com/article verified.");

    const report = await verifyCitations(input);

    expect(report.references.length).toBe(1);
    const ref = report.references[0]!;
    expect(ref.urlChecks.length).toBe(1);
    expect(ref.urlChecks[0]!.status).toBe("live");
    expect(ref.urlChecks[0]!.url).toBe("https://example.com/article");
    expect(ref.overall).toBe("verified");
  });

  //#given a reference whose source contains a 404 URL
  //#when verifyCitations runs
  //#then the URL is reported as dead and the reference is "broken"
  it("flags dead URLs as broken", async () => {
    fetchStubs.set("https://moe.gov.cn/dead", { ok: false, status: 404 });
    const input = loreWithRef("hist:art40", "MoE: https://moe.gov.cn/dead and other text.");

    const report = await verifyCitations(input);

    expect(report.references[0]!.urlChecks[0]!.status).toBe("dead");
    expect(report.references[0]!.urlChecks[0]!.httpStatus).toBe(404);
    expect(report.references[0]!.overall).toBe("broken");
  });

  //#given a reference with mixed live and dead URLs
  //#when verifyCitations runs
  //#then both URLs are reported individually and overall is "partial"
  it("reports each URL individually with overall=partial when mixed", async () => {
    fetchStubs.set("https://good.example.com/", { ok: true, status: 200 });
    fetchStubs.set("https://bad.example.com/", { ok: false, status: 500 });
    const input = loreWithRef(
      "mix",
      "See https://good.example.com/ and https://bad.example.com/ for details.",
    );

    const report = await verifyCitations(input);

    expect(report.references[0]!.urlChecks.length).toBe(2);
    expect(report.references[0]!.overall).toBe("partial");
  });

  //#given a reference with a PubMed PMID where the actual paper title matches the cited title
  //#when verifyCitations runs and the eutils API returns the paper
  //#then the PMID check is "match" and contributes to verification
  it("verifies PMIDs whose actual title matches the cited title", async () => {
    // The cited claim mentions Andre F + breast cancer + synchronous.
    // PubMed eutils returns matching title.
    fetchStubs.set(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=15310773",
      {
        ok: true,
        status: 200,
        json: async () => ({
          result: {
            "15310773": {
              title: "Breast cancer with synchronous metastases: trends in survival during a 14-year period.",
              authors: [{ name: "Andre F" }, { name: "Slimane K" }],
              pubdate: "2004 Aug 15",
              source: "J Clin Oncol",
            },
          },
        }),
      },
    );
    const input = loreWithRef(
      "sci:bc",
      "Andre F et al. Breast cancer with synchronous metastases, JCO 2004, PMID 15310773.",
    );

    const report = await verifyCitations(input);

    const pmidCheck = report.references[0]!.pmidChecks[0]!;
    expect(pmidCheck.pmid).toBe("15310773");
    expect(pmidCheck.status).toBe("match");
    expect(pmidCheck.actualTitle).toContain("synchronous metastases");
  });

  //#given a PMID that exists but whose actual paper has a totally unrelated title
  //#when verifyCitations runs
  //#then the PMID check is "mismatch" and the reference is flagged
  it("detects PMID mismatches (cited vs. actual title)", async () => {
    fetchStubs.set(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=21621416",
      {
        ok: true,
        status: 200,
        json: async () => ({
          result: {
            "21621416": {
              title: "Resumption of JRR-4 and characteristics of neutron beam for BNCT.",
              authors: [{ name: "Yamamoto T" }],
              pubdate: "2011",
              source: "Appl Radiat Isot",
            },
          },
        }),
      },
    );
    const input = loreWithRef(
      "sci:bhoo",
      "Bhoo-Pathy N et al. Breast cancer survival in a multi-ethnic Asian setting (2011), PMID 21621416.",
    );

    const report = await verifyCitations(input);

    const pmidCheck = report.references[0]!.pmidChecks[0]!;
    expect(pmidCheck.status).toBe("mismatch");
    expect(report.references[0]!.overall).toBe("broken");
  });

  //#given a PMID that doesn't exist on PubMed
  //#when verifyCitations runs and eutils returns no result
  //#then the PMID check is "not_found"
  it("flags PMIDs that don't exist on PubMed", async () => {
    fetchStubs.set(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=99999999999",
      {
        ok: true,
        status: 200,
        json: async () => ({ result: {} }),
      },
    );
    const input = loreWithRef("fake", "Some paper, PMID 99999999999.");

    const report = await verifyCitations(input);

    expect(report.references[0]!.pmidChecks[0]!.status).toBe("not_found");
    expect(report.references[0]!.overall).toBe("broken");
  });

  //#given a reference with no URLs and no PMIDs
  //#when verifyCitations runs
  //#then it reports "unverifiable" — neither verified nor broken
  it("returns 'unverifiable' for refs with no URL or PMID at all", async () => {
    const input = loreWithRef("plain", "Some textbook, page 42.");

    const report = await verifyCitations(input);

    expect(report.references[0]!.urlChecks.length).toBe(0);
    expect(report.references[0]!.pmidChecks.length).toBe(0);
    expect(report.references[0]!.overall).toBe("unverifiable");
  });

  //#given multiple references in the loreDb
  //#when verifyCitations runs
  //#then the report aggregates summary counts correctly
  it("produces an aggregate summary across all references", async () => {
    fetchStubs.set("https://live.example.com/", { ok: true, status: 200 });
    fetchStubs.set("https://dead.example.com/", { ok: false, status: 404 });
    const input: VerifyCitationsInput = {
      loreDb: {
        references: {
          a: {
            fact: "f1",
            source: "https://live.example.com/",
            addedAt: "x",
            originalClaim: "c1",
            originalLocation: "p1",
          },
          b: {
            fact: "f2",
            source: "https://dead.example.com/",
            addedAt: "x",
            originalClaim: "c2",
            originalLocation: "p2",
          },
          c: {
            fact: "f3",
            source: "no urls here",
            addedAt: "x",
            originalClaim: "c3",
            originalLocation: "p3",
          },
        },
      },
    };

    const report = await verifyCitations(input);

    expect(report.summary.total).toBe(3);
    expect(report.summary.verified).toBe(1);
    expect(report.summary.broken).toBe(1);
    expect(report.summary.unverifiable).toBe(1);
  });

  //#given a loreDb with no `references` key at all
  //#when verifyCitations runs
  //#then it returns an empty report without throwing
  it("handles loreDbs with no references namespace gracefully", async () => {
    const report = await verifyCitations({ loreDb: { other: {} } });
    expect(report.references.length).toBe(0);
    expect(report.summary.total).toBe(0);
  });

  // ---------- Verbatim-quote verification ----------

  //#given a source field containing English-double-quoted text and Chinese 「...」 quotes
  //#when extractQuotes runs
  //#then both quote forms are extracted, each ≥ MIN_QUOTE_LEN chars
  it("extractQuotes pulls verbatim quotes from English and Chinese typography", () => {
    const source =
      'See "The president shall be a citizen who meets the qualifications" in the law. ' +
      "Also: 「高等学校的校长由符合教育法规定的任职条件的公民担任」 quoted from npc.gov.cn.";
    const quotes = extractQuotes(source);
    expect(quotes.length).toBe(2);
    expect(quotes[0]).toContain("The president shall be a citizen");
    expect(quotes[1]).toContain("高等学校的校长");
  });

  //#given short quoted strings (less than minimum length)
  //#when extractQuotes runs
  //#then they are filtered out (avoids noise from "ok", "yes", filename-like strings)
  it("extractQuotes filters out short quotes (length < 20 chars)", () => {
    const source = 'He said "ok" then "yes" then "now this one is a real verbatim attestation".';
    const quotes = extractQuotes(source);
    expect(quotes.length).toBe(1);
    expect(quotes[0]).toContain("real verbatim attestation");
  });

  //#given a reference whose source contains a verbatim quote
  //#when verifyCitations runs with verifyQuotes=true and the LLM returns {verified: true, url}
  //#then the reference gets a quoteCheck with status="match" and overall="verified"
  it("verifies verbatim quotes via grounded LLM and marks the ref verified", async () => {
    mockGroundedResponses = [
      {
        text: JSON.stringify({
          verified: true,
          url: "http://www.npc.gov.cn/npc/c30834/199808/some-real-page.shtml",
        }),
        sources: [{ uri: "http://www.npc.gov.cn/npc/c30834/199808/some-real-page.shtml", title: "NPC" }],
      },
    ];
    const input: VerifyCitationsInput = {
      verifyQuotes: true,
      loreDb: {
        references: {
          "hist:art40": {
            fact: "f",
            source:
              '中华人民共和国高等教育法 (1998) 第四十条: 「高等学校的校长由符合教育法规定的任职条件的公民担任」 — verified via NPC.',
            addedAt: "x",
            originalClaim: "c",
            originalLocation: "l",
          },
        },
      },
    };

    const report = await verifyCitations(input);

    expect(mockGroundedCalls).toBe(1);
    expect(report.references[0]!.quoteChecks.length).toBe(1);
    expect(report.references[0]!.quoteChecks[0]!.status).toBe("match");
    expect(report.references[0]!.quoteChecks[0]!.foundUrl).toContain("npc.gov.cn");
    expect(report.references[0]!.overall).toBe("verified");
  });

  //#given a verbatim quote that the LLM cannot find at any source
  //#when verifyCitations runs with verifyQuotes=true and the LLM returns {verified: false}
  //#then the quoteCheck is "mismatch" and the reference is "broken"
  it("flags fabricated verbatim quotes as mismatches", async () => {
    mockGroundedResponses = [
      { text: JSON.stringify({ verified: false }), sources: [] },
    ];
    const input: VerifyCitationsInput = {
      verifyQuotes: true,
      loreDb: {
        references: {
          fake: {
            fact: "f",
            source: 'A fake citation: "this exact verbatim sentence was never published anywhere".',
            addedAt: "x",
            originalClaim: "c",
            originalLocation: "l",
          },
        },
      },
    };

    const report = await verifyCitations(input);

    expect(report.references[0]!.quoteChecks[0]!.status).toBe("mismatch");
    expect(report.references[0]!.overall).toBe("broken");
  });

  //#given a reference with no quotes
  //#when verifyCitations runs with verifyQuotes=true
  //#then the LLM is NOT called (cost gating — no quotes means nothing to verify)
  it("skips the LLM entirely when no verbatim quotes are present", async () => {
    const input: VerifyCitationsInput = {
      verifyQuotes: true,
      loreDb: {
        references: {
          plain: {
            fact: "f",
            source: "Some textbook page 42 (no quotes).",
            addedAt: "x",
            originalClaim: "c",
            originalLocation: "l",
          },
        },
      },
    };

    const report = await verifyCitations(input);

    expect(mockGroundedCalls).toBe(0);
    expect(report.references[0]!.quoteChecks.length).toBe(0);
    expect(report.references[0]!.overall).toBe("unverifiable");
  });

  //#given verifyQuotes is false (the default)
  //#when verifyCitations runs against a source with a verbatim quote
  //#then the LLM is NOT called and quoteChecks remains empty (offline mode)
  it("does not call the LLM when verifyQuotes is false (default)", async () => {
    const input: VerifyCitationsInput = {
      // verifyQuotes omitted — defaults to false
      loreDb: {
        references: {
          q: {
            fact: "f",
            source: '「高等学校的校长由符合教育法规定的任职条件的公民担任」 — quoted from somewhere.',
            addedAt: "x",
            originalClaim: "c",
            originalLocation: "l",
          },
        },
      },
    };

    const report = await verifyCitations(input);

    expect(mockGroundedCalls).toBe(0);
    expect(report.references[0]!.quoteChecks.length).toBe(0);
  });

  //#given the LLM returns malformed JSON for the quote check
  //#when verifyCitations runs
  //#then the quoteCheck is "error" but the run does not throw
  it("falls back to 'error' status when the LLM quote response is malformed", async () => {
    mockGroundedResponses = [
      { text: "not json, just prose", sources: [] },
    ];
    const input: VerifyCitationsInput = {
      verifyQuotes: true,
      loreDb: {
        references: {
          q: {
            fact: "f",
            source: '「高等学校的校长由符合教育法规定的任职条件的公民担任」 — from somewhere.',
            addedAt: "x",
            originalClaim: "c",
            originalLocation: "l",
          },
        },
      },
    };

    const report = await verifyCitations(input);

    expect(report.references[0]!.quoteChecks[0]!.status).toBe("error");
    // 'error' alone means the verification result is undetermined → unverifiable.
    expect(report.references[0]!.overall).toBe("unverifiable");
  });
});
