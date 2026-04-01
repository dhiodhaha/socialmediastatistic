/**
 * HTML template for Comparison Report PDF export V2
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

interface CombinedReportConfig {
    sections: Array<{
        platform: string;
        data: ComparisonData[];
    }>;
    month1: string;
    month2: string;
    generatedAt: string;
    includeCover?: boolean;
    customTitle?: string;
}

export function generateCombinedReportHtmlV2(config: CombinedReportConfig): string {
    const { sections, month1, month2, generatedAt, includeCover = true, customTitle } = config;

    const formatNumberDots = (n: number) => {
        if (n === -1) return "N/A";
        return n.toLocaleString("id-ID");
    };

    const getGrowthFormat = (oldVal: number, newVal: number, pct: number, isNA: boolean) => {
        if (isNA || oldVal == null || newVal == null || oldVal === -1 || newVal === -1) {
            return '<span style="color: #d97706; font-weight: bold;">N/A</span>';
        }
        const absDiff = newVal - oldVal;
        const sign = absDiff > 0 ? "+" : "";
        const isZero = absDiff === 0;

        const pctSign = pct > 0 ? "+" : "";
        const pctBg = pct > 0 ? "#d1fae5" : pct < 0 ? "#ffe4e6" : "#f3f4f6";
        const pctText = pct > 0 ? "#047857" : pct < 0 ? "#e11d48" : "#4b5563";

        return `
            <strong style="font-size: 14px; display: block; margin-bottom: 2px;">${formatNumberDots(newVal)}</strong>
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                <span style="color: #9ca3af; font-size: 10px;">
                   ${sign}${formatNumberDots(absDiff)}
                </span>
                <span style="background-color: ${pctBg}; color: ${pctText}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">
                   ${pctSign}${pct.toFixed(2)}%
                </span>
            </div>
        `;
    };

    const platformNames: Record<string, string> = {
        INSTAGRAM: "Instagram",
        TIKTOK: "TikTok",
        TWITTER: "Twitter / X",
    };

    // Generate section HTML for each platform
    const sectionsHtml = sections
        .map(({ platform, data }) => {
            const isTikTok = platform.toUpperCase() === "TIKTOK";
            const likesHeaders = isTikTok
                ? `<th style="text-align: right;">LIKES<br/><span style="font-weight: normal; font-size: 9px; opacity: 0.8;">Total & Pertumbuhan</span></th>`
                : "";

            const rows = data
                .map((row, idx) => {
                    const isNA = row.oldFollowers === -1;
                    const likesColumns = isTikTok
                        ? `<td style="text-align: right; vertical-align: middle;">${getGrowthFormat(row.oldLikes || 0, row.newLikes || 0, row.likesPct || 0, isNA)}</td>`
                        : "";

                    const handleDisplay = isNA
                        ? '<span style="color: #d97706; font-weight: bold;">N/A</span>'
                        : row.handle.startsWith("@")
                          ? row.handle
                          : `@${row.handle}`;

                    const rowBg = ""; // Clean white or alternate handled by CSS

                    return `
            <tr>
                <td style="text-align: center; vertical-align: middle; color: #6b7280; font-weight: 500;">${idx + 1}</td>
                <td style="vertical-align: middle; padding: 12px 10px;">
                    <strong style="font-size: 13px; color: #111827; display: block; margin-bottom: 3px;">${row.accountName}</strong>
                    <span style="color: #6b7280; font-size: 11px;">${handleDisplay}</span>
                </td>
                <td style="text-align: right; vertical-align: middle;">${getGrowthFormat(row.oldFollowers, row.newFollowers, row.followersPct, isNA)}</td>
                <td style="text-align: right; vertical-align: middle;">${getGrowthFormat(row.oldPosts, row.newPosts, row.postsPct, isNA)}</td>
                ${likesColumns}
            </tr>
        `;
                })
                .join("");

            return `
        <!-- Platform Cover Page -->
        <div class="platform-cover">
            <div class="platform-title">${platformNames[platform] || platform}</div>
            <div class="platform-subtitle">Laporan Pertumbuhan</div>
        </div>

            <table class="report-table">
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th style="width: 280px; text-align: left;">NAMA UNIT</th>
                        <th style="text-align: right;">PENGIKUT<br/><span style="font-weight: normal; font-size: 9px; opacity: 0.8;">Total & Pertumbuhan</span></th>
                        <th style="text-align: right;">POSTINGAN<br/><span style="font-weight: normal; font-size: 9px; opacity: 0.8;">Total & Pertumbuhan</span></th>
                        ${likesHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="10" style="height: 50px; border: none;">&nbsp;</td>
                    </tr>
                </tfoot>
            </table>
        `;
        })
        .join("");

    const platformList = sections.map((s) => platformNames[s.platform] || s.platform).join(", ");

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Laporan Social Media</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
                margin: 0;
            }
            body { 
                font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                color: #333;
                font-size: 12px;
                padding: 0;
                background-color: white;
            }
            .section {
                padding: 30px;
                page-break-after: always;
            }
            .section:last-child {
                page-break-after: avoid;
            }
            .report-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 15px;
            }
            thead { display: table-header-group; }
            tbody { display: table-row-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            th { 
                background-color: #294bd8; 
                color: white; 
                padding: 14px 12px; 
                font-size: 11px;
                font-weight: bold;
                letter-spacing: 0.5px;
            }
            td { 
                padding: 10px 12px; 
                border-bottom: 1px solid #f3f4f6;
                font-size: 12px;
            }
            tbody tr:hover { background-color: #f9fafb; }
            
            /* Main Cover Page */
            .main-cover {
                page-break-after: always;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: white;
                text-align: center;
                position: relative;
                z-index: 9999;
                page-break-before: always;
                break-before: page;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .main-title {
                font-size: 56px;
                font-weight: 300;
                line-height: 1.2;
                margin-bottom: 20px;
            }
            .main-subtitle {
                font-size: 24px;
                opacity: 0.9;
                margin-bottom: 40px;
            }
            .main-platforms {
                font-size: 18px;
                opacity: 0.8;
            }

            /* Platform Cover Page */
            .platform-cover {
                page-break-after: always;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                background: linear-gradient(135deg, #3B5BDB 0%, #1E3A8A 100%);
                color: white;
                padding: 80px;
                position: relative;
                z-index: 9999;
                page-break-before: always;
                break-before: page;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .platform-title {
                font-size: 72px;
                font-weight: 300;
                line-height: 1.1;
            }
            .platform-subtitle {
                font-size: 24px;
                opacity: 0.8;
                margin-top: 20px;
            }

            .footer { 
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 15px 30px;
                font-size: 10px; 
                color: #999; 
                text-align: left;
                background-color: white;
                border-top: 1px solid #eee;
                z-index: 500;
                height: 40px;
            }

            @media print {
                tr { page-break-inside: avoid; break-inside: avoid; }
                thead { display: table-header-group; }
                .main-cover, .platform-cover, .section { 
                    page-break-after: always; 
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body style="padding: 0; background-color: white;">
        ${
            includeCover
                ? `
        <!-- Main Cover Page -->
        <div class="main-cover">
            <div class="main-title">${customTitle || "Laporan<br/>Social Media"}</div>
            <div class="main-subtitle">Edisi ${month2}</div>
            <div class="main-platforms">Platform: ${platformList}</div>
        </div>
        `
                : ""
        }

        ${sectionsHtml}

        <div class="footer">
            Laporan Social Media | Periode ${month1} vs ${month2} | Data oleh Tim Analisis dan Strategi
        </div>
    </body>
    </html>
    `;
}
