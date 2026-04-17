import { type JobStatus, type Prisma, prisma } from "@repo/database";
import puppeteer from "puppeteer";
import { generateCombinedReportHtml } from "../../scraping/services/comparison-template";
import { generateReportHtml } from "../../scraping/services/template";

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
    sourceMetadata?: {
        month1SourceLabel?: string;
        month2SourceLabel?: string;
    };
}

interface QuarterlyExportData {
    periodLabel: string;
    baselineLabel: string;
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
        sourceMonths: Array<{
            label: string;
            sourceLabel: string;
        }>;
        baselineSourceLabel: string;
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

interface IndividualQuarterlyExportData {
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
        profileStats?: {
            followers: number | null;
            following: number | null;
            totalPosts: number | null;
            isVerified: boolean | null;
            displayName: string | null;
        } | null;
        quarterSummary?: {
            quarterItemCount: number;
            totalLikes: number;
            totalComments: number;
            totalViews: number;
            totalShares?: number;
            totalSaves?: number;
            totalReposts?: number;
            totalQuotes?: number;
            totalBookmarks?: number;
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
            monthlyInteractionTotals?: Array<{
                key: string;
                label: string;
                contentCount: number;
                totalLikes: number;
                totalComments: number;
                totalViews: number;
                totalShares: number;
                totalSaves: number;
                totalReposts: number;
                totalQuotes: number;
                totalBookmarks: number;
                publicInteractions: number;
                publicReachInteractions: number | null;
            }>;
            isPopularMode: boolean;
        } | null;
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
        }>;
    }>;
    interactionGrowth?: Array<{
        platform: string;
        current: {
            publicInteractions: number;
            publicReachInteractions: number | null;
            coverageStatus: string;
        };
        absoluteDelta: number | null;
        percentDelta: number | null;
        reason: string | null;
        reachAbsoluteDelta: number | null;
        reachPercentDelta: number | null;
    }>;
}

interface IndividualQuarterComparisonExportData {
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
            take: 1000, // Limit to prevent massive exploits
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

    static async generateComparisonPdfV2(exportData: CombinedExportData): Promise<Buffer> {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const {
            generateCombinedReportHtmlV2,
        } = require("../../scraping/services/comparison-template-v2");

        const html = generateCombinedReportHtmlV2({
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
        const { generateLatestReportHtml } = require("../../scraping/services/latest-template");

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

    static async generateQuarterlyPdf(exportData: QuarterlyExportData): Promise<Buffer> {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const {
            generateQuarterlyReportHtml,
        } = require("../../scraping/services/quarterly-template");

        const html = generateQuarterlyReportHtml({
            ...exportData,
            generatedAt: new Date().toLocaleString("id-ID"),
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
                landscape: true,
                printBackground: true,
                margin: { top: "0", right: "0", bottom: "0", left: "0" },
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }

    static async generateIndividualQuarterlyPdf(
        exportData: IndividualQuarterlyExportData,
    ): Promise<Buffer> {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const {
            generateIndividualQuarterlyReportHtml,
        } = require("../../individual-reports/services/individual-quarterly-template");

        // Pre-download thumbnails and convert to base64 data URIs
        await ExportService.resolveAllThumbnails(exportData);

        const html = generateIndividualQuarterlyReportHtml({
            data: exportData,
            generatedAt: new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
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
                printBackground: true,
                margin: { top: "0", right: "0", bottom: "0", left: "0" },
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }

    static async generateIndividualQuarterComparisonPdf(
        exportData: IndividualQuarterComparisonExportData,
    ): Promise<Buffer> {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const {
            generateIndividualQuarterComparisonReportHtml,
        } = require("../../individual-reports/services/individual-quarter-comparison-template");

        const html = generateIndividualQuarterComparisonReportHtml({
            data: exportData,
            generatedAt: new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
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
                printBackground: true,
                margin: { top: "0", right: "0", bottom: "0", left: "0" },
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }

    /**
     * Download all thumbnail URLs in the export data and replace with base64 data URIs.
     * This prevents CDN blocking issues (Instagram/TikTok CDNs reject referrer-bearing requests).
     */
    private static async resolveAllThumbnails(data: IndividualQuarterlyExportData): Promise<void> {
        const items = data.results.flatMap((r) => r.enrichedItems ?? []);
        const withThumbs = items.flatMap((item) => {
            if (!item.thumbnailUrl || item.thumbnailUrl.startsWith("data:")) return [];
            return [{ item, thumbnailUrl: item.thumbnailUrl }];
        });

        if (withThumbs.length === 0) return;

        const results = await Promise.allSettled(
            withThumbs.map(async ({ item, thumbnailUrl }) => {
                const base64 = await ExportService.downloadThumbnailAsBase64(thumbnailUrl);
                if (base64) {
                    item.thumbnailUrl = base64;
                } else {
                    item.thumbnailUrl = null;
                }
            }),
        );

        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
            console.warn(`[thumbnails] ${failed}/${withThumbs.length} thumbnail downloads failed`);
        }
    }

    private static async downloadThumbnailAsBase64(url: string): Promise<string | null> {
        const normalizedUrl = ExportService.normalizeThumbnailUrl(url);
        if (!normalizedUrl) return null;

        let timeout: NodeJS.Timeout | null = null;
        try {
            const controller = new AbortController();
            timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(normalizedUrl, {
                signal: controller.signal,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "image/*",
                    Referer: ExportService.thumbnailReferer(normalizedUrl),
                },
            });

            if (!response.ok) return null;

            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.length === 0) return null;

            const contentType = ExportService.thumbnailContentType(
                response.headers.get("content-type"),
                buffer,
            );
            return `data:${contentType};base64,${buffer.toString("base64")}`;
        } catch {
            return null;
        } finally {
            if (timeout) clearTimeout(timeout);
        }
    }

    private static normalizeThumbnailUrl(url: string): string | null {
        const trimmed = url.trim().replaceAll("&amp;", "&");
        if (!trimmed || trimmed.startsWith("data:")) return null;
        const candidate = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;

        try {
            const parsed = new URL(candidate);
            if (!["http:", "https:"].includes(parsed.protocol)) return null;
            return parsed.toString();
        } catch {
            return null;
        }
    }

    private static thumbnailReferer(url: string) {
        try {
            const host = new URL(url).hostname;
            if (host.includes("tiktok")) return "https://www.tiktok.com/";
            if (host.includes("instagram") || host.includes("fbcdn")) {
                return "https://www.instagram.com/";
            }
        } catch {
            return "https://www.google.com/";
        }

        return "https://www.google.com/";
    }

    private static thumbnailContentType(contentType: string | null, buffer: Buffer) {
        if (contentType?.startsWith("image/")) return contentType.split(";")[0] || "image/jpeg";
        if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
        if (
            buffer
                .subarray(0, 8)
                .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        ) {
            return "image/png";
        }
        if (
            buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
            buffer.subarray(8, 12).toString("ascii") === "WEBP"
        ) {
            return "image/webp";
        }

        return "image/jpeg";
    }
}
