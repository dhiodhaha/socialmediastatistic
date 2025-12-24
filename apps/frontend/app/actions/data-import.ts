"use server";

import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";

export interface SnapshotImportInput {
    account_username: string;
    platform: string;
    scraped_at: string;
    followers: number;
    following?: number | null;
    posts?: number | null;
    engagement?: number | null;
    likes?: number | null;
}

export interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
}

const VALID_PLATFORMS = ["INSTAGRAM", "TIKTOK", "TWITTER"];

export async function bulkImportSnapshots(data: SnapshotImportInput[]): Promise<ImportResult> {
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    // Pre-fetch all accounts
    const accounts = await prisma.account.findMany({
        select: { id: true, username: true, instagram: true, tiktok: true, twitter: true }
    });

    // Build lookup maps for each platform (handle -> accountId)
    const instagramMap = new Map<string, string>();
    const tiktokMap = new Map<string, string>();
    const twitterMap = new Map<string, string>();
    const usernameMap = new Map<string, string>(); // fallback by display name

    for (const account of accounts) {
        if (account.instagram) instagramMap.set(account.instagram.toLowerCase(), account.id);
        if (account.tiktok) tiktokMap.set(account.tiktok.toLowerCase(), account.id);
        if (account.twitter) twitterMap.set(account.twitter.toLowerCase(), account.id);
        usernameMap.set(account.username.toLowerCase(), account.id);
    }

    // Group data by date to create jobs
    const dateGroups = new Map<string, { accountIds: Set<string>; rows: typeof data }>();

    // First pass: validate and group by date
    const validatedRows: Array<{
        row: SnapshotImportInput;
        rowNum: number;
        accountId: string;
        platform: string;
        scrapedAt: Date;
        dateKey: string;
    }> = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2;

        // Validate platform first
        const platform = row.platform.toUpperCase();
        if (!VALID_PLATFORMS.includes(platform)) {
            errors.push(`Row ${rowNum}: Invalid platform "${row.platform}". Must be INSTAGRAM, TIKTOK, or TWITTER.`);
            skipped++;
            continue;
        }

        // Find account by social handle based on platform
        const handle = row.account_username.toLowerCase();
        let accountId: string | undefined;

        if (platform === "INSTAGRAM") {
            accountId = instagramMap.get(handle);
        } else if (platform === "TIKTOK") {
            accountId = tiktokMap.get(handle);
        } else if (platform === "TWITTER") {
            accountId = twitterMap.get(handle);
        }

        // Fallback: try matching by display name
        if (!accountId) {
            accountId = usernameMap.get(handle);
        }

        if (!accountId) {
            errors.push(`Row ${rowNum}: No account found with handle "${row.account_username}" for ${platform}.`);
            skipped++;
            continue;
        }

        // Parse date
        const scrapedAt = new Date(row.scraped_at);
        if (isNaN(scrapedAt.getTime())) {
            errors.push(`Row ${rowNum}: Invalid date "${row.scraped_at}".`);
            skipped++;
            continue;
        }

        // Validate followers
        if (typeof row.followers !== "number" || row.followers < 0) {
            errors.push(`Row ${rowNum}: Invalid followers count.`);
            skipped++;
            continue;
        }

        const dateKey = scrapedAt.toISOString().split('T')[0];
        validatedRows.push({ row, rowNum, accountId, platform, scrapedAt, dateKey });

        // Group by date for job creation
        if (!dateGroups.has(dateKey)) {
            dateGroups.set(dateKey, { accountIds: new Set(), rows: [] });
        }
        dateGroups.get(dateKey)!.accountIds.add(accountId);
    }

    // Create a ScrapingJob for each unique date
    const dateJobMap = new Map<string, string>();
    for (const [dateKey, group] of dateGroups) {
        const jobDate = new Date(dateKey);
        const job = await prisma.scrapingJob.create({
            data: {
                status: "COMPLETED",
                totalAccounts: group.accountIds.size,
                completedCount: group.accountIds.size,
                createdAt: jobDate,
                completedAt: jobDate,
            }
        });
        dateJobMap.set(dateKey, job.id);
    }

    // Second pass: create snapshots with jobId
    for (const { row, rowNum, accountId, platform, scrapedAt, dateKey } of validatedRows) {
        try {
            // Check for duplicate
            const existingSnapshot = await prisma.snapshot.findFirst({
                where: {
                    accountId,
                    platform: platform as "INSTAGRAM" | "TIKTOK" | "TWITTER",
                    scrapedAt: {
                        gte: new Date(scrapedAt.toDateString()),
                        lt: new Date(new Date(scrapedAt.toDateString()).getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            });

            if (existingSnapshot) {
                errors.push(`Row ${rowNum}: Duplicate snapshot for "${row.account_username}" on ${row.scraped_at} (${platform}).`);
                skipped++;
                continue;
            }

            await prisma.snapshot.create({
                data: {
                    accountId,
                    jobId: dateJobMap.get(dateKey)!,
                    platform: platform as "INSTAGRAM" | "TIKTOK" | "TWITTER",
                    scrapedAt,
                    followers: row.followers,
                    following: row.following ?? null,
                    posts: row.posts ?? null,
                    engagement: row.engagement ?? null,
                    likes: row.likes ?? null,
                }
            });
            imported++;
        } catch (e) {
            console.error(`Row ${rowNum} import error:`, e);
            errors.push(`Row ${rowNum}: Database error.`);
            skipped++;
        }
    }

    revalidatePath("/history");
    revalidatePath("/accounts");
    revalidatePath("/reports");

    return { success: true, imported, skipped, errors };
}

/**
 * Generates a CSV template for data import.
 */
export async function getImportTemplate(): Promise<string> {
    const headers = [
        "account_username",
        "platform",
        "scraped_at",
        "followers",
        "following",
        "posts",
        "engagement",
        "likes"
    ];

    const exampleRow = [
        "Kementerian Keuangan",
        "INSTAGRAM",
        "2024-11-30",
        "500000",
        "100",
        "2500",
        "1.5",
        ""
    ];

    return [headers.join(","), exampleRow.join(",")].join("\n");
}
