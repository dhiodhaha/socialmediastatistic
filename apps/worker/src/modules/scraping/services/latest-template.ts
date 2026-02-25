
/**
 * Combined report with main cover + all platform sections (Latest Data Only)
 */
interface LatestReportConfig {
    sections: Array<{
        platform: string;
        data: Array<{
            accountName: string;
            handle: string;
            followers: number;
            posts: number;
            likes?: number;
        }>;
    }>;
    month: string;
    generatedAt: string;
    includeCover?: boolean;
    customTitle?: string;
}

export function generateLatestReportHtml(config: LatestReportConfig): string {
    const { sections, month, generatedAt, includeCover = true, customTitle } = config;

    const formatNumber = (n: number) => {
        if (n === -1) return '<span style="color: #d97706; font-weight: bold;">N/A</span>';
        return n.toLocaleString("id-ID");
    };

    const platformNames: Record<string, string> = {
        INSTAGRAM: "Instagram",
        TIKTOK: "TikTok",
        TWITTER: "Twitter / X"
    };

    // Generate section HTML for each platform
    const sectionsHtml = sections.map(({ platform, data }) => {
        const isTikTok = platform.toUpperCase() === "TIKTOK";
        const likesHeader = isTikTok ? `<th>Likes</th>` : "";

        const rows = data.map((row, idx) => {
            const isNA = row.followers === -1;
            const likesColumn = isTikTok
                ? `<td style="text-align: right;">${isNA ? formatNumber(-1) : formatNumber(row.likes || 0)}</td>`
                : "";

            const handleDisplay = isNA
                ? '<span style="color: #d97706; font-weight: bold;">N/A</span>'
                : row.handle.startsWith('@') ? row.handle : `@${row.handle}`;

            const rowBg = isNA ? 'background-color: #fef3c7;' : '';

            // Format rank with leading zero if single digit
            const rank = (idx + 1).toString().padStart(2, '0');

            return `
            <tr style="${rowBg}">
                <td>${rank}</td>
                <td title="${row.accountName}">${row.accountName}</td>
                <td>${handleDisplay}</td>
                <td style="text-align: right;">${formatNumber(row.followers)}</td>
                <td style="text-align: right;">${formatNumber(row.posts)}</td>
                ${likesColumn}
            </tr>
        `;
        }).join("");

        return `
        <!-- Platform Cover Page -->
        <div class="platform-cover">
            <div class="platform-title">${platformNames[platform] || platform}</div>
            <div class="platform-subtitle">Laporan Data Terbaru</div>
        </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Nama Unit</th>
                        <th>Handle</th>
                        <th>Pengikut</th>
                        <th>Post</th>
                        ${likesHeader}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="${isTikTok ? 6 : 5}" style="height: 50px; border: none;">&nbsp;</td>
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
        <title>Laporan Social Media (Terbaru)</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
                size: 1920px 1080px;
                margin: 0;
            }
            body { 
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                color: #333;
                font-size: 16px; /* Increased base font size */
                padding: 0;
                width: 1920px;
                height: 1080px;
                overflow: hidden;
            }
            .section {
                width: 1920px;
                height: 1080px;
                padding: 60px; /* Increased padding */
                page-break-after: always;
                position: relative;
            }
            .section:last-child {
                page-break-after: avoid;
            }
            
            /* Table Styles */
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 30px;
            }
            thead { display: table-header-group; }
            tbody { display: table-row-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            th { 
                background-color: #2563eb; 
                color: white; 
                padding: 12px 10px; /* Reduced vertical padding */
                text-align: right;
                font-size: 16px;
                border-bottom: 3px solid #1e40af; /* Stronger border */
            }
            /* Column specific alignments */
            th:nth-child(1) { text-align: left; width: 80px; padding-left: 20px; } /* Rank */
            th:nth-child(2) { text-align: left; width: 650px; } /* Nama Unit - Wider */
            th:nth-child(3) { text-align: left; width: 300px; } /* Handle */

            td { 
                padding: 12px 10px; /* Reduced vertical padding */
                border-bottom: 1px solid #e5e7eb;
                font-size: 16px; 
                vertical-align: middle;
            }
            
            /* Rank Column */
            td:nth-child(1) { 
                text-align: left; 
                padding-left: 20px;
                color: #64748b;
                font-family: monospace;
                vertical-align: top; /* Align top for multi-line rows */
            }
            
            /* Nama Unit - Wrap settings */
            td:nth-child(2) {
                font-weight: 600;
                color: #1e3a8a;
                max-width: 650px;
                white-space: normal; /* Allow wrapping */
                word-wrap: break-word;
                line-height: 1.4;
            }
            
            /* Handle */
            td:nth-child(3) {
                color: #64748b;
                font-family: monospace;
                vertical-align: top;
            }

            /* Stats columns alignment */
            td:nth-child(4), td:nth-child(5), td:nth-child(6) {
                vertical-align: top;
            }

            tr:nth-child(even) { background-color: #f8fafc; }
            
            /* Main Cover Page */
            .main-cover {
                page-break-after: always;
                width: 1920px;
                height: 1080px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: white;
                text-align: center;
                position: relative;
                z-index: 9999;
            }
            .main-title {
                font-size: 84px; /* Larger title */
                font-weight: 300;
                line-height: 1.2;
                margin-bottom: 30px;
            }
            .main-subtitle {
                font-size: 36px;
                opacity: 0.9;
                margin-bottom: 60px;
            }
            .main-platforms {
                font-size: 28px;
                opacity: 0.8;
            }
            
            /* Platform Cover Page */
            .platform-cover {
                page-break-after: always;
                page-break-before: always;
                break-before: page;
                width: 1920px;
                height: 1080px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                background: linear-gradient(135deg, #3B5BDB 0%, #1E3A8A 100%);
                color: white;
                padding: 120px; /* Larger padding */
                position: relative;
                z-index: 9999;
            }
            .platform-title {
                font-size: 96px; /* Larger title */
                font-weight: 300;
                line-height: 1.1;
            }
            .platform-subtitle {
                font-size: 36px;
                opacity: 0.8;
                margin-top: 30px;
            }

            .footer { 
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 20px 60px;
                font-size: 14px; 
                color: #999; 
                text-align: left;
                background-color: white;
                border-top: 1px solid #eee;
                z-index: 500;
                height: 60px;
                display: flex;
                align-items: center;
            }
            
            /* Layout for Data Pages with 1920x1080 */
             .data-page {
                width: 1920px;
                height: 1080px;
                padding: 60px 80px 80px 80px;
                page-break-after: always;
                position: relative;
            }
            .data-title {
                font-size: 32px; 
                color: #1e3a8a; 
                margin-bottom: 20px; 
                font-weight: bold;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 10px;
            }
        </style>
    </head>
    <body>
        ${includeCover ? `
        <!-- Main Cover Page -->
        <div class="main-cover">
            <div class="main-title">${customTitle || "Laporan<br/>Social Media"}</div>
            <div class="main-subtitle">Edisi ${month}</div>
            <div class="main-platforms">Platform: ${platformList}</div>
        </div>
        ` : ''}

        ${sectionsHtml}

        <div class="footer">
            Laporan Social Media (Data Terbaru) | Periode ${month} | Data oleh Tim Analisis dan Strategi
        </div>
    </body>
    </html>
    `;
}
