interface IndividualQuarterComparisonPdfData {
    account: {
        id: string;
        username: string;
    };
    current: {
        year: number;
        quarter: number;
    };
    comparison: {
        year: number;
        quarter: number;
    };
    platforms: Array<{
        platform: string;
        current: {
            sourceLabel: string;
            snapshot: unknown | null;
        };
        comparison: {
            sourceLabel: string;
            snapshot: unknown | null;
        };
        metrics: Array<{
            label: string;
            currentValue: number | null;
            comparisonValue: number | null;
            absoluteDelta: number | null;
            percentDelta: number | null;
            reason: string | null;
        }>;
    }>;
    notes: string[];
}

export function generateIndividualQuarterComparisonReportHtml({
    data,
    generatedAt,
}: {
    data: IndividualQuarterComparisonPdfData;
    generatedAt: string;
}) {
    const periodLabel = `Q${data.current.quarter} ${data.current.year}`;
    const comparisonLabel = `Q${data.comparison.quarter} ${data.comparison.year}`;

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Perbandingan Statistik Individual ${escapeHtml(data.account.username)}</title>
  <style>
    @page { margin: 0; }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #14213d;
      background: #f8fafc;
    }
    .cover {
      height: 297mm;
      padding: 48px;
      background: linear-gradient(135deg, #12372a 0%, #436850 58%, #fbfada 100%);
      color: white;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-weight: 700;
      opacity: 0.78;
    }
    h1 {
      max-width: 760px;
      margin: 18px 0 0;
      font-size: 50px;
      line-height: 1.05;
    }
    .subtitle {
      margin-top: 16px;
      font-size: 20px;
      opacity: 0.88;
    }
    .page {
      page-break-after: always;
      padding: 48px;
    }
    .page:last-child { page-break-after: auto; }
    h2 { margin: 8px 0 4px; font-size: 28px; }
    .muted { color: #64748b; }
    .platform-card {
      margin-top: 20px;
      border: 1px solid #d8e1d2;
      border-radius: 18px;
      overflow: hidden;
      background: white;
      page-break-inside: avoid;
    }
    .platform-head {
      padding: 18px 20px;
      background: #e8f0e2;
      border-bottom: 1px solid #d8e1d2;
      display: flex;
      justify-content: space-between;
      gap: 18px;
    }
    .platform-title { font-size: 20px; font-weight: 800; }
    .source {
      margin-top: 6px;
      font-size: 11px;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      text-align: left;
      padding: 10px 12px;
      color: #475569;
      background: #f8fafc;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 10px;
    }
    td {
      padding: 12px;
      border-top: 1px solid #edf2f7;
      vertical-align: top;
    }
    tr { page-break-inside: avoid; }
    .right { text-align: right; }
    .delta-positive { color: #047857; font-weight: 800; }
    .delta-negative { color: #be123c; font-weight: 800; }
    .delta-neutral { color: #334155; font-weight: 800; }
    .reason { color: #92400e; font-size: 11px; margin-top: 4px; }
    .notes {
      margin-top: 24px;
      padding: 16px 18px;
      border-radius: 14px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      font-size: 12px;
      color: #7c2d12;
      page-break-inside: avoid;
    }
    .notes li { margin: 6px 0; }
  </style>
</head>
<body>
  <section class="cover">
    <div>
      <div class="eyebrow">Laporan Statistik Individual</div>
      <h1>${escapeHtml(data.account.username)}</h1>
      <div class="subtitle">Perbandingan ${periodLabel} terhadap ${comparisonLabel}</div>
    </div>
    <div>
      <div class="eyebrow">Generated</div>
      <div>${escapeHtml(generatedAt)}</div>
    </div>
  </section>

  <section class="page">
    <div class="eyebrow">Quarter-to-Quarter</div>
    <h2>Perbandingan Statistik Tersimpan</h2>
    <div class="muted">Angka bersumber dari snapshot yang tersimpan. Data manual diberi label sumber dan hanya dipakai ketika snapshot scraping belum tersedia.</div>
    ${data.platforms.map(renderPlatform).join("")}
    <div class="notes">
      <strong>Catatan metodologi</strong>
      <ul>${data.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
    </div>
  </section>
</body>
</html>`;
}

function renderPlatform(platform: IndividualQuarterComparisonPdfData["platforms"][number]) {
    return `<article class="platform-card">
  <div class="platform-head">
    <div>
      <div class="platform-title">${escapeHtml(platformDisplayName(platform.platform))}</div>
      <div class="source">Current: ${escapeHtml(platform.current.sourceLabel)}</div>
      <div class="source">Pembanding: ${escapeHtml(platform.comparison.sourceLabel)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Metrik</th>
        <th class="right">Current</th>
        <th class="right">Pembanding</th>
        <th class="right">Delta</th>
        <th class="right">Persen</th>
      </tr>
    </thead>
    <tbody>
      ${platform.metrics.map(renderMetric).join("")}
    </tbody>
  </table>
</article>`;
}

function renderMetric(
    metric: IndividualQuarterComparisonPdfData["platforms"][number]["metrics"][number],
) {
    const deltaClass =
        metric.absoluteDelta == null
            ? "delta-neutral"
            : metric.absoluteDelta > 0
              ? "delta-positive"
              : metric.absoluteDelta < 0
                ? "delta-negative"
                : "delta-neutral";

    return `<tr>
  <td>
    <strong>${escapeHtml(metric.label)}</strong>
    ${metric.reason ? `<div class="reason">${escapeHtml(metric.reason)}</div>` : ""}
  </td>
  <td class="right">${formatNullableNumber(metric.currentValue)}</td>
  <td class="right">${formatNullableNumber(metric.comparisonValue)}</td>
  <td class="right ${deltaClass}">${formatDelta(metric.absoluteDelta)}</td>
  <td class="right">${formatPercent(metric.percentDelta)}</td>
</tr>`;
}

function platformDisplayName(platform: string) {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    if (platform === "TWITTER") return "Twitter / X";
    return platform;
}

function formatNullableNumber(value: number | null) {
    if (value == null) return "Tidak tersedia";
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

function formatDelta(value: number | null) {
    if (value == null) return "Belum dapat dihitung";
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${formatNullableNumber(value)}`;
}

function formatPercent(value: number | null) {
    if (value == null) return "Persentase tidak dihitung";
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
