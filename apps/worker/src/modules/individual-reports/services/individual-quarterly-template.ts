interface ProfileStats {
    followers: number | null;
    following: number | null;
    totalPosts: number | null;
    isVerified: boolean | null;
    displayName: string | null;
}

interface QuarterSummaryStats {
    quarterItemCount: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    avgLikes: number | null;
    avgComments: number | null;
    avgViews: number | null;
    avgEngagementRate: number | null;
    topPost: {
        url: string | null;
        likes: number | null;
        publishedAt: string;
    } | null;
    contentTypeBreakdown: Record<string, number>;
    isPopularMode?: boolean;
}

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
        profileStats?: ProfileStats | null;
        quarterSummary?: QuarterSummaryStats | null;
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
            thumbnailUrl?: string | null;
            mediaType?: string | null;
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
    coverageLabel?: string;
    snapshotHistory?: Array<{
        platform: string;
        months: Array<{
            monthKey: string;
            label: string;
            followers: number;
            posts: number | null;
            likes: number | null;
            engagement: number | null;
        }>;
    }>;
}

interface SnapshotMonth {
    monthKey: string;
    label: string;
    followers: number;
    posts: number | null;
    likes: number | null;
    engagement: number | null;
}

export function generateIndividualQuarterlyReportHtml({
    data,
    generatedAt,
}: {
    data: IndividualQuarterlyPdfData;
    generatedAt: string;
}) {
    const periodLabel = `Q${data.request.quarter} ${data.request.year}`;
    const successfulResults = data.results.filter((r) => r.success);

    const totalQuarterItems = successfulResults.reduce((total, r) => {
        const qs = r.quarterSummary;
        if (qs?.isPopularMode) return total;
        return total + r.coverage.totalContentItems;
    }, 0);

    const totalEngagement = successfulResults.reduce(
        (total, r) =>
            total + (r.quarterSummary?.totalLikes ?? 0) + (r.quarterSummary?.totalComments ?? 0),
        0,
    );

    const snapshotMap = new Map<string, SnapshotMonth[]>();
    for (const entry of data.snapshotHistory ?? []) {
        snapshotMap.set(entry.platform, entry.months);
    }

    const platformPages = data.results
        .map((r) => renderPlatformPage(r, snapshotMap.get(r.platform)))
        .join("");

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="referrer" content="no-referrer" />
  <title>Laporan Ulasan Individual – ${escapeHtml(data.account.username)} ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      color: #0f172a;
      background: #f5f7fb;
    }

    /* ── Cover ──────────────────────────────────────────────── */
    .cover {
      height: 297mm;
      padding: 52px;
      background: linear-gradient(135deg, #18392b 0%, #50745c 54%, #e5d7b8 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
    }
    .cover-top { }
    .cover h1 {
      margin: 16px 0 10px;
      font-size: 52px;
      line-height: 1.05;
      max-width: 760px;
      font-weight: 800;
    }
    .cover-subtitle {
      font-size: 20px;
      opacity: 0.88;
      margin-top: 6px;
    }
    .cover-platforms {
      margin-top: 28px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cover-platform-badge {
      padding: 6px 16px;
      border-radius: 999px;
      background: rgba(255,255,255,0.18);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .cover-bottom { }
    .cover-eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      opacity: 0.7;
      font-weight: 700;
    }
    .cover-date { font-size: 16px; margin-top: 4px; opacity: 0.88; }

    /* ── Content pages ───────────────────────────────────────── */
    .page {
      min-height: 100vh;
      padding: 64px 52px;
      background:
        radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 28%),
        linear-gradient(180deg, #ffffff, #f8fafc);
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }

    /* ── Typography ──────────────────────────────────────────── */
    .eyebrow {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 4px;
    }
    h2 { margin: 8px 0 0; font-size: 34px; font-weight: 800; }
    h3 { margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #0f172a; }
    .muted { color: #64748b; }
    .small { font-size: 11px; }

    /* ── Section header ─────────────────────────────────────── */
    .section-header {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }
    .section-header-left { }

    /* ── Metric cards ───────────────────────────────────────── */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 20px;
    }
    .metrics-grid.col-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .metrics-grid.col-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .metrics-grid.compact { max-width: 100%; margin-top: 0; }
    .metric-card {
      background: rgba(255,255,255,0.9);
      border: 1px solid #dbe4f0;
      border-radius: 14px;
      padding: 14px 16px;
    }
    .metric-label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #64748b;
      font-weight: 700;
    }
    .metric-value {
      display: block;
      margin-top: 6px;
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
    }

    /* ── Tables ─────────────────────────────────────────────── */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #dbe4f0;
      font-size: 12px;
      margin-top: 14px;
    }
    .report-table th {
      background: #e8f0fe;
      color: #1e3a8a;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #c7d9f9;
    }
    .report-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e8eef6;
      vertical-align: top;
    }
    .report-table tr { page-break-inside: avoid; }
    .report-table tr:last-child td { border-bottom: none; }
    .report-table td.right { text-align: right; }
    .report-table td.center { text-align: center; }

    /* ── Profile bar ─────────────────────────────────────────── */
    .profile-bar {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 14px 18px;
      background: white;
      border: 1px solid #dbe4f0;
      border-radius: 14px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .profile-stat { text-align: center; }
    .profile-stat-value { font-size: 20px; font-weight: 700; color: #0f172a; }
    .profile-stat-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-top: 2px;
    }
    .profile-divider {
      width: 1px;
      height: 36px;
      background: #e2e8f0;
    }
    .profile-name { font-size: 14px; font-weight: 700; flex: 1; min-width: 0; }
    .badge-verified {
      display: inline-block;
      margin-left: 6px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 700;
    }

    /* ── Summary card ────────────────────────────────────────── */
    .summary-card {
      background: #f0f7f3;
      border: 1px solid #c4dece;
      border-radius: 14px;
      padding: 16px 18px;
      margin-top: 16px;
    }
    .summary-card h3 { color: #18392b; }

    /* ── Callout boxes ───────────────────────────────────────── */
    .callout {
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 12px;
      margin-top: 12px;
      line-height: 1.5;
    }
    .callout-warning { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; }
    .callout-info    { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

    /* ── Content type tag ────────────────────────────────────── */
    .type-tag {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* ── Breakdown tags ──────────────────────────────────────── */
    .breakdown-tags { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
    .breakdown-tag {
      padding: 3px 10px;
      border-radius: 999px;
      background: white;
      border: 1px solid #c4dece;
      color: #18392b;
      font-size: 11px;
      font-weight: 600;
    }

    /* ── Methodology ─────────────────────────────────────────── */
    .method-list {
      margin: 10px 0 0;
      padding-left: 20px;
      color: #475569;
      font-size: 12px;
    }
    .method-list li { margin: 5px 0; }

    /* ── Section divider within page ─────────────────────────── */
    .section-block { margin-top: 32px; padding-top: 12px; page-break-inside: avoid; }

    /* ── Growth charts ────────────────────────────────────────── */
    .growth-charts-row {
      display: flex;
      gap: 16px;
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .growth-chart-card {
      flex: 1;
      min-width: 0;
      background: rgba(255,255,255,0.9);
      border: 1px solid #dbe4f0;
      border-radius: 10px;
      padding: 16px;
    }
    .growth-chart-card h4 {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .growth-chart-card svg {
      width: 100%;
      height: auto;
    }
  </style>
</head>
<body>

  <!-- COVER -->
  <section class="cover">
    <div class="cover-top">
      <div class="cover-eyebrow">Laporan Ulasan Individual</div>
      <h1>${escapeHtml(data.account.username)}</h1>
      <div class="cover-subtitle">${periodLabel}</div>
      <div class="cover-platforms">
        ${data.request.platforms.map((p) => `<div class="cover-platform-badge">${escapeHtml(namaPlatform(p))}</div>`).join("")}
      </div>
    </div>
    <div class="cover-bottom">
      ${data.coverageLabel ? `<div style="margin-bottom:16px;padding:10px 16px;background:rgba(255,255,255,0.15);border-radius:10px;font-size:13px;opacity:0.92;">${escapeHtml(data.coverageLabel)}</div>` : ""}
      <div class="cover-eyebrow">Dibuat pada</div>
      <div class="cover-date">${escapeHtml(generatedAt)}</div>
    </div>
  </section>

  <!-- RINGKASAN EKSEKUTIF -->
  <section class="page">
    <div class="eyebrow">Ringkasan Eksekutif</div>
    <h2>${escapeHtml(data.account.username)} · ${periodLabel}</h2>

    <div class="metrics-grid${totalQuarterItems === 0 ? " col-2" : ""}">
      ${metricCard("Total Konten Kuartal", fmtNum(totalQuarterItems))}
      ${metricCard("Total Keterlibatan", fmtNum(totalEngagement))}
      ${metricCard("Platform Dianalisis", String(data.results.length))}
    </div>

    ${renderExecProfileTable(data.results)}

    <div class="section-block">
      <h3>Catatan Metodologi</h3>
      <ul class="method-list">
        ${data.methodologyNotes.map((n) => `<li>${escapeHtml(n.replace(/ScrapeCreators/gi, "API pihak ketiga"))}</li>`).join("")}
      </ul>
    </div>
  </section>

  <!-- PLATFORM PAGES -->
  ${platformPages}

</body>
</html>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Executive profile summary table
// ────────────────────────────────────────────────────────────────────────────
function renderExecProfileTable(results: IndividualQuarterlyPdfData["results"]) {
    const rows = results.filter((r) => r.success && r.profileStats);
    if (rows.length === 0) return "";

    return `<div class="section-block">
    <h3>Profil Akun</h3>
    <table class="report-table">
      <thead>
        <tr>
          <th>Platform</th>
          <th>Handle</th>
          <th class="right">Pengikut</th>
          <th class="right">Mengikuti</th>
          <th class="right">Total Post</th>
          <th class="right">Rata-rata ER</th>
        </tr>
      </thead>
      <tbody>
        ${rows
            .map((r) => {
                const p = r.profileStats;
                if (!p) return "";
                const er = r.quarterSummary?.avgEngagementRate;
                return `<tr>
          <td><strong>${escapeHtml(namaPlatform(r.platform))}</strong></td>
          <td class="muted">@${escapeHtml(r.handle)}${p.isVerified ? `<span class="badge-verified">✓</span>` : ""}</td>
          <td class="right"><strong>${fmtNum(p.followers)}</strong></td>
          <td class="right">${fmtNum(p.following)}</td>
          <td class="right">${fmtNum(p.totalPosts)}</td>
          <td class="right">${er != null ? `${er}%` : "—"}</td>
        </tr>`;
            })
            .join("")}
      </tbody>
    </table>
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Platform page (one page per platform)
// ────────────────────────────────────────────────────────────────────────────
function renderPlatformPage(
    result: IndividualQuarterlyPdfData["results"][number],
    snapshotMonths?: SnapshotMonth[],
) {
    const isPopular = result.quarterSummary?.isPopularMode === true;
    const kontenLabel = isPopular ? "Tweet Populer" : "Konten Kuartal";
    const kontenCount = isPopular
        ? (result.quarterSummary?.quarterItemCount ?? 0)
        : result.coverage.totalContentItems;

    const growth = snapshotMonths ? calculateQuarterGrowth(snapshotMonths) : null;
    const headerMetrics = buildHeaderMetrics(result, kontenLabel, kontenCount, growth);

    return `<section class="page">
    <div class="eyebrow">Detail Platform</div>
    <div class="section-header">
      <div class="section-header-left">
        <div class="eyebrow">${escapeHtml(namaStatusCoverage(result.coverage.status, isPopular))}</div>
        <h2>${escapeHtml(namaPlatform(result.platform))}</h2>
        <div class="muted small" style="margin-top:4px;">@${escapeHtml(result.handle)}</div>
      </div>
      <div class="metrics-grid compact">
        ${headerMetrics}
      </div>
    </div>

    ${result.error ? renderError(result.error) : ""}

    ${!result.error ? renderPlatformBody(result, isPopular, snapshotMonths) : ""}
  </section>`;
}

function buildHeaderMetrics(
    result: IndividualQuarterlyPdfData["results"][number],
    kontenLabel: string,
    kontenCount: number,
    growth: QuarterGrowthSummary | null,
): string {
    const qs = result.quarterSummary;
    const ps = result.profileStats;
    const cards: string[] = [];

    cards.push(metricCard(kontenLabel, fmtNum(kontenCount)));

    const totalEng = (qs?.totalLikes ?? 0) + (qs?.totalComments ?? 0);
    cards.push(metricCard("Total Keterlibatan", fmtNum(totalEng)));

    if (ps?.followers != null) {
        cards.push(metricCard("Pengikut", fmtNum(ps.followers)));
    }
    cards.push(metricCard("Kenaikan Pengikut", formatPercent(growth?.followersPct ?? null)));
    cards.push(metricCard("Kenaikan Interaksi", formatPercent(growth?.interactionPct ?? null)));
    if (qs?.avgEngagementRate != null) {
        cards.push(metricCard("Rata-rata ER", `${qs.avgEngagementRate}%`));
    }

    return cards.join("");
}

function renderPlatformBody(
    result: IndividualQuarterlyPdfData["results"][number],
    isPopular: boolean,
    snapshotMonths?: SnapshotMonth[],
) {
    const parts: string[] = [];

    // Profile bar
    if (result.profileStats) {
        parts.push(renderProfileBar(result.profileStats));
    }

    // Growth charts (side-by-side)
    if (snapshotMonths && snapshotMonths.length >= 2) {
        parts.push(renderGrowthCharts(result.platform, snapshotMonths));
    }

    // Diagnostics (non-popular, or info callout for popular)
    const diags = (result.diagnostics ?? []).filter(Boolean);
    if (isPopular) {
        parts.push(renderPopularModeNote(result.rawItemsFetched));
    } else if (diags.length > 0) {
        parts.push(
            `<div class="callout callout-warning">${diags.map(escapeHtml).join("<br/>")}</div>`,
        );
    }

    // Quarter summary stats
    if (result.quarterSummary) {
        parts.push(renderSummaryCard(result.quarterSummary, isPopular));
    }

    // Monthly distribution — skip for Twitter popular mode
    if (!isPopular && result.coverage.months.length > 0) {
        parts.push(renderMonthlyTable(result.coverage.months));
    }

    // Selected content / popular tweets
    if (result.enrichedItems.length > 0) {
        parts.push(renderContentTable(result.enrichedItems, isPopular));
    } else {
        parts.push(
            `<div class="section-block"><p class="muted small">Tidak ada konten tersedia untuk ditampilkan.</p></div>`,
        );
    }

    return parts.join("");
}

function renderError(error: string) {
    const clean = error
        .replace(/API_ERROR_\d+:\s*/gi, "Gagal mengambil data: ")
        .replace(/Internal Server Error/gi, "kesalahan server internal");
    return `<div class="callout callout-warning">${escapeHtml(clean)}</div>`;
}

function renderProfileBar(p: ProfileStats) {
    const items: string[] = [];

    if (p.displayName) {
        items.push(
            `<div class="profile-name">${escapeHtml(p.displayName)}${p.isVerified ? `<span class="badge-verified">✓ Terverifikasi</span>` : ""}</div>`,
        );
    }

    const stats: Array<[string, number | null]> = [
        ["Pengikut", p.followers],
        ["Mengikuti", p.following],
        ["Total Post", p.totalPosts],
    ];

    let firstStat = true;
    for (const [label, value] of stats) {
        if (value == null) continue;
        if (!firstStat) items.push(`<div class="profile-divider"></div>`);
        items.push(`<div class="profile-stat">
      <div class="profile-stat-value">${fmtNum(value)}</div>
      <div class="profile-stat-label">${label}</div>
    </div>`);
        firstStat = false;
    }

    if (items.length === 0) return "";

    return `<div class="profile-bar">${items.join("")}</div>`;
}

function renderPopularModeNote(rawItemsFetched: number) {
    return `<div class="callout callout-info">
    <strong>Catatan Twitter / X:</strong> Platform Twitter hanya menyediakan tweet-tweet terpopuler dari akun ini, bukan urutan kronologis terbaru.
    ${rawItemsFetched > 0 ? `Ditemukan ${rawItemsFetched} tweet populer yang ditampilkan di bawah sebagai referensi.` : ""}
    Data kuartal tidak dapat diperoleh dari platform ini karena keterbatasan akses kronologis.
  </div>`;
}

function renderSummaryCard(qs: QuarterSummaryStats, isPopular: boolean) {
    const title = isPopular ? "Statistik Tweet Populer" : "Ringkasan Kuartal";

    const hasViews = qs.avgViews != null;
    const colClass = hasViews ? "" : " col-3";

    const breakdown = Object.entries(qs.contentTypeBreakdown)
        .filter(([type]) => type !== "unknown")
        .map(
            ([type, count]) =>
                `<span class="breakdown-tag">${count} ${namaJenisKonten(type)}</span>`,
        )
        .join("");

    return `<div class="summary-card section-block">
    <h3>${title}</h3>
    <div class="metrics-grid${colClass}">
      ${metricCard("Total Suka", fmtNum(qs.totalLikes))}
      ${metricCard("Total Komentar", fmtNum(qs.totalComments))}
      ${metricCard("Rata-rata Suka/Post", fmtNum(qs.avgLikes))}
      ${metricCard("Rata-rata Komentar/Post", fmtNum(qs.avgComments))}
      ${hasViews ? metricCard("Rata-rata Tayangan/Post", fmtNum(qs.avgViews)) : ""}
      ${qs.avgEngagementRate != null ? metricCard("Rata-rata Tingkat ER", `${qs.avgEngagementRate}%`) : ""}
    </div>
    ${breakdown ? `<div class="breakdown-tags">${breakdown}</div>` : ""}
    ${
        qs.topPost
            ? `<div style="margin-top:14px; padding-top:12px; border-top:1px solid #c4dece; font-size:12px;">
        <span class="muted" style="display:block; margin-bottom:4px; font-size:10px; text-transform:uppercase; letter-spacing:.1em; font-weight:700;">${isPopular ? "Tweet Terpopuler" : "Postingan Terbaik"}</span>
        <strong>${fmtNum(qs.topPost.likes)} suka</strong>
        <span class="muted"> · ${escapeHtml(qs.topPost.publishedAt.slice(0, 10))}</span>
        ${qs.topPost.url ? `<br/><span style="font-size:11px; color:#1d4ed8; word-break:break-all;">${escapeHtml(qs.topPost.url)}</span>` : ""}
      </div>`
            : ""
    }
  </div>`;
}

function renderMonthlyTable(months: Array<{ key: string; label: string; contentCount: number }>) {
    return `<div class="section-block">
    <h3>Distribusi Bulanan</h3>
    <table class="report-table">
      <thead>
        <tr>
          <th>Bulan</th>
          <th class="right">Jumlah Konten</th>
        </tr>
      </thead>
      <tbody>
        ${months
            .map(
                (m) => `<tr>
          <td>${escapeHtml(m.label)}</td>
          <td class="right"><strong>${m.contentCount}</strong></td>
        </tr>`,
            )
            .join("")}
      </tbody>
    </table>
  </div>`;
}

function renderContentTable(
    items: IndividualQuarterlyPdfData["results"][number]["enrichedItems"],
    isPopular: boolean,
) {
    const title = isPopular ? "Tweet Populer" : "Konten Terpilih";

    return `<div class="section-block">
    <h3>${title}</h3>
    <table class="report-table">
      <thead>
        <tr>
          <th style="width:72px;">Tanggal</th>
          <th style="width:64px; padding-right:0;"></th>
          <th>Konten</th>
          <th style="width:56px;" class="center">Jenis</th>
          <th style="width:60px;" class="right">Suka</th>
          <th style="width:60px;" class="right">Komentar</th>
          <th style="width:60px;" class="right">Tayangan</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => renderContentRow(item)).join("")}
      </tbody>
    </table>
  </div>`;
}

function renderContentRow(
    item: IndividualQuarterlyPdfData["results"][number]["enrichedItems"][number],
) {
    const tanggal = String(item.publishedAt).slice(0, 10);
    const teks = item.textExcerpt ? item.textExcerpt.slice(0, 140) : "";
    const url = item.url ?? "";
    const thumb = item.thumbnailUrl;

    const thumbHtml = thumb
        ? `<img src="${escapeHtml(thumb)}" style="width:48px; height:48px; object-fit:cover; border-radius:6px; display:block;" />`
        : `<div style="width:48px; height:48px; background:#f1f5f9; border-radius:6px; display:inline-block;"></div>`;

    return `<tr>
    <td class="muted">${escapeHtml(tanggal)}</td>
    <td style="padding-right:0;">${thumbHtml}</td>
    <td>
      ${teks ? `<div style="font-size:12px;">${escapeHtml(teks)}</div>` : ""}
      ${url ? `<div style="font-size:10px; margin-top:3px; overflow-wrap:break-word; word-break:break-word;"><a href="${escapeHtml(url)}" style="color:#1d4ed8; text-decoration:none;" target="_blank">${escapeHtml(url)}</a></div>` : ""}
    </td>
    <td class="center">
      ${
          item.mediaType && item.mediaType !== "unknown"
              ? `<span class="type-tag">${escapeHtml(namaJenisKonten(item.mediaType))}</span>`
              : ""
      }
    </td>
    <td class="right">${fmtNum(item.metrics.likes ?? null)}</td>
    <td class="right">${fmtNum(item.metrics.comments ?? null)}</td>
    <td class="right">${fmtNum(item.metrics.views ?? null)}</td>
  </tr>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function metricCard(label: string, value: string) {
    return `<div class="metric-card">
    <span class="metric-label">${escapeHtml(label)}</span>
    <strong class="metric-value">${escapeHtml(value)}</strong>
  </div>`;
}

interface QuarterGrowthSummary {
    followersPct: number | null;
    interactionPct: number | null;
}

function calculateQuarterGrowth(months: SnapshotMonth[]): QuarterGrowthSummary | null {
    if (months.length < 2) return null;

    const sorted = [...months].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return null;

    return {
        followersPct: calculatePercentChange(first.followers, last.followers),
        interactionPct: calculateInteractionPercentChange(first, last),
    };
}

function calculateInteractionPercentChange(first: SnapshotMonth, last: SnapshotMonth) {
    if (first.likes != null && last.likes != null) {
        return calculatePercentChange(first.likes, last.likes);
    }

    if (first.engagement != null && last.engagement != null) {
        return calculatePercentChange(first.engagement, last.engagement);
    }

    return null;
}

function calculatePercentChange(first: number | null, last: number | null) {
    if (first == null || last == null || first === 0) return null;
    return Math.round(((last - first) / first) * 10000) / 100;
}

function formatPercent(value: number | null) {
    if (value == null || !Number.isFinite(value)) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toLocaleString("id-ID", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
    })}%`;
}

function namaStatusCoverage(status: string, isPopular: boolean) {
    if (isPopular) return "Mode Tweet Populer";
    if (status === "complete-listing-coverage") return "Cakupan Penuh";
    if (status === "partial-listing-coverage") return "Cakupan Sebagian";
    return "Tidak Ada Data";
}

function namaJenisKonten(type: string): string {
    const map: Record<string, string> = {
        video: "Video",
        image: "Foto",
        reel: "Reel",
        carousel: "Carousel",
        tweet: "Tweet",
        unknown: "Lainnya",
    };
    return map[type] ?? type;
}

function namaPlatform(platform: string) {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    if (platform === "TWITTER") return "Twitter / X";
    return platform;
}

function fmtNum(value: number | null | undefined): string {
    if (value == null) return "—";
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}rb`;
    return value.toLocaleString("id-ID");
}

function escapeHtml(value: string | null | undefined): string {
    if (!value) return "";
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

// ────────────────────────────────────────────────────────────────────────────
// Growth Charts (inline SVG)
// ────────────────────────────────────────────────────────────────────────────
function renderGrowthCharts(platform: string, months: SnapshotMonth[]): string {
    const charts: string[] = [];

    // Followers chart — all platforms
    const followersData = months.map((m) => ({ label: m.label, value: m.followers }));
    charts.push(renderAreaChartSvg("Pertumbuhan Pengikut", followersData, "#3b82f6"));

    // Posts chart — all platforms (if data exists)
    const postsData = months.flatMap((m) =>
        m.posts == null ? [] : [{ label: m.label, value: m.posts }],
    );
    if (postsData.length >= 2) {
        charts.push(renderAreaChartSvg("Pertumbuhan Postingan", postsData, "#10b981"));
    }

    // Likes chart — TikTok only
    if (platform === "TIKTOK") {
        const likesData = months.flatMap((m) =>
            m.likes == null ? [] : [{ label: m.label, value: m.likes }],
        );
        if (likesData.length >= 2) {
            charts.push(renderAreaChartSvg("Pertumbuhan Suka", likesData, "#f43f5e"));
        }
    }

    return `<div class="growth-charts-row">
    ${charts.map((svg) => `<div class="growth-chart-card">${svg}</div>`).join("")}
  </div>`;
}

function renderAreaChartSvg(
    title: string,
    data: Array<{ label: string; value: number }>,
    color: string,
): string {
    if (data.length < 2) return "";

    // Chart dimensions
    const W = 320;
    const H = 180;
    const padL = 52;
    const padR = 12;
    const padT = 36;
    const padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    // Add a 10% padding above/below to prevent the line from touching edges
    const yMin = Math.max(0, minVal - range * 0.1);
    const yMax = maxVal + range * 0.1;
    const yRange = yMax - yMin || 1;

    // Map data points to chart coordinates
    const points = data.map((d, i) => ({
        x: padL + (i / (data.length - 1)) * chartW,
        y: padT + chartH - ((d.value - yMin) / yRange) * chartH,
    }));

    // Build the area path (line + fill to bottom)
    const linePath = points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ");
    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(padT + chartH).toFixed(1)} L${points[0].x.toFixed(1)},${(padT + chartH).toFixed(1)} Z`;

    // Y-axis grid: 4 horizontal lines
    const gridLines: string[] = [];
    const yLabels: string[] = [];
    for (let i = 0; i <= 3; i++) {
        const ratio = i / 3;
        const yPos = padT + chartH - ratio * chartH;
        const val = yMin + ratio * yRange;
        gridLines.push(
            `<line x1="${padL}" y1="${yPos.toFixed(1)}" x2="${W - padR}" y2="${yPos.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.5" />`,
        );
        yLabels.push(
            `<text x="${padL - 6}" y="${(yPos + 3).toFixed(1)}" text-anchor="end" fill="#94a3b8" font-size="9">${fmtNum(Math.round(val))}</text>`,
        );
    }

    // X-axis labels
    const xLabels = data.map((d, i) => {
        const x = padL + (i / (data.length - 1)) * chartW;
        return `<text x="${x.toFixed(1)}" y="${(H - 8).toFixed(1)}" text-anchor="middle" fill="#94a3b8" font-size="9">${escapeHtml(d.label)}</text>`;
    });

    // Data point dots
    const dots = points.map(
        (p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${color}" />`,
    );

    // Gradient ID unique per title
    const gradId = `grad-${title.replace(/\s/g, "").toLowerCase()}`;

    return `<h4>${escapeHtml(title)}</h4>
<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="font-family:Inter,Helvetica,Arial,sans-serif;">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0.02" />
    </linearGradient>
  </defs>
  ${gridLines.join("\n  ")}
  ${yLabels.join("\n  ")}
  ${xLabels.join("\n  ")}
  <path d="${areaPath}" fill="url(#${gradId})" />
  <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  ${dots.join("\n  ")}
</svg>`;
}
