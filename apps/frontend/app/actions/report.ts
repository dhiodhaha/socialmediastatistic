"use server";

import { prisma } from "@repo/database";
import { Platform } from "@prisma/client";

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

            // Calculate deltas
            // Assuming jobId1 is "OLD" and jobId2 is "NEW".
            // If the user selects them in reverse, the frontend might need to swap, 
            // or we expect the caller to pass them in order (old, new).
            // Let's assume order: (oldJobId, newJobId)

            const followersDiff = (s2.followers || 0) - (s1.followers || 0);
            const postsDiff = (s2.posts || 0) - (s1.posts || 0);

            // Percentage calculation
            // If old is 0, pct is 100% if new > 0, else 0? Or N/A.
            // Be careful with division by zero.
            let followersPct = 0;
            if (s1.followers && s1.followers > 0) {
                followersPct = (followersDiff / s1.followers) * 100;
            } else if (s2.followers && s2.followers > 0) {
                followersPct = 100; // New growth
            }

            let postsPct = 0;
            if (s1.posts && s1.posts > 0) {
                postsPct = (postsDiff / s1.posts) * 100;
            } else if (s2.posts && s2.posts > 0) {
                postsPct = 100;
            }

            let handle = "";
            if (platform === "INSTAGRAM") handle = account.instagram || "";
            else if (platform === "TIKTOK") handle = account.tiktok || "";
            else if (platform === "TWITTER") handle = account.twitter || "";

            // Likes calculation (only for TikTok)
            const likesDiff = ((s2 as any).likes || 0) - ((s1 as any).likes || 0);
            let likesPct = 0;
            if ((s1 as any).likes && (s1 as any).likes > 0) {
                likesPct = (likesDiff / (s1 as any).likes) * 100;
            } else if ((s2 as any).likes && (s2 as any).likes > 0) {
                likesPct = 100;
            }

            rows.push({
                accountId: account.id,
                accountName: account.username, // Nama Unit
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
                    followersVal: followersDiff,
                    followersPct,
                    postsVal: postsDiff,
                    postsPct,
                    likesVal: likesDiff,
                    likesPct,
                },
            });
        }
    }

    return rows;
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

