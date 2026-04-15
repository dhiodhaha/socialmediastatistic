interface QuarterlyReportConfig {
    periodLabel: string;
    baselineLabel: string;
    generatedAt: string;
    includeCover?: boolean;
    customTitle?: string;
    scope: "PLATFORM" | "ALL";
    executiveSummary: {
        headlineLabel: string;
        headlineValue: number;
        quarterEndCoverageLabel: string;
        fullQuarterCoverageLabel: string;
        totalAccounts: number;
        warnings: string[];
        methodologyNote: string | null;
        platformHighlights: Array<{
            platform: string;
            netFollowerGrowth: number;
            rankingEligibleCount: number;
            performanceIssueCount: number;
            dataQualityIssueCount: number;
            topGainers: Array<{
                accountName: string;
                handle: string;
                followerGrowthPct: number;
                followerGrowthValue: number;
            }>;
            topDecliners: Array<{
                accountName: string;
                handle: string;
                followerGrowthPct: number;
                followerGrowthValue: number;
            }>;
        }>;
    };
    sections: Array<{
        platform: string;
        summary: {
            netFollowerGrowth: number;
            rankingEligibleCount: number;
            totalAccounts: number;
            performanceIssueCount: number;
            dataQualityIssueCount: number;
        };
        rows: Array<{
            accountName: string;
            handle: string;
            category: string;
            sharedAccount: boolean;
            isRanked: boolean;
            performanceIssue: boolean;
            dataQualityIssue: boolean;
            detailNote: string | null;
            oldFollowers: number | null;
            newFollowers: number | null;
            followersPct: number | null;
            oldPosts: number | null;
            newPosts: number | null;
            postsPct: number | null;
            oldLikes: number | null;
            newLikes: number | null;
            likesPct: number | null;
        }>;
    }>;
}

