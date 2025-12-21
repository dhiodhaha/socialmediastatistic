import { prisma, type Platform } from "@repo/database";
import type { ScrapeResult } from "@repo/types";
import { logger } from "../lib/logger";
import { sendDiscordNotification } from "../lib/discord";

// Configuration
const BATCH_SIZE = 50;
const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const MAX_RETRIES = 3;

interface ScrapeTask {
    accountId: string;
    platform: Platform;
    handle: string;
}

interface ScrapeCreatorsResponse {
    // Instagram
    follower_count?: number;
    following_count?: number;
    media_count?: number;

    // TikTok
    stats?: {
        followerCount?: number;
        followingCount?: number;
        videoCount?: number;
        heartCount?: number;
    };

    // Twitter
    data?: {
        user?: {
            legacy?: {
                followers_count?: number;
                friends_count?: number;
                statuses_count?: number;
            }
        }
    }
}

/**
 * Main scraping job runner.
 * Fetches all active accounts and scrapes them in batches.
 */
export async function runScrapingJob(): Promise<void> {
    logger.info("Starting scraping job");

    // Fetch active accounts
    const accounts = await prisma.account.findMany({
        where: { isActive: true },
    });

    // Generate tasks (flatten accounts into platform-specific tasks)
    const tasks: ScrapeTask[] = [];
    for (const account of accounts) {
        if (account.instagram) {
            tasks.push({ accountId: account.id, platform: "INSTAGRAM", handle: account.instagram });
        }
        if (account.tiktok) {
            tasks.push({ accountId: account.id, platform: "TIKTOK", handle: account.tiktok });
        }
        if (account.twitter) {
            tasks.push({ accountId: account.id, platform: "TWITTER", handle: account.twitter });
        }
    }

    const job = await prisma.scrapingJob.create({
        data: {
            status: "RUNNING",
            totalAccounts: accounts.length, // Keeping this as accounts count for now, or should be tasks.length? 
            // The schema likely expects "totalAccounts" but maybe "totalTasks" is more accurate. 
            // Let's stick to totalAccounts for consistency with the field name, 
            // but we process tasks.
            startedAt: new Date(),
        },
    });

    logger.info({ jobId: job.id, totalAccounts: accounts.length, totalTasks: tasks.length }, "Job created");

    const errors: Array<{
        accountId: string;
        platform: string;
        handle: string;
        error: string;
        timestamp: string;
    }> = [];
    let completedCount = 0;
    let failedCount = 0;

    // Process tasks in batches
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);
        logger.info(
            { batchStart: i, batchSize: batch.length },
            "Processing batch"
        );

        // Process batch with concurrency control
        const results = await processBatchWithConcurrency(batch, CONCURRENCY);

        // Save results to database
        for (const result of results) {
            if (result.success && result.data) {
                // Ensure platform is saved if included in schema.
                // Assuming Snapshot model has 'platform' field based on errors.
                await prisma.snapshot.create({
                    data: {
                        accountId: result.accountId!,
                        platform: result.platform, // Added this field
                        followers: result.data.followers,
                        following: result.data.following,
                        posts: result.data.posts,
                        engagement: result.data.engagement,
                        jobId: job.id,
                    },
                });
                completedCount++;
            } else {
                failedCount++;
                errors.push({
                    accountId: result.accountId!,
                    platform: result.platform,
                    handle: result.handle,
                    error: result.error || "Unknown error",
                    timestamp: new Date().toISOString(),
                });
            }
        }

        // Update job progress
        await prisma.scrapingJob.update({
            where: { id: job.id },
            data: { completedCount, failedCount, errors },
        });

        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < tasks.length) {
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
    }

    // Mark job as completed
    // Note: completedCount is now based on TASKS, not ACCOUNTS.
    // If we want to strictly track accounts, we should deduplicate.
    // But for now, we report task completion.
    const finalStatus = failedCount === tasks.length ? "FAILED" : "COMPLETED";

    await prisma.scrapingJob.update({
        where: { id: job.id },
        data: {
            status: finalStatus,
            completedAt: new Date(),
        },
    });

    logger.info(
        { jobId: job.id, completedCount, failedCount, status: finalStatus },
        "Scraping job finished"
    );

    // Send Discord notification
    await sendDiscordNotification({
        title: `Scraping Job ${finalStatus}`,
        description: `Processed: ${completedCount}/${tasks.length} handles`,
        color: finalStatus === "COMPLETED" ? 0x00ff00 : 0xff0000,
        fields: [
            { name: "Total Accounts", value: String(accounts.length), inline: true },
            { name: "Total Tasks", value: String(tasks.length), inline: true },
            { name: "Successful", value: String(completedCount), inline: true },
            { name: "Failed", value: String(failedCount), inline: true },
        ],
    });
}

