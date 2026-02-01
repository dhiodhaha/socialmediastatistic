"use server";

import { prisma, Platform } from "@repo/database";

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

import { startOfDay, endOfDay } from "date-fns";

export async function getComparisonData(
    jobId1: string,
    jobId2: string,
    categoryId?: string,
    includeNA?: boolean
): Promise<ComparisonRow[]> {
    // 1. Get the reference jobs to know the dates
    const [job1, job2] = await Promise.all([
        prisma.scrapingJob.findUnique({ where: { id: jobId1 } }),
        prisma.scrapingJob.findUnique({ where: { id: jobId2 } })
    ]);

    if (!job1 || !job2 || !job1.completedAt || !job2.completedAt) {
        throw new Error("One or both jobs not found or not completed");
    }

    // Define date ranges for matching (full day of the job)
    const range1 = {
        start: startOfDay(job1.completedAt),
        end: endOfDay(job1.completedAt)
    };
    const range2 = {
        start: startOfDay(job2.completedAt),
        end: endOfDay(job2.completedAt)
    };

    // 2. Fetch all accounts 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { isActive: true };
    if (categoryId) {
        // Many-to-many: filter via join table
        whereClause.categories = {
            some: {
                category: {
                    id: categoryId
                }
            }
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
                                lte: range1.end
                            }
                        },
                        {
                            scrapedAt: {
                                gte: range2.start,
                                lte: range2.end
                            }
                        }
                    ]
                },
                orderBy: { scrapedAt: "desc" }
            },
            categories: {
                include: {
                    category: true
                }
            }
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

        const categoryName = account.categories.length > 0
            ? account.categories.map((c: any) => c.category.name).join(", ")
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
            const snapshot1 = account.snapshots.find(s => 
                s.platform === platform && 
                s.scrapedAt >= range1.start && 
                s.scrapedAt <= range1.end
            );

            const snapshot2 = account.snapshots.find(s => 
                s.platform === platform && 
                s.scrapedAt >= range2.start && 
                s.scrapedAt <= range2.end
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
                    delta: { followersVal: 0, followersPct: 0, postsVal: 0, postsPct: 0, likesVal: 0, likesPct: 0 },
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
    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerSecret) {
        throw new Error("WORKER_SECRET not configured");
    }

    const response = await fetch(`${workerUrl}/export/latest-pdf`, {
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
