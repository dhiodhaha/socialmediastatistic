"use server";

import { type Platform, prisma } from "@repo/database";
import { endOfDay, endOfMonth, startOfDay, startOfMonth, subMonths } from "date-fns";
import { resolveMonthlyReportingAnchors } from "@/modules/analytics/lib/monthly-reporting";
import type { QuarterlyExportData } from "@/modules/analytics/lib/quarterly-export";
import {
    buildQuarterlyPlatformPreview,
    type QuarterlyPlatformPreview,
} from "@/modules/analytics/lib/quarterly-platform-preview";
import {
    buildQuarterlyStatus,
    deriveQuarterlyOptions,
    getQuarterlyAnchorJobIds,
    type QuarterlyOption,
    type QuarterlyStatus,
} from "@/modules/analytics/lib/quarterly-reporting";
import { calculateGrowth } from "@/modules/analytics/lib/report-metrics";
import { auth } from "@/shared/lib/auth";

export interface ComparisonRow {
    accountId: string;
    accountName: string; // The "Nama Unit" (username in db)
    handle: string; // The specific platform handle
    category: string; // Display category
    platform: Platform;
    oldStats: { followers: number; posts: number; likes?: number };
    newStats: { followers: number; posts: number; likes?: number };
    delta: {
        followersVal: number;
        followersPct: number;
        postsVal: number;
        postsPct: number;
        likesVal?: number;
        likesPct?: number;
    };
}

export async function getComparisonData(
    jobId1: string,
    jobId2: string,
    categoryId?: string,
    includeNA?: boolean,
): Promise<ComparisonRow[]> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    // 1. Get the reference jobs to know the dates
    const [job1, job2] = await Promise.all([
        prisma.scrapingJob.findUnique({ where: { id: jobId1 } }),
        prisma.scrapingJob.findUnique({ where: { id: jobId2 } }),
    ]);

    if (!job1 || !job2 || !job1.completedAt || !job2.completedAt) {
        throw new Error("One or both jobs not found or not completed");
    }

    // Define date ranges for matching (full day of the job)
    const range1 = {
        start: startOfDay(job1.completedAt),
        end: endOfDay(job1.completedAt),
    };
    const range2 = {
        start: startOfDay(job2.completedAt),
        end: endOfDay(job2.completedAt),
    };

    // 2. Fetch all accounts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { isActive: true };
    if (categoryId) {
        // Many-to-many: filter via join table
        whereClause.categories = {
            some: {
                category: {
                    id: categoryId,
                },
            },
        };
    }

    const accounts = await prisma.account.findMany({
        where: whereClause,
        include: {
            snapshots: {
                where: {
                    OR: [
                        {
                            scrapedAt: {
                                gte: range1.start,
                                lte: range1.end,
                            },
                        },
                        {
                            scrapedAt: {
                                gte: range2.start,
                                lte: range2.end,
                            },
                        },
                    ],
                },
                orderBy: { scrapedAt: "desc" },
            },
            categories: {
                include: {
                    category: true,
                },
            },
        },
    });

    const rows: ComparisonRow[] = [];
    const allPlatforms: Platform[] = ["INSTAGRAM", "TIKTOK", "TWITTER"];

    for (const account of accounts) {
        // Determine which platforms to include
        const platformsToCheck = includeNA ? allPlatforms : [];

        if (!includeNA) {
            // Only include platforms the account actually has
            if (account.instagram) platformsToCheck.push("INSTAGRAM");
            if (account.tiktok) platformsToCheck.push("TIKTOK");
            if (account.twitter) platformsToCheck.push("TWITTER");
        }

        const categoryName =
            account.categories.length > 0
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  account.categories.map((c: any) => c.category.name).join(", ")
                : "Official Account";

        for (const platform of platformsToCheck) {
            // Check if account has this platform
            let handle = "";
            let hasThisPlatform = false;

            if (platform === "INSTAGRAM") {
                handle = account.instagram || "";
                hasThisPlatform = !!account.instagram;
            } else if (platform === "TIKTOK") {
                handle = account.tiktok || "";
                hasThisPlatform = !!account.tiktok;
            } else if (platform === "TWITTER") {
                handle = account.twitter || "";
                hasThisPlatform = !!account.twitter;
            }

            // Skip if not including N/A and account doesn't have this platform
            if (!includeNA && !hasThisPlatform) continue;

            // Find snapshots for this platform and the two date ranges
            // We use date matching instead of strict Job ID matching to handle shared entities
            const snapshot1 = account.snapshots.find(
                (s) =>
                    s.platform === platform &&
                    s.scrapedAt >= range1.start &&
                    s.scrapedAt <= range1.end,
            );

            const snapshot2 = account.snapshots.find(
                (s) =>
                    s.platform === platform &&
                    s.scrapedAt >= range2.start &&
                    s.scrapedAt <= range2.end,
            );

            // If account doesn't have this platform, show as N/A
            if (!hasThisPlatform) {
                rows.push({
                    accountId: account.id,
                    accountName: account.username,
                    handle: "N/A",
                    category: categoryName,
                    platform,
                    oldStats: { followers: -1, posts: -1, likes: -1 }, // -1 indicates N/A
                    newStats: { followers: -1, posts: -1, likes: -1 },
                    delta: {
                        followersVal: 0,
                        followersPct: 0,
                        postsVal: 0,
                        postsPct: 0,
                        likesVal: 0,
                        likesPct: 0,
                    },
                });
                continue;
            }

            // Use 0 if snapshot missing
            const s1 = snapshot1 || { followers: 0, posts: 0, likes: 0 };
            const s2 = snapshot2 || { followers: 0, posts: 0, likes: 0 };

            // Calculate deltas using helper
            rows.push({
                accountId: account.id,
                accountName: account.username,
                handle,
                category: categoryName,
                platform,
                oldStats: {
                    followers: s1.followers || 0,
                    posts: s1.posts || 0,
                    likes: s1.likes || 0,
                },
                newStats: {
                    followers: s2.followers || 0,
                    posts: s2.posts || 0,
                    likes: s2.likes || 0,
                },
                delta: {
                    ...calculateGrowth(s1.followers || 0, s2.followers || 0, "followers"),
                    ...calculateGrowth(s1.posts || 0, s2.posts || 0, "posts"),
                    ...calculateGrowth(s1.likes || 0, s2.likes || 0, "likes"),
                },
            });
        }
    }

    return rows;
}

