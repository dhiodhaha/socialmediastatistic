"use server";

import { type Platform, prisma } from "@repo/database";
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subMonths } from "date-fns";
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

interface QuarterlyJobReference {
    id: string;
    createdAt: Date;
    completedAt: Date | null;
}

export interface QuarterlyOption {
    id: string;
    year: number;
    quarter: number;
    label: string;
    desc: string;
    disabled: boolean;
}

export interface QuarterlyStatus {
    selectedYear: number;
    selectedQuarter: number;
    sourceMonths: Array<{
        key: string;
        label: string;
        hasAnchor: boolean;
        anchorJobId: string | null;
    }>;
    quarterEnd: {
        key: string;
        label: string;
        hasAnchor: boolean;
        anchorJobId: string | null;
    };
    baseline: {
        key: string;
        label: string;
        hasAnchor: boolean;
        anchorJobId: string | null;
    };
    availability: {
        isAvailable: boolean;
        reason: string;
    };
    coverage: {
        quarterEndCaptured: number;
        fullQuarterCaptured: number;
        totalAccounts: number;
    };
    warnings: string[];
}

function monthKey(date: Date) {
    return format(date, "yyyy-MM");
}

function monthLabel(date: Date) {
    return format(date, "MMM yyyy");
}

function quarterMonthStarts(year: number, quarter: number) {
    const startMonthIndex = (quarter - 1) * 3;
    return [0, 1, 2].map((offset) => new Date(year, startMonthIndex + offset, 1));
}

function latestCompletedJobByMonth(jobs: QuarterlyJobReference[]) {
    const map = new Map<string, QuarterlyJobReference>();

    for (const job of jobs) {
        const referenceDate = job.completedAt || job.createdAt;
        const key = monthKey(referenceDate);
        const existing = map.get(key);

        if (
            !existing ||
            referenceDate.getTime() >
                ((existing.completedAt || existing.createdAt) as Date).getTime()
        ) {
            map.set(key, job);
        }
    }

    return map;
}

function buildQuarterOption(
    year: number,
    quarter: number,
    jobsByMonth: Map<string, QuarterlyJobReference>,
) {
    const quarterMonths = quarterMonthStarts(year, quarter);
    const quarterEndMonth = quarterMonths[2];
    const quarterEndKey = monthKey(quarterEndMonth);
    const hasQuarterEnd = jobsByMonth.has(quarterEndKey);
    const missingMonths = quarterMonths.filter((month) => !jobsByMonth.has(monthKey(month)));

    let desc = `${monthLabel(quarterMonths[0])} - ${monthLabel(quarterMonths[2])}`;
    if (!hasQuarterEnd) {
        desc = `Unavailable: missing quarter-end snapshot (${monthLabel(quarterEndMonth)})`;
    } else if (missingMonths.length > 0) {
        desc = `Available with warnings: missing ${missingMonths
            .map((month) => monthLabel(month))
            .join(", ")}`;
    }

    return {
        id: `${year}-Q${quarter}`,
        year,
        quarter,
        label: `Q${quarter} ${year}`,
        desc,
        disabled: !hasQuarterEnd,
    } satisfies QuarterlyOption;
}