export function generateQuarterlyReportHtml(config: QuarterlyReportConfig): string {
    const {
        periodLabel,
        baselineLabel,
        generatedAt,
        includeCover = true,
        customTitle,
        executiveSummary,
        sections,
    } = config;

    const sectionsHtml = sections
        .map(
            (section) => `
            <section class="page platform-page">
                <div class="section-header">
                    <div>
                        <div class="eyebrow">Platform Section</div>
                        <h2>${section.platform}</h2>
                    </div>
                    <div class="metrics-grid compact">
                        <div class="metric-card">
                            <span class="metric-label">Net Follower Growth</span>
                            <strong class="metric-value">${formatSigned(section.summary.netFollowerGrowth)}</strong>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Eligible Rankings</span>
                            <strong class="metric-value">${section.summary.rankingEligibleCount}/${section.summary.totalAccounts}</strong>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Performance Issues</span>
                            <strong class="metric-value">${section.summary.performanceIssueCount}</strong>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Data Quality Issues</span>
                            <strong class="metric-value">${section.summary.dataQualityIssueCount}</strong>
                        </div>
                    </div>
                </div>

                <table class="report-table">
                    <thead>
                        <tr>
                            <th style="width: 56px;">Rank</th>
                            <th style="width: 260px; text-align: left;">Account</th>
                            <th>Followers</th>
                            <th>Posts</th>
                            <th>Likes</th>
                            <th style="width: 240px; text-align: left;">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${section.rows
                            .map(
                                (row, index) => `
                                <tr>
                                    <td>${row.isRanked ? `#${index + 1}` : "-"}</td>
                                    <td class="align-left">
                                        <strong>${row.accountName}</strong>
                                        <span class="muted">${row.handle} • ${row.category}</span>
                                    </td>
                                    <td>${renderMetric(row.newFollowers, row.followersPct)}</td>
                                    <td>${renderMetric(row.newPosts, row.postsPct)}</td>
                                    <td>${renderMetric(row.newLikes, row.likesPct)}</td>
                                    <td class="align-left">
                                        ${renderBadges(row)}
                                        ${row.detailNote ? `<div class="note">${row.detailNote}</div>` : ""}
                                    </td>
                                </tr>
                            `,
                            )
                            .join("")}
                    </tbody>
                </table>
            </section>
        `,
        )
        .join("");

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>Quarterly Executive Report</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        margin: 0;
                        color: #0f172a;
                        background: #f5f7fb;
                    }
                    .page {
                        page-break-after: always;
                        min-height: 100vh;
                        padding: 44px 52px;
                        background:
                            radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 28%),
                            linear-gradient(180deg, #ffffff, #f8fafc);
                    }
                    .page:last-child { page-break-after: auto; }
                    .cover {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: flex-start;
                        background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
                        color: white;
                    }
                    .cover h1 {
                        margin: 0;
                        font-size: 48px;
                        line-height: 1.05;
                        max-width: 860px;
                    }
                    .cover p {
                        margin: 18px 0 0;
                        font-size: 18px;
                        opacity: 0.86;
                    }
                    .eyebrow {
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.14em;
                        color: #64748b;
                        font-weight: 700;
                    }
                    .cover .eyebrow { color: rgba(255,255,255,0.7); }
                    .section-header {
                        display: flex;
                        justify-content: space-between;
                        gap: 24px;
                        align-items: flex-start;
                        margin-bottom: 28px;
                    }
                    h2 {
                        margin: 8px 0 0;
                        font-size: 34px;
                    }
                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        gap: 12px;
                        width: 100%;
                        margin-top: 24px;
                    }
                    .metrics-grid.compact {
                        max-width: 640px;
                    }
                    .metric-card {
                        background: rgba(255,255,255,0.9);
                        border: 1px solid #dbe4f0;
                        border-radius: 16px;
                        padding: 14px 16px;
                    }
                    .metric-label {
                        display: block;
                        font-size: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.14em;
                        color: #64748b;
                        font-weight: 700;
                    }
                    .metric-value {
                        display: block;
                        margin-top: 8px;
                        font-size: 24px;
                    }
                    .highlights-grid {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 16px;
                        margin-top: 24px;
                    }
                    .highlight-card {
                        border-radius: 18px;
                        border: 1px solid #dbe4f0;
                        background: rgba(255,255,255,0.92);
                        padding: 18px;
                    }
                    .highlight-card h3 {
                        margin: 8px 0 0;
                        font-size: 22px;
                    }
                    .highlight-list {
                        margin-top: 14px;
                        display: grid;
                        gap: 10px;
                    }
                    .highlight-list-item {
                        border-radius: 12px;
                        background: #f8fafc;
                        padding: 10px 12px;
                    }
                    .highlight-list-item strong {
                        display: block;
                        font-size: 13px;
                    }
                    .highlight-list-item span {
                        display: block;
                        margin-top: 4px;
                        font-size: 11px;
                        color: #64748b;
                    }
                    .report-table {
                        width: 100%;
                        border-collapse: collapse;
                        background: white;
                        border-radius: 18px;
                        overflow: hidden;
                        border: 1px solid #dbe4f0;
                    }
                    .report-table th,
                    .report-table td {
                        padding: 12px 14px;
                        border-bottom: 1px solid #e8eef6;
                        text-align: right;
                        vertical-align: top;
                        font-size: 12px;
                    }
                    .report-table th {
                        background: #e8f0fe;
                        color: #1e3a8a;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                    }
                    .align-left { text-align: left !important; }
                    .muted {
                        display: block;
                        margin-top: 4px;
                        color: #64748b;
                        font-size: 11px;
                    }
                    .delta {
                        display: block;
                        margin-top: 4px;
                        font-size: 11px;
                        color: #64748b;
                    }
                    .badge {
                        display: inline-block;
                        margin-right: 6px;
                        margin-bottom: 6px;
                        padding: 4px 8px;
                        border-radius: 999px;
                        font-size: 10px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                    }
                    .badge-performance {
                        background: #ffe4e6;
                        color: #be123c;
                    }
                    .badge-quality {
                        background: #fef3c7;
                        color: #b45309;
                    }
                    .badge-shared {
                        background: #dbeafe;
                        color: #1d4ed8;
                    }
                    .badge-unranked {
                        background: #e5e7eb;
                        color: #4b5563;
                    }
                    .note {
                        font-size: 11px;
                        color: #64748b;
                    }
                    .warning-list {
                        margin: 18px 0 0;
                        padding: 0;
                        list-style: none;
                        display: grid;
                        gap: 10px;
                    }
                    .warning-list li {
                        padding: 12px 14px;
                        border-radius: 14px;
                        background: #fff7ed;
                        border: 1px solid #fed7aa;
                        color: #9a3412;
                        font-size: 12px;
                    }
                    .methodology-callout {
                        margin-top: 16px;
                        padding: 12px 14px;
                        border-radius: 14px;
                        background: #eff6ff;
                        border: 1px solid #bfdbfe;
                        color: #1d4ed8;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                ${
                    includeCover
                        ? `
                    <section class="page cover">
                        <div class="eyebrow">Quarterly Executive Report</div>
                        <h1>${customTitle || "Laporan Triwulanan"}</h1>
                        <p>Periode ${periodLabel} • Baseline ${baselineLabel}</p>
                        <p>Dibuat ${generatedAt}</p>
                    </section>
                `
                        : ""
                }

                <section class="page">
                    <div class="eyebrow">Executive Summary</div>
                    <div class="section-header">
                        <div>
                            <h2>${periodLabel}</h2>
                            <p>Quarter-end vs previous quarter-end baseline: ${baselineLabel}</p>
                        </div>
                    </div>

                    <div class="metrics-grid">
                        <div class="metric-card">
                            <span class="metric-label">${executiveSummary.headlineLabel}</span>
                            <strong class="metric-value">${formatSigned(executiveSummary.headlineValue)}</strong>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Quarter-End Coverage</span>
                            <strong class="metric-value">${executiveSummary.quarterEndCoverageLabel}</strong>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Full-Quarter Coverage</span>
                            <strong class="metric-value">${executiveSummary.fullQuarterCoverageLabel}</strong>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Tracked Accounts</span>
                            <strong class="metric-value">${executiveSummary.totalAccounts}</strong>
                        </div>
                    </div>

                    <div class="highlights-grid">
                        ${executiveSummary.platformHighlights
                            .map(
                                (highlight) => `
                                <div class="highlight-card">
                                    <div class="eyebrow">${highlight.platform}</div>
                                    <h3>${formatSigned(highlight.netFollowerGrowth)}</h3>
                                    <div class="muted">Eligible rankings ${highlight.rankingEligibleCount}</div>
                                    <div class="highlight-list">
                                        ${highlight.topGainers
                                            .slice(0, 3)
                                            .map(
                                                (item) => `
                                                <div class="highlight-list-item">
                                                    <strong>${item.accountName}</strong>
                                                    <span>@${item.handle} • +${item.followerGrowthPct.toFixed(1)}%</span>
                                                </div>
                                            `,
                                            )
                                            .join("")}
                                        ${highlight.topDecliners
                                            .slice(0, 3)
                                            .map(
                                                (item) => `
                                                <div class="highlight-list-item">
                                                    <strong>${item.accountName}</strong>
                                                    <span>@${item.handle} • ${item.followerGrowthPct.toFixed(1)}%</span>
                                                </div>
                                            `,
                                            )
                                            .join("")}
                                    </div>
                                </div>
                            `,
                            )
                            .join("")}
                    </div>

                    ${
                        executiveSummary.methodologyNote
                            ? `
                        <div class="methodology-callout">${executiveSummary.methodologyNote}</div>
                    `
                            : ""
                    }

                    ${
                        executiveSummary.warnings.length > 0
                            ? `
                        <ul class="warning-list">
                            ${executiveSummary.warnings.map((warning) => `<li>${warning}</li>`).join("")}
                        </ul>
                    `
                            : ""
                    }
                </section>

                ${sectionsHtml}
            </body>
        </html>
    `;
}

function renderMetric(value: number | null, pct: number | null) {
    if (value === null) {
        return '<span class="muted">N/A</span>';
    }

    return `
        <strong>${value.toLocaleString("id-ID")}</strong>
        <span class="delta">${pct === null ? "N/A" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}</span>
    `;
}

function renderBadges(row: QuarterlyReportConfig["sections"][number]["rows"][number]) {
    const badges = [];
    if (row.performanceIssue) {
        badges.push('<span class="badge badge-performance">Performance</span>');
    }
    if (row.dataQualityIssue) {
        badges.push('<span class="badge badge-quality">Data quality</span>');
    }
    if (row.sharedAccount) {
        badges.push('<span class="badge badge-shared">Shared</span>');
    }
    if (!row.isRanked) {
        badges.push('<span class="badge badge-unranked">Unranked</span>');
    }
    return badges.join("");
}

function formatSigned(value: number) {
    return `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID")}`;
}