export async function getQuarterlyOptions(): Promise<QuarterlyOption[]> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const jobs = await prisma.scrapingJob.findMany({
        where: {
            status: "COMPLETED",
            completedAt: { not: null },
        },
        orderBy: { completedAt: "desc" },
        select: {
            id: true,
            createdAt: true,
            completedAt: true,
            reportingYear: true,
            reportingMonth: true,
        },
    });

    return deriveQuarterlyOptions(jobs);
}

export async function getQuarterlyStatus(
    year: number,
    quarter: number,
    categoryId?: string,
): Promise<QuarterlyStatus> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const whereClause = categoryId
        ? {
              isActive: true,
              categories: {
                  some: {
                      category: { id: categoryId },
                  },
              },
          }
        : { isActive: true };

    const quarterStartMonth = new Date(year, (quarter - 1) * 3, 1);
    const quarterEndMonth = new Date(year, (quarter - 1) * 3 + 2, 1);

    const jobs = await prisma.scrapingJob.findMany({
        where: {
            status: "COMPLETED",
            completedAt: { not: null },
        },
        orderBy: { completedAt: "desc" },
        select: {
            id: true,
            createdAt: true,
            completedAt: true,
            reportingYear: true,
            reportingMonth: true,
        },
    });
    const anchorJobIds = getQuarterlyAnchorJobIds({ year, quarter, jobs });

    const accounts = await prisma.account.findMany({
        where: whereClause,
        select: {
            instagram: true,
            tiktok: true,
            twitter: true,
            snapshots: {
                where: {
                    OR: [
                        {
                            scrapedAt: {
                                gte: startOfMonth(quarterStartMonth),
                                lte: endOfMonth(quarterEndMonth),
                            },
                        },
                        ...(anchorJobIds.length > 0
                            ? [
                                  {
                                      jobId: {
                                          in: anchorJobIds,
                                      },
                                  },
                              ]
                            : []),
                    ],
                },
                select: {
                    platform: true,
                    scrapedAt: true,
                    jobId: true,
                },
            },
        },
    });

    return buildQuarterlyStatus({
        year,
        quarter,
        jobs,
        accounts,
    });
}

