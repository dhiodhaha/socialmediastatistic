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

export async function getComparisonData(jobId1: string, jobId2: string): Promise<ComparisonRow[]> {
    // 1. Fetch details of both jobs to ensure they exist and get dates (optional, for sorting?)
    // Actually we just need the snapshots associated with these jobIds.

    // 2. Fetch all accounts to have the base list
    const accounts = await prisma.account.findMany({
        where: { isActive: true },
        include: {
            snapshots: {
                where: {
                    jobId: { in: [jobId1, jobId2] },
                },
            },
        },
    });

    const rows: ComparisonRow[] = [];

    for (const account of accounts) {
        // For each platform this account has, we generate a comparison row
        // Check which platforms are active/present
        const platforms: Platform[] = [];
        if (account.instagram) platforms.push("INSTAGRAM");
        if (account.tiktok) platforms.push("TIKTOK");
        if (account.twitter) platforms.push("TWITTER");

        for (const platform of platforms) {
            // Find snapshots for this platform and the two jobs
            const snapshot1 = account.snapshots.find(s => s.jobId === jobId1 && s.platform === platform);
            const snapshot2 = account.snapshots.find(s => s.jobId === jobId2 && s.platform === platform);

            // Use 0 if snapshot missing (e.g. account didn't exist then or failed)
            const s1 = snapshot1 || { followers: 0, posts: 0, likes: 0 };
            const s2 = snapshot2 || { followers: 0, posts: 0, likes: 0 };

            let handle = "";
            if (platform === "INSTAGRAM") handle = account.instagram || "";
            else if (platform === "TIKTOK") handle = account.tiktok || "";
            else if (platform === "TWITTER") handle = account.twitter || "";

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
    platform: string;
    month1: string;
    month2: string;
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

