/**
 * HTML template for Comparison Report PDF export
 */

interface ComparisonData {
    accountName: string;
    handle: string;
    oldFollowers: number;
    newFollowers: number;
    followersPct: number;
    oldPosts: number;
    newPosts: number;
    postsPct: number;
    oldLikes?: number;
    newLikes?: number;
    likesPct?: number;
}

interface ReportConfig {
    platform: string;
    month1: string;
    month2: string;
    generatedAt: string;
    data: ComparisonData[];
}

export function generateComparisonReportHtml(config: ReportConfig): string {
    const { platform, month1, month2, generatedAt, data } = config;

    const isTikTok = platform.toUpperCase() === "TIKTOK";

    const formatNumber = (n: number) => {
        if (n === -1) return '<span style="color: #d97706; font-weight: bold;">N/A</span>';
        return n.toLocaleString("id-ID");
    };
    const formatPct = (n: number, isNA: boolean = false) => {
        if (isNA) return '<span style="color: #d97706; font-weight: bold;">N/A</span>';
        if (n === 0) return "-";
        const sign = n > 0 ? "+" : "";
        const color = n > 0 ? "#22c55e" : n < 0 ? "#ef4444" : "#64748b";
        return `<span style="color: ${color}; font-weight: bold;">${sign}${n.toFixed(2)}%</span>`;
    };

    const likesHeaders = isTikTok
        ? `<th>Likes<br/>${month1}</th><th>Likes<br/>${month2}</th><th>Peningkatan<br/>Likes</th>`
        : "";

    const rows = data
        .map((row, idx) => {
            const isNA = row.oldFollowers === -1;

            const likesColumns = isTikTok
                ? `<td>${isNA ? formatNumber(-1) : formatNumber(row.oldLikes || 0)}</td>
                   <td>${isNA ? formatNumber(-1) : formatNumber(row.newLikes || 0)}</td>
                   <td>${formatPct(row.likesPct || 0, isNA)}</td>`
                : "";

            const handleDisplay = isNA
                ? '<span style="color: #d97706; font-weight: bold;">N/A</span>'
                : `@${row.handle}`;

            const rowBg = isNA ? 'background-color: #fef3c7;' : '';

            return `
            <tr style="${rowBg}">
                <td style="text-align: center;">${idx + 1}</td>
                <td>
                    <strong>${row.accountName}</strong><br/>
                    <span style="color: #666; font-size: 12px;">${handleDisplay}</span>
                </td>
                <td style="text-align: right;">${formatNumber(row.oldFollowers)}</td>
                <td style="text-align: right;">${formatNumber(row.newFollowers)}</td>
                <td style="text-align: center;">${formatPct(row.followersPct, isNA)}</td>
                <td style="text-align: right;">${formatNumber(row.oldPosts)}</td>
                <td style="text-align: right;">${formatNumber(row.newPosts)}</td>
                <td style="text-align: center;">${formatPct(row.postsPct, isNA)}</td>
                ${likesColumns}
            </tr>
        `;
        })
        .join("");


    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Laporan Perbandingan ${platform}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                padding: 30px; 
                color: #333;
                font-size: 12px;
            }
            .header { 
                margin-bottom: 20px; 
                border-bottom: 2px solid #2563eb; 
                padding-bottom: 15px; 
            }
            h1 { 
                font-size: 20px; 
                color: #2563eb;
                margin-bottom: 5px;
            }
            .meta { font-size: 11px; color: #666; }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 15px;
            }
            thead {
                display: table-header-group;
            }
            tbody {
                display: table-row-group;
            }
            tr {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            th { 
                background-color: #2563eb; 
                color: white; 
                padding: 10px 6px; 
                text-align: center;
                font-size: 11px;
                border: 1px solid #1d4ed8;
            }
            td { 
                padding: 8px 6px; 
                border-bottom: 1px solid #e5e7eb;
                font-size: 11px;
            }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { 
                margin-top: 30px; 
                font-size: 10px; 
                color: #999; 
                text-align: center;
                border-top: 1px solid #eee;
                padding-top: 15px;
            }
            /* Cover page styles */
            .cover-page {
                page-break-after: always;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                background: linear-gradient(135deg, #3B5BDB 0%, #1E3A8A 100%);
                color: white;
                margin: -30px;
                padding: 80px;
            }
            .cover-title {
                font-size: 72px;
                font-weight: 300;
                line-height: 1.1;
                letter-spacing: -1px;
            }
            @media print {
                tr {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                thead {
                    display: table-header-group;
                }
                .cover-page {
                    page-break-after: always;
                }
            }
        </style>
    </head>
    <body>
        <!-- Cover Page -->
        <div class="cover-page">
            <div class="cover-title">
                Laporan<br/>
                Audiens<br/>
                ${platform}
            </div>
        </div>

        <!-- Report Content -->
        <div class="header">
            <h1>Laporan Perbandingan - ${platform}</h1>
            <div class="meta">
                Periode: ${month1} vs ${month2} | Digenerate: ${generatedAt}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 30px;">#</th>
                    <th style="width: 180px;">Nama Unit</th>
                    <th>Pengikut<br/>${month1}</th>
                    <th>Pengikut<br/>${month2}</th>
                    <th>Peningkatan<br/>Pengikut</th>
                    <th>Postingan<br/>${month1}</th>
                    <th>Postingan<br/>${month2}</th>
                    <th>Peningkatan<br/>Post</th>
                    ${likesHeaders}
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <div class="footer">
            Social Media Statistic Dashboard &copy; ${new Date().getFullYear()} | Total: ${data.length} akun
        </div>
    </body>
    </html>
    `;
}