export async function getQuarterlyPreviewData(
    year: number,
    quarter: number,
    categoryId?: string,
): Promise<QuarterlyPlatformPreview> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const quarterEndMonth = new Date(year, (quarter - 1) * 3 + 2, 1);
    const baselineMonth = subMonths(quarterEndMonth, 3);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = categoryId
        ? {
              isActive: true,
              categories: {
                  some: {
                      category: { id: categoryId },
                  },
              },
          }
        : { isActive: true };

    const jobs = await prisma.scrapingJob.findMany({
        where: {
            status: "COMPLETED",
            completedAt: { not: null },
        },
        orderBy: { completedAt: "desc" },
        select: {
            id: true,
            createdAt: true,
            completedAt: true,
            reportingYear: true,
            reportingMonth: true,
        },
    });
    const anchorJobIds = getQuarterlyAnchorJobIds({ year, quarter, jobs, includeBaseline: true });

    const [accounts, selectedCategory] = await Promise.all([
        prisma.account.findMany({
            where: whereClause,
            select: {
                id: true,
                username: true,
                instagram: true,
                tiktok: true,
                twitter: true,
                categories: {
                    include: {
                        category: true,
                    },
                },
                snapshots: {
                    where: {
                        OR: [
                            {
                                scrapedAt: {
                                    gte: startOfMonth(baselineMonth),
                                    lte: endOfMonth(quarterEndMonth),
                                },
                            },
                            ...(anchorJobIds.length > 0
                                ? [
                                      {
                                          jobId: {
                                              in: anchorJobIds,
                                          },
                                      },
                                  ]
                                : []),
                        ],
                    },
                    orderBy: { scrapedAt: "desc" },
                    select: {
                        platform: true,
                        followers: true,
                        posts: true,
                        likes: true,
                        scrapedAt: true,
                        jobId: true,
                    },
                },
            },
        }),
        categoryId
            ? prisma.category.findUnique({
                  where: { id: categoryId },
                  select: { name: true },
              })
            : Promise.resolve(null),
    ]);

    const status = buildQuarterlyStatus({
        year,
        quarter,
        jobs,
        accounts: accounts.map((account) => ({
            instagram: account.instagram,
            tiktok: account.tiktok,
            twitter: account.twitter,
            snapshots: account.snapshots.map((snapshot) => ({
                platform: snapshot.platform,
                scrapedAt: snapshot.scrapedAt,
                jobId: snapshot.jobId,
            })),
        })),
    });

    return buildQuarterlyPlatformPreview({
        status,
        categoryFilterLabel: selectedCategory?.name || null,
        accounts: accounts.map((account) => ({
            id: account.id,
            username: account.username,
            instagram: account.instagram,
            tiktok: account.tiktok,
            twitter: account.twitter,
            categoryNames: account.categories.map((entry) => entry.category.name),
            snapshots: account.snapshots,
        })),
    });
}

/**
 * Fetch available completed jobs for the dropdown.
 */
export async function getScrapingJobsForReport() {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const jobs = await prisma.scrapingJob.findMany({
        where: {
            status: "COMPLETED",
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            createdAt: true,
            completedAt: true,
            totalAccounts: true,
            reportingYear: true,
            reportingMonth: true,
        },
    });

    return resolveMonthlyReportingAnchors(jobs);
}

interface ExportData {
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

/**
 * Export comparison report as PDF via worker service.
 * Returns base64 encoded PDF data.
 */
export async function exportComparisonPdf(exportData: ExportData): Promise<string> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerSecret) {
        throw new Error("WORKER_SECRET not configured");
    }

    const response = await fetch(`${workerUrl}/export/comparison-pdf`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify(exportData),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Export failed: ${response.status} - ${text}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
}

/**
 * Export comparison report as PDF V2 via worker service.
 * Returns base64 encoded PDF data.
 */
export async function exportComparisonPdfV2(exportData: ExportData): Promise<string> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerSecret) {
        throw new Error("WORKER_SECRET not configured");
    }

    const response = await fetch(`${workerUrl}/export/comparison-pdf-v2`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify(exportData),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Export V2 failed: ${response.status} - ${text}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
}

interface LatestExportData {
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
}

/**
 * Export quarterly executive report as PDF via worker service.
 * Returns base64 encoded PDF data.
 */
export async function exportQuarterlyPdf(exportData: QuarterlyExportData): Promise<string> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerSecret) {
        throw new Error("WORKER_SECRET not configured");
    }

    const response = await fetch(`${workerUrl}/export/quarterly-pdf`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify(exportData),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Quarterly export failed: ${response.status} - ${text}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
}

/**
 * Export latest report as PDF via worker service.
 * Returns base64 encoded PDF data.
 */
export async function exportLatestPdf(exportData: LatestExportData): Promise<string> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerSecret) {
        throw new Error("WORKER_SECRET not configured");
    }

    const response = await fetch(`${workerUrl}/export/latest-pdf`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify(exportData),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Export failed: ${response.status} - ${text}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
}
