"use server";

import { prisma, Platform } from "@repo/database";

export interface ComparisonRow {
    accountId: string;
    accountName: string; // The "Nama Unit" (username in db)
    handle: string; // The specific platform handle
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
    includeNA?: boolean
): Promise<ComparisonRow[]> {
    // Fetch all accounts to have the base list
    const whereClause: any = { isActive: true };
    if (categoryId) {
        whereClause.categoryId = categoryId;
    }

    const accounts = await prisma.account.findMany({
        where: whereClause,
        include: {
            snapshots: {
                where: {
                    jobId: { in: [jobId1, jobId2] },
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

            // Find snapshots for this platform and the two jobs
            const snapshot1 = account.snapshots.find(s => s.jobId === jobId1 && s.platform === platform);
            const snapshot2 = account.snapshots.find(s => s.jobId === jobId2 && s.platform === platform);

            // If account doesn't have this platform, show as N/A
            if (!hasThisPlatform) {
                rows.push({
                    accountId: account.id,
                    accountName: account.username,
                    handle: "N/A",
                    platform,
                    oldStats: { followers: -1, posts: -1, likes: -1 }, // -1 indicates N/A
                    newStats: { followers: -1, posts: -1, likes: -1 },
                    delta: { followersVal: 0, followersPct: 0, postsVal: 0, postsPct: 0, likesVal: 0, likesPct: 0 },
                });
                continue;
            }

            // Use 0 if snapshot missing (e.g. account didn't exist then or failed)
            const s1 = snapshot1 || { followers: 0, posts: 0, likes: 0 };
            const s2 = snapshot2 || { followers: 0, posts: 0, likes: 0 };

            // Calculate deltas using helper
            rows.push({
                accountId: account.id,
                accountName: account.username,
                handle,
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


function calculateGrowth(
    oldVal: number,
    newVal: number,
    key: "followers" | "posts" | "likes"
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
        }
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
    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerSecret) {
        throw new Error("WORKER_SECRET not configured");
    }

    const response = await fetch(`${workerUrl}/export/comparison-pdf`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${workerSecret}`,
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
 * Get all dates that have snapshot data (for calendar display)
 */
export async function getAvailableDates(): Promise<string[]> {
    const snapshots = await prisma.snapshot.findMany({
        select: { scrapedAt: true },
        distinct: ['scrapedAt'],
        orderBy: { scrapedAt: 'desc' }
    });

    // Group by date (not datetime) - return unique dates
    const dates = new Set<string>();
    for (const s of snapshots) {
        dates.add(s.scrapedAt.toISOString().split('T')[0]);
    }

    return Array.from(dates);
}

/**
 * Get comparison data by date range instead of job ID
 * This includes both scraped and imported historical data
 */
export async function getComparisonDataByDate(
    date1: string,
    date2: string,
    categoryId?: string
): Promise<ComparisonRow[]> {
    const d1Start = new Date(date1);
    const d1End = new Date(new Date(date1).getTime() + 24 * 60 * 60 * 1000);
    const d2Start = new Date(date2);
    const d2End = new Date(new Date(date2).getTime() + 24 * 60 * 60 * 1000);

    const whereClause: any = { isActive: true };
    if (categoryId) {
        whereClause.categoryId = categoryId;
    }

    const accounts = await prisma.account.findMany({
        where: whereClause,
        include: {
            snapshots: {
                where: {
                    OR: [
                        { scrapedAt: { gte: d1Start, lt: d1End } },
                        { scrapedAt: { gte: d2Start, lt: d2End } },
                    ]
                },
            },
        },
    });

    const rows: ComparisonRow[] = [];

    for (const account of accounts) {
        const platforms: Platform[] = [];
        if (account.instagram) platforms.push("INSTAGRAM");
        if (account.tiktok) platforms.push("TIKTOK");
        if (account.twitter) platforms.push("TWITTER");

        for (const platform of platforms) {
            // Find snapshots for this platform on each date
            const snapshot1 = account.snapshots.find(
                s => s.platform === platform && s.scrapedAt >= d1Start && s.scrapedAt < d1End
            );
            const snapshot2 = account.snapshots.find(
                s => s.platform === platform && s.scrapedAt >= d2Start && s.scrapedAt < d2End
            );

            // Skip if no data for either date
            if (!snapshot1 && !snapshot2) continue;

            const s1 = snapshot1 || { followers: 0, posts: 0, likes: 0 };
            const s2 = snapshot2 || { followers: 0, posts: 0, likes: 0 };

            let handle = "";
            if (platform === "INSTAGRAM") handle = account.instagram || "";
            else if (platform === "TIKTOK") handle = account.tiktok || "";
            else if (platform === "TWITTER") handle = account.twitter || "";

            rows.push({
                accountId: account.id,
                accountName: account.username,
                handle,
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
