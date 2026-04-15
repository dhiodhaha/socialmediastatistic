interface IndividualQuarterlyPdfData {
    account: {
        id: string;
        username: string;
    };
    request: {
        platforms: string[];
        year: number;
        quarter: number;
        listingPageLimit: number;
        enrichedContentLimit: number;
    };
    estimatedCredits: {
        totalCredits: number;
    };
    actualCreditsUsed: number;
    results: Array<{
        platform: string;
        handle: string;
        success: boolean;
        error?: string;
        creditsUsed: number;
        rawItemsFetched: number;
        fetchedDateRange?: {
            earliest: string | null;
            latest: string | null;
        };
        diagnostics?: string[];
        coverage: {
            status: string;
            totalContentItems: number;
            listingPagesFetched: number;
            reachedQuarterStart: boolean;
            months: Array<{
                key: string;
                label: string;
                contentCount: number;
            }>;
            note: string;
        };
        enrichedItems: Array<{
            id: string;
            url?: string | null;
            publishedAt: string;
            textExcerpt?: string | null;
            engagementScore?: number;
            selectionReason?: string;
            metrics: {
                likes?: number | null;
                comments?: number | null;
                views?: number | null;
                shares?: number | null;
            };
        }>;
    }>;
    methodologyNotes: string[];
}

