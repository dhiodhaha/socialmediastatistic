
import { logger } from "../lib/logger";

interface ReportData {
    filteredJobs: any[]; // ScrapingJob[] from database
    filters: {
        startDate?: string;
        endDate?: string;
        status?: string;
    };
    generatedAt: string;
}

export function generateReportHtml(data: ReportData): string {
    const { filteredJobs, filters, generatedAt } = data;

    const rows = filteredJobs.map(job => {
        const date = new Date(job.createdAt).toLocaleString();
        const statusColor = job.status === "COMPLETED" ? "#22c55e" : job.status === "FAILED" ? "#ef4444" : "#64748b";

        return `
            <tr>
                <td>${date}</td>
                <td><span style="color: ${statusColor}; font-weight: bold;">${job.status}</span></td>
                <td>${job.totalAccounts}</td>
                <td>${job.completedCount}</td>
                <td>${job.failedCount}</td>
            </tr>
        `;
    }).join("");

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Scraping History Report</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .meta { font-size: 14px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
            th { background-color: #f8f9fa; font-weight: 600; color: #444; }
            .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Scraping History Report</h1>
            <div class="meta">
                Generated: ${generatedAt}<br>
                Filter: ${filters.startDate || "All time"} - ${filters.endDate || "Present"} | Status: ${filters.status || "All"}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Success</th>
                    <th>Failed</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <div class="footer">
            Social Media Statistic Dashboard &copy; ${new Date().getFullYear()}
        </div>
    </body>
    </html>
    `;
}