export function deriveQuarterlyOptions(jobs: QuarterlyJobReference[]): QuarterlyOption[] {
    const jobsByMonth = latestCompletedJobByMonth(jobs);
    const years = Array.from(
        new Set(jobs.map((job) => (job.completedAt || job.createdAt).getFullYear())),
    ).sort((a, b) => b - a);

    return years.flatMap((year) =>
        [1, 2, 3, 4].map((quarter) => buildQuarterOption(year, quarter, jobsByMonth)),
    );
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
        },
    });

    const jobsByMonth = latestCompletedJobByMonth(jobs);
    const quarterMonths = quarterMonthStarts(year, quarter);
    const quarterEndMonth = quarterMonths[2];
    const baselineMonth = subMonths(quarterEndMonth, 3);

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

    const accounts = await prisma.account.findMany({
        where: whereClause,
        select: {
            id: true,
            instagram: true,
            tiktok: true,
            twitter: true,
            snapshots: {
                where: {
                    scrapedAt: {
                        gte: startOfMonth(quarterMonths[0]),
                        lte: endOfMonth(quarterEndMonth),
                    },
                },
                select: {
                    platform: true,
                    scrapedAt: true,
                },
            },
        },
    });

    const sourceMonths = quarterMonths.map((month) => {
        const key = monthKey(month);
        const job = jobsByMonth.get(key) || null;

        return {
            key,
            label: monthLabel(month),
            hasAnchor: !!job,
            anchorJobId: job?.id || null,
        };
    });

    const quarterEndKey = monthKey(quarterEndMonth);
    const quarterEndJob = jobsByMonth.get(quarterEndKey) || null;
    const baselineKey = monthKey(baselineMonth);
    const baselineJob = jobsByMonth.get(baselineKey) || null;

    const quarterEndRange = {
        start: startOfDay(startOfMonth(quarterEndMonth)),
        end: endOfDay(endOfMonth(quarterEndMonth)),
    };

    let quarterEndCaptured = 0;
    let fullQuarterCaptured = 0;
    for (const account of accounts) {
        const accountPlatforms = [
            account.instagram ? "INSTAGRAM" : null,
            account.tiktok ? "TIKTOK" : null,
            account.twitter ? "TWITTER" : null,
        ].filter(Boolean);

        const hasQuarterEnd = account.snapshots.some(
            (snapshot) =>
                snapshot.scrapedAt >= quarterEndRange.start &&
                snapshot.scrapedAt <= quarterEndRange.end &&
                accountPlatforms.includes(snapshot.platform),
        );

        if (hasQuarterEnd) {
            quarterEndCaptured++;
        }

        const monthsCovered = new Set(
            account.snapshots
                .filter((snapshot) => accountPlatforms.includes(snapshot.platform))
                .map((snapshot) => monthKey(snapshot.scrapedAt)),
        );

        if (quarterMonths.every((month) => monthsCovered.has(monthKey(month)))) {
            fullQuarterCaptured++;
        }
    }

    const missingMonths = sourceMonths.filter((month) => !month.hasAnchor);
    const warnings: string[] = [];

    if (missingMonths.length > 0) {
        warnings.push(
            `Missing supporting month snapshots: ${missingMonths
                .map((month) => month.label)
                .join(", ")}.`,
        );
    }

    if (!baselineJob) {
        warnings.push(
            `Previous quarter baseline unavailable for ${monthLabel(baselineMonth)}. Quarter-over-quarter comparison will degrade gracefully.`,
        );
    }

    return {
        selectedYear: year,
        selectedQuarter: quarter,
        sourceMonths,
        quarterEnd: {
            key: quarterEndKey,
            label: monthLabel(quarterEndMonth),
            hasAnchor: !!quarterEndJob,
            anchorJobId: quarterEndJob?.id || null,
        },
        baseline: {
            key: baselineKey,
            label: monthLabel(baselineMonth),
            hasAnchor: !!baselineJob,
            anchorJobId: baselineJob?.id || null,
        },
        availability: quarterEndJob
            ? {
                  isAvailable: true,
                  reason: "Quarter available for review",
              }
            : {
                  isAvailable: false,
                  reason: `Quarter unavailable: missing quarter-end snapshot for ${monthLabel(
                      quarterEndMonth,
                  )}.`,
              },
        coverage: {
            quarterEndCaptured,
            fullQuarterCaptured,
            totalAccounts: accounts.length,
        },
        warnings,
    };
}

function calculateGrowth(
    oldVal: number,
    newVal: number,
    key: "followers" | "posts" | "likes",
): { [K in `${typeof key}Val` | `${typeof key}Pct`]: number } {
    const valDiff = newVal - oldVal;
    let pct = 0;

    if (oldVal > 0) {
        pct = (valDiff / oldVal) * 100;
    } else if (newVal > 0) {
        pct = 100;
    }

    // Use type assertion to satisfy TypeScript
    return {
        [`${key}Val`]: valDiff,
        [`${key}Pct`]: pct,
    } as { [K in `${typeof key}Val` | `${typeof key}Pct`]: number };
}

/**
 * Fetch available completed jobs for the dropdown.
 */
export async function getScrapingJobsForReport() {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    return prisma.scrapingJob.findMany({
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
        },
    });
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