export function generateIndividualQuarterlyReportHtml({
    data,
    generatedAt,
}: {
    data: IndividualQuarterlyPdfData;
    generatedAt: string;
}) {
    const periodLabel = `Q${data.request.quarter} ${data.request.year}`;
    const successfulResults = data.results.filter((result) => result.success);
    const totalQuarterItems = successfulResults.reduce(
        (total, result) => total + result.coverage.totalContentItems,
        0,
    );
    const totalFetchedItems = successfulResults.reduce(
        (total, result) => total + result.rawItemsFetched,
        0,
    );

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Individual Quarterly Report</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17201b; font-family: "Segoe UI", Tahoma, sans-serif; background: #f5f1e8; }
    .cover { min-height: 260mm; padding: 34px; background: linear-gradient(135deg, #18392b 0%, #50745c 54%, #e5d7b8 100%); color: white; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .eyebrow { font-size: 12px; letter-spacing: .18em; text-transform: uppercase; opacity: .8; }
    h1 { margin: 18px 0 10px; font-size: 48px; line-height: 1; max-width: 760px; }
    h2 { margin: 0 0 14px; font-size: 24px; color: #18392b; }
    h3 { margin: 0 0 8px; font-size: 16px; color: #18392b; }
    .subtitle { font-size: 18px; opacity: .88; }
    .page { padding: 28px 34px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .card { border: 1px solid #d7ccb7; border-radius: 16px; background: rgba(255,255,255,.82); padding: 16px; }
    .metric-label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #66715f; }
    .metric-value { margin-top: 6px; font-size: 28px; font-weight: 750; color: #18392b; }
    .platform { margin-top: 18px; border: 1px solid #d7ccb7; border-radius: 18px; background: white; overflow: hidden; }
    .platform-head { padding: 16px 18px; background: #18392b; color: white; display: flex; justify-content: space-between; gap: 16px; }
    .platform-body { padding: 16px 18px; }
    .status { font-size: 12px; padding: 4px 9px; border-radius: 999px; background: rgba(255,255,255,.18); }
    .month-row, .content-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 8px 0; border-bottom: 1px solid #ede6d9; }
    .content-row { grid-template-columns: 110px 1fr 118px; align-items: start; }
    .muted { color: #66715f; }
    .small { font-size: 12px; }
    .diagnostic { margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: #fff2cd; color: #6f4b00; font-size: 12px; }
    .method { margin-top: 10px; padding-left: 18px; color: #4d584f; }
    .method li { margin: 6px 0; }
  </style>
</head>
<body>
  <section class="cover">
    <div>
      <div class="eyebrow">Individual Quarterly Social Media Report</div>
      <h1>${escapeHtml(data.account.username)}</h1>
      <div class="subtitle">${periodLabel} • ${data.request.platforms.map(platformLabel).join(", ")}</div>
    </div>
    <div>
      <div class="eyebrow">Generated</div>
      <div class="subtitle">${escapeHtml(generatedAt)}</div>
    </div>
  </section>

  <section class="page">
    <h2>Executive Snapshot</h2>
    <div class="grid">
      ${metricCard("Platforms", String(data.results.length))}
      ${metricCard("Quarter Items", String(totalQuarterItems))}
      ${metricCard("Fetched Items", String(totalFetchedItems))}
      ${metricCard("Credits Used", `${data.actualCreditsUsed}/${data.estimatedCredits.totalCredits}`)}
    </div>
    <div class="card" style="margin-top: 18px;">
      <h3>Methodology</h3>
      <ul class="method">
        ${data.methodologyNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </div>
  </section>

  <section class="page">
    <h2>Platform Reconstruction</h2>
    ${data.results.map(renderPlatformSection).join("")}
  </section>
</body>
</html>`;
}

function renderPlatformSection(result: IndividualQuarterlyPdfData["results"][number]) {
    const range = result.fetchedDateRange;
    return `<article class="platform">
  <div class="platform-head">
    <div>
      <strong>${platformLabel(result.platform)}</strong>
      <div class="small">@${escapeHtml(result.handle)}</div>
    </div>
    <div class="status">${escapeHtml(result.success ? result.coverage.status : "failed")}</div>
  </div>
  <div class="platform-body">
    ${
        result.error
            ? `<div class="diagnostic">${escapeHtml(result.error)}</div>`
            : `<div class="grid">
        ${metricCard("Quarter Items", String(result.coverage.totalContentItems))}
        ${metricCard("Fetched", String(result.rawItemsFetched))}
        ${metricCard("Pages", String(result.coverage.listingPagesFetched))}
        ${metricCard("Credits", String(result.creditsUsed))}
      </div>
      ${
          range?.earliest
              ? `<p class="small muted">Fetched range: ${escapeHtml(range.earliest.slice(0, 10))} to ${escapeHtml(range.latest?.slice(0, 10) || "unknown")}</p>`
              : ""
      }
      ${renderDiagnostics(result.diagnostics || [])}
      <h3 style="margin-top: 16px;">Monthly Coverage</h3>
      ${result.coverage.months
          .map(
              (month) =>
                  `<div class="month-row"><span>${escapeHtml(month.label)}</span><strong>${month.contentCount} items</strong></div>`,
          )
          .join("")}
      <h3 style="margin-top: 16px;">Selected Content For Review</h3>
      ${
          result.enrichedItems.length === 0
              ? `<p class="small muted">No quarter content was available for selected-content review.</p>`
              : result.enrichedItems.map(renderContentRow).join("")
      }`
    }
  </div>
</article>`;
}

function renderContentRow(
    item: IndividualQuarterlyPdfData["results"][number]["enrichedItems"][number],
) {
    return `<div class="content-row">
  <strong>${escapeHtml(String(item.publishedAt).slice(0, 10))}</strong>
  <div>
    <div>${escapeHtml(item.textExcerpt || item.url || item.id)}</div>
    <div class="small muted">${escapeHtml(item.selectionReason || "selected")}</div>
  </div>
  <div class="small muted">score ${item.engagementScore ?? 0}</div>
</div>`;
}

function renderDiagnostics(diagnostics: string[]) {
    if (diagnostics.length === 0) return "";
    return `<div class="diagnostic">${diagnostics.map(escapeHtml).join("<br/>")}</div>`;
}

function metricCard(label: string, value: string) {
    return `<div class="card"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`;
}

function platformLabel(platform: string) {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    if (platform === "TWITTER") return "Twitter / X";
    return platform;
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