/**
 * Process a batch of tasks with concurrency control.
 */
async function processBatchWithConcurrency(
    tasks: ScrapeTask[],
    concurrency: number
): Promise<Array<ScrapeResult & { accountId: string }>> {
    const results: Array<ScrapeResult & { accountId: string }> = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
        const promise = scrapeWithRetry(task.platform, task.handle)
            .then((result) => {
                results.push({ ...result, accountId: task.accountId });
            })
            .catch((error) => {
                results.push({
                    success: false,
                    platform: task.platform,
                    handle: task.handle,
                    accountId: task.accountId,
                    error: error.message,
                });
            });

        executing.push(promise as Promise<void>);

        if (executing.length >= concurrency) {
            await Promise.race(executing);
            // Remove completed promises
            for (let i = executing.length - 1; i >= 0; i--) {
                const status = await Promise.race([
                    executing[i].then(() => "done"),
                    Promise.resolve("pending"),
                ]);
                if (status === "done") {
                    executing.splice(i, 1);
                }
            }
        }
    }

    // Wait for remaining promises
    await Promise.all(executing);

    return results;
}

/**
 * Scrape a single account with exponential backoff retry.
 */
async function scrapeWithRetry(
    platform: Platform,
    handle: string
): Promise<ScrapeResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await scrapeAccount(platform, handle);
        } catch (error) {
            lastError = error as Error;
            logger.warn(
                { platform, handle, attempt, error: lastError.message },
                "Scrape attempt failed"
            );

            if (attempt < MAX_RETRIES) {
                // Exponential backoff: 1s, 2s, 4s
                await sleep(Math.pow(2, attempt - 1) * 1000);
            }
        }
    }

    return {
        success: false,
        platform,
        handle,
        error: lastError?.message || "Max retries exceeded",
    };
}

async function scrapeAccount(
    platform: Platform,
    handle: string
): Promise<ScrapeResult> {
    const apiKey = process.env.SCRAPECREATORS_API_KEY;

    if (!apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY not configured");
    }

    // ScrapeCreatorsAPI endpoints by platform
    const endpoints: Record<Platform, string> = {
        INSTAGRAM: `https://api.scrapecreators.com/v1/instagram/basic-profile?username=${handle}`,
        TIKTOK: `https://api.scrapecreators.com/v1/tiktok/profile?username=${handle}`,
        TWITTER: `https://api.scrapecreators.com/v1/twitter/profile?username=${handle}`,
    };

    const response = await fetch(endpoints[platform], {
        headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Use specific type to avoid 'unknown' error
    const data = await response.json() as ScrapeCreatorsResponse;
    const stats = {
        followers: 0,
        following: 0,
        posts: 0,
        engagement: 0,
    };

    // Specific parsing per platform based on docs
    if (platform === "INSTAGRAM") {
        stats.followers = data.follower_count || 0;
        stats.following = data.following_count || 0;
        stats.posts = data.media_count || 0;
    } else if (platform === "TIKTOK") {
        const s = data.stats || {};
        stats.followers = s.followerCount || 0;
        stats.following = s.followingCount || 0;
        stats.posts = s.videoCount || 0;
    } else if (platform === "TWITTER") {
        const legacy = data.data?.user?.legacy || {};
        stats.followers = legacy.followers_count || 0;
        stats.following = legacy.friends_count || 0;
        stats.posts = legacy.statuses_count || 0;
    }

    return {
        success: true,
        platform,
        handle,
        data: stats,
    };
}

/**
 * Sleep utility for delays.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
