import { describe, it, expect, mock, beforeEach } from "bun:test";

// In-memory fetch stub that the test refills before each test.
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

import { verifyCitations, type VerifyCitationsInput } from "./verify-citations";

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
});
