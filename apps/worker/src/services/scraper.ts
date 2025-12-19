import { prisma, type Platform } from "@repo/database";
import type { ScrapeResult } from "@repo/types";
import { logger } from "../lib/logger";
import { sendDiscordNotification } from "../lib/discord";

// Configuration
const BATCH_SIZE = 50;
const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const MAX_RETRIES = 3;

/**
 * Main scraping job runner.
 * Fetches all active accounts and scrapes them in batches.
 */
export async function runScrapingJob(): Promise<void> {
    logger.info("Starting scraping job");

    // Create a new job record
    const accounts = await prisma.account.findMany({
        where: { isActive: true },
    });

    const job = await prisma.scrapingJob.create({
        data: {
            status: "RUNNING",
            totalAccounts: accounts.length,
            startedAt: new Date(),
        },
    });

    logger.info({ jobId: job.id, totalAccounts: accounts.length }, "Job created");

    const errors: Array<{
        accountId: string;
        platform: string;
        handle: string;
        error: string;
        timestamp: string;
    }> = [];
    let completedCount = 0;
    let failedCount = 0;

    // Process accounts in batches
    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
        const batch = accounts.slice(i, i + BATCH_SIZE);
        logger.info(
            { batchStart: i, batchSize: batch.length },
            "Processing batch"
        );

        // Process batch with concurrency control
        const results = await processBatchWithConcurrency(batch, CONCURRENCY);

        // Save results to database
        for (const result of results) {
            if (result.success && result.data) {
                await prisma.snapshot.create({
                    data: {
                        accountId: result.accountId!,
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
        if (i + BATCH_SIZE < accounts.length) {
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
    }

    // Mark job as completed
    const finalStatus = failedCount === accounts.length ? "FAILED" : "COMPLETED";
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
        description: `Completed: ${completedCount}/${accounts.length} accounts`,
        color: finalStatus === "COMPLETED" ? 0x00ff00 : 0xff0000,
        fields: [
            { name: "Total Accounts", value: String(accounts.length), inline: true },
            { name: "Successful", value: String(completedCount), inline: true },
            { name: "Failed", value: String(failedCount), inline: true },
        ],
    });
}

/**
 * Process a batch of accounts with concurrency control.
 */
async function processBatchWithConcurrency(
    accounts: Array<{ id: string; platform: Platform; handle: string }>,
    concurrency: number
): Promise<Array<ScrapeResult & { accountId?: string }>> {
    const results: Array<ScrapeResult & { accountId?: string }> = [];
    const executing: Promise<void>[] = [];

    for (const account of accounts) {
        const promise = scrapeWithRetry(account.platform, account.handle)
            .then((result) => {
                results.push({ ...result, accountId: account.id });
            })
            .catch((error) => {
                results.push({
                    success: false,
                    platform: account.platform,
                    handle: account.handle,
                    accountId: account.id,
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

/**
 * Scrape a single account using ScrapeCreatorsAPI.
 */
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
        INSTAGRAM: `https://api.scrapecreators.com/v1/instagram/user/${handle}`,
        TIKTOK: `https://api.scrapecreators.com/v1/tiktok/user/${handle}`,
        TWITTER: `https://api.scrapecreators.com/v1/twitter/user/${handle}`,
    };

    const response = await fetch(endpoints[platform], {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
        followers_count?: number;
        follower_count?: number;
        following_count?: number;
        friends_count?: number;
        posts_count?: number;
        media_count?: number;
        statuses_count?: number;
        engagement_rate?: number;
    };

    // Map API response to our format (adjust based on actual API response structure)
    return {
        success: true,
        platform,
        handle,
        data: {
            followers: data.followers_count || data.follower_count || 0,
            following: data.following_count || data.friends_count,
            posts: data.posts_count || data.media_count || data.statuses_count,
            engagement: data.engagement_rate,
        },
    };
}

/**
 * Sleep utility for delays.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
