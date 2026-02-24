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
    includeCover?: boolean;
    customTitle?: string;
}

export function generateComparisonReportHtml(config: ReportConfig): string {
    const { platform, month1, month2, generatedAt, data, includeCover = true, customTitle } = config;

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
                : row.handle.startsWith('@') ? row.handle : `@${row.handle}`;

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
        <title>Laporan Pertumbuhan ${platform}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
                margin: 0;
            }
            body { 
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                padding: 30px 30px 0 30px;
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
            .header {
                /* Removed header */
                display: none;
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
                position: relative;
                z-index: 9999;
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
        ${includeCover ? `
        <div class="cover-page">
            <div class="cover-title">
                ${customTitle || `Laporan<br/>Audiens<br/>${platform}`}
            </div>
        </div>
        ` : ''}

        <!-- Header Removed -->

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
            <tfoot>
                <tr>
                    <td colspan="10" style="height: 50px; border: none;">&nbsp;</td>
                </tr>
            </tfoot>
        </table>

        <div class="footer">
            Laporan ${platform} | Periode ${month1} vs ${month2} | Data oleh Tim Analisis dan Strategi
        </div>
    </body>
    </html>
    `;
}

/**
 * Combined report with main cover + all platform sections
 */
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

export function generateCombinedReportHtml(config: CombinedReportConfig): string {
    const { sections, month1, month2, generatedAt, includeCover = true, customTitle } = config;

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

    const platformNames: Record<string, string> = {
        INSTAGRAM: "Instagram",
        TIKTOK: "TikTok",
        TWITTER: "Twitter / X"
    };

    // Generate section HTML for each platform
    const sectionsHtml = sections.map(({ platform, data }) => {
        const isTikTok = platform.toUpperCase() === "TIKTOK";
        const likesHeaders = isTikTok
            ? `<th>Likes<br/>${month1}</th><th>Likes<br/>${month2}</th><th>Peningkatan<br/>Likes</th>`
            : "";

        const rows = data.map((row, idx) => {
            const isNA = row.oldFollowers === -1;
            const likesColumns = isTikTok
                ? `<td>${isNA ? formatNumber(-1) : formatNumber(row.oldLikes || 0)}</td>
                   <td>${isNA ? formatNumber(-1) : formatNumber(row.newLikes || 0)}</td>
                   <td>${formatPct(row.likesPct || 0, isNA)}</td>`
                : "";

            const handleDisplay = isNA
                ? '<span style="color: #d97706; font-weight: bold;">N/A</span>'
                : row.handle.startsWith('@') ? row.handle : `@${row.handle}`;

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
        }).join("");

        return `
        <!-- Platform Cover Page -->
        <div class="platform-cover">
            <div class="platform-title">${platformNames[platform] || platform}</div>
            <div class="platform-subtitle">Laporan Pertumbuhan</div>
        </div>

            <!-- Header Removed -->

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
                <tfoot>
                    <tr>
                        <td colspan="10" style="height: 50px; border: none;">&nbsp;</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        `;
    }).join("");

    const platformList = sections.map(s => platformNames[s.platform] || s.platform).join(", ");

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
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                color: #333;
                font-size: 12px;
                padding: 0;
            }
            .section {
                padding: 30px;
                page-break-after: always;
            }
            .section:last-child {
                page-break-after: avoid;
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
            thead { display: table-header-group; }
            tbody { display: table-row-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
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
            .main-date {
                font-size: 16px;
                opacity: 0.7;
                margin-top: 60px;
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
    <body>
        ${includeCover ? `
        <!-- Main Cover Page -->
        <div class="main-cover">
            <div class="main-title">${customTitle || "Laporan<br/>Social Media"}</div>
            <div class="main-subtitle">Edisi ${month2}</div>
            <div class="main-platforms">Platform: ${platformList}</div>
        </div>
        ` : ''}

        ${sectionsHtml}

        <div class="footer">
            Laporan Social Media | Periode ${month1} vs ${month2} | Data oleh Tim Analisis dan Strategi
        </div>
    </body>
    </html>
    `;
}
