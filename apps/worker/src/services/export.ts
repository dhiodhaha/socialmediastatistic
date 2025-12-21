import puppeteer from "puppeteer";
import { prisma, Prisma, JobStatus } from "@repo/database";
import { generateReportHtml } from "./template";

interface ExportFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
}

export class ExportService {
    static async generatePdf(filters: ExportFilters): Promise<Buffer> {
        const { startDate, endDate, status } = filters;

        // Build prisma query
        const where: Prisma.ScrapingJobWhereInput = {};
        if (status && status !== "ALL") where.status = status as JobStatus;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const jobs = await prisma.scrapingJob.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 1000 // Limit to prevent massive exploits
        });

        // Generate HTML
        const html = generateReportHtml({
            filteredJobs: jobs,
            filters: { startDate, endDate, status },
            generatedAt: new Date().toLocaleString(),
        });

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for some container envs
        });

        try {
            const page = await browser.newPage();

            // Set content and wait for load
            await page.setContent(html, { waitUntil: "networkidle0" });

            // Generate PDF buffer
            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
                margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }
}
