import puppeteer from "puppeteer";
import { prisma, Prisma, JobStatus } from "@repo/database";
import { generateReportHtml } from "./template";
import { generateCombinedReportHtml } from "./comparison-template";

interface ExportFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
}

interface CombinedExportData {
    sections: Array<{
        platform: string;
        data: Array<{
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
        }>;
    }>;
    month1: string;
    month2: string;
    includeCover?: boolean;
    customTitle?: string;
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

    static async generateComparisonPdf(exportData: CombinedExportData): Promise<Buffer> {
        const html = generateCombinedReportHtml({
            sections: exportData.sections,
            month1: exportData.month1,
            month2: exportData.month2,
            generatedAt: new Date().toLocaleString("id-ID"),
            includeCover: exportData.includeCover,
            customTitle: exportData.customTitle,
        });

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "networkidle0" });

            const pdfBuffer = await page.pdf({
                format: "A4",
                landscape: true, // Landscape for comparison table
                printBackground: true,
                margin: { top: "15px", right: "15px", bottom: "15px", left: "15px" },
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }
    static async generateLatestPdf(exportData: {
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
        includeCover?: boolean;
        customTitle?: string;
    }): Promise<Buffer> {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { generateLatestReportHtml } = require("./latest-template");

        const html = generateLatestReportHtml({
            sections: exportData.sections,
            month: exportData.month,
            generatedAt: new Date().toLocaleString("id-ID"),
            includeCover: exportData.includeCover,
            customTitle: exportData.customTitle,
        });

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "networkidle0" });

            const pdfBuffer = await page.pdf({
                width: "1920px",
                height: "1080px",
                printBackground: true,
                margin: { top: "0", right: "0", bottom: "0", left: "0" }, // Full bleed for 1920x1080 design
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }
}
