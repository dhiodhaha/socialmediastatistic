import { prisma, type Platform } from "@repo/database";
import type { ScrapeResult } from "@repo/types";
import { logger } from "../lib/logger";
import { sendDiscordNotification } from "../lib/discord";

// Configuration
const BATCH_SIZE = 50;
const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const MAX_RETRIES = 3;

// Cancellation tracking (in-memory, per-process)
const cancelledJobs = new Set<string>();

export async function cancelJob(jobId: string): Promise<void> {
    cancelledJobs.add(jobId);
    logger.info({ jobId }, "Job marked for cancellation");

    // Force update DB status immediately to handle zombie jobs
    // (e.g. if worker restarted and lost in-memory state)
    try {
        const job = await prisma.scrapingJob.findUnique({
            where: { id: jobId },
            select: { errors: true }
        });

        const currentErrors = (job?.errors as { accountId: string; platform: string; error: string }[]) || [];

        await prisma.scrapingJob.update({
            where: { id: jobId },
            data: {
                status: "FAILED",
                completedAt: new Date(),
                errors: [...currentErrors, {
                    accountId: "system",
                    platform: "SYSTEM",
                    handle: "",
                    error: "Stopped by user",
                    timestamp: new Date().toISOString()
                }]
            }
        });
    } catch (error) {
        logger.error({ jobId, error }, "Failed to force update cancelled job status");
    }
}

export function isJobCancelled(jobId: string): boolean {
    return cancelledJobs.has(jobId);
}


function clearCancellation(jobId: string): void {
    cancelledJobs.delete(jobId);
}

import { parsePlatformData } from "./parsers";

interface ScrapeTask {
    accountId: string;
    platform: Platform;
    handle: string;
}

/**
 * Main scraping job runner.
 * Creates a job, returns the ID immediately, then processes in background.
 * 
 * Smart deduplication: Skips account+platform combinations already scraped today
 * to avoid wasting API credits when categories overlap.
 */
export async function runScrapingJob(categoryId?: string): Promise<string> {
    logger.info({ categoryId }, "Starting scraping job");

    // Fetch active accounts (optionally filtered by category via many-to-many)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { isActive: true };
    if (categoryId) {
        // Many-to-many: filter via join table
        whereClause.categories = {
            some: { categoryId: categoryId }
        };
    }

    const accounts = await prisma.account.findMany({
        where: whereClause,
    });

    // Generate tasks (flatten accounts into platform-specific tasks)
    const tasks: ScrapeTask[] = [];
    for (const account of accounts) {
        if (account.instagram && account.instagram.trim().length > 0) {
            tasks.push({ accountId: account.id, platform: "INSTAGRAM", handle: account.instagram.trim() });
        }
        if (account.tiktok && account.tiktok.trim().length > 0) {
            tasks.push({ accountId: account.id, platform: "TIKTOK", handle: account.tiktok.trim() });
        }
        if (account.twitter && account.twitter.trim().length > 0) {
            tasks.push({ accountId: account.id, platform: "TWITTER", handle: account.twitter.trim() });
        }
    }

    // Daily Job Merging Logic:
    // Check if a completed job exists for today (for this category).
    // If yes, we reuse it and only scrape active accounts that are MISSING from it.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existingJob = await prisma.scrapingJob.findFirst({
        where: {
            createdAt: { gte: todayStart },
            status: "COMPLETED",
            categoryId: categoryId || null
            // Note: If categoryId is undefined, we look for global jobs (null).
        },
        orderBy: { createdAt: "desc" }
    });

    let jobId: string;
    let jobTasks: ScrapeTask[] = tasks;
    let initialCompletedCount = 0;
    let initialFailedCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let initialErrors: any[] = [];

    if (existingJob) {
        logger.info({ existingJobId: existingJob.id }, "Found existing job for today - Checking for missing data");

        // Find which accounts/platforms already have data in this job
        const existingSnapshots = await prisma.snapshot.findMany({
            where: { jobId: existingJob.id },
            select: { accountId: true, platform: true }
        });

        const existingSet = new Set(
            existingSnapshots.map(s => `${s.accountId}:${s.platform}`)
        );

        // Filter tasks to only those MISSING or OUTDATED in the existing job
        jobTasks = tasks.filter(t => {
            // 1. Check if Missing
            const hasData = existingSet.has(`${t.accountId}:${t.platform}`);
            if (!hasData) return true; // Missing -> Scrape it

            // 2. Check if Outdated (Auto-Detect Update)
            // specificAcct is efficient because accounts are already fetched in memory
            const account = accounts.find(a => a.id === t.accountId);
            if (account) {
                // precise comparison: active modification time vs job start time
                // if account was updated AFTER the job was created, we re-scrape
                if (account.updatedAt > existingJob.createdAt) {
                    return true; // Outdated -> Scrape again (Smart Update)
                }
            }

            return false; // Valid & Up-to-date -> Skip
        });

        if (jobTasks.length === 0) {
            logger.info({ jobId: existingJob.id }, "Existing job is already complete for all active accounts. Skipping.");
            return existingJob.id;
        }

        logger.info({ jobId: existingJob.id, newTasks: jobTasks.length }, "Resuming existing job to fill missing data");

        // Reuse existing job
        jobId = existingJob.id;
        initialCompletedCount = existingJob.completedCount;
        initialFailedCount = existingJob.failedCount;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialErrors = (existingJob.errors as any[]) || [];

        // Update job status to RUNNING and update total accounts
        // We set totalAccounts to the CURRENT total of active accounts (accounts.length)
        // because the previous total might have been smaller.
        await prisma.scrapingJob.update({
            where: { id: jobId },
            data: {
                status: "RUNNING",
                totalAccounts: accounts.length
            }
        });

    } else {
        // Create NEW Job
        const job = await prisma.scrapingJob.create({
            data: {
                status: "RUNNING",
                totalAccounts: accounts.length,
                startedAt: new Date(),
                categoryId: categoryId || null,
            },
        });
        jobId = job.id;
        logger.info({ jobId: job.id, totalTasks: jobTasks.length }, "Created new scraping job");
    }

    // Process in background (don't await)
    // Pass initial counts for resuming
    processScrapingJob(jobId, accounts, jobTasks, initialCompletedCount, initialFailedCount, initialErrors).catch((error) => {
        logger.error({ jobId, error }, "Scraping job processing failed");
    });

    // Return job ID immediately
    return jobId;
}

/**
 * Process the scraping job (called asynchronously).
 */
async function processScrapingJob(
    jobId: string,
    accounts: Awaited<ReturnType<typeof prisma.account.findMany>>,
    tasks: ScrapeTask[],
    initialCompletedCount: number = 0,
    initialFailedCount: number = 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialErrors: any[] = []
): Promise<void> {
    const errors: Array<{
        accountId: string;
        platform: string;
        handle: string;
        error: string;
        timestamp: string;
    }> = [...initialErrors];
    let completedCount = initialCompletedCount;
    let failedCount = initialFailedCount;

    try {
        // Process tasks in batches
        for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
            // Check if job was cancelled
            if (isJobCancelled(jobId)) {
                logger.info({ jobId }, "Job cancelled by user");
                await prisma.scrapingJob.update({
                    where: { id: jobId },
                    data: { status: "FAILED", completedAt: new Date(), errors: [...errors, { accountId: "system", platform: "SYSTEM", handle: "", error: "Cancelled by user", timestamp: new Date().toISOString() }] },
                });
                clearCancellation(jobId);
                return;
            }

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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const snapshotData: any = {
                        accountId: result.accountId!,
                        platform: result.platform,
                        followers: result.data.followers,
                        following: result.data.following,
                        posts: result.data.posts,
                        engagement: result.data.engagement || 0,
                        jobId: jobId,
                    };

                    // Only include likes for TikTok to avoid stale Prisma Client errors for other platforms
                    // and because it's semantically null for others
                    if (result.platform === "TIKTOK") {
                        snapshotData.likes = result.data.likes;
                    }

                    await prisma.snapshot.create({
                        data: snapshotData,
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
                where: { id: jobId },
                data: { completedCount, failedCount, errors },
            });

            // Delay between batches to avoid rate limiting
            if (i + BATCH_SIZE < tasks.length) {
                await sleep(DELAY_BETWEEN_BATCHES_MS);
            }
        }

        // Mark job as completed
        const finalStatus = failedCount === tasks.length ? "FAILED" : "COMPLETED";

        await prisma.scrapingJob.update({
            where: { id: jobId },
            data: {
                status: finalStatus,
                completedAt: new Date(),
            },
        });

        logger.info(
            { jobId, completedCount, failedCount, status: finalStatus },
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
    } catch (error) {
        // Fallback: Always mark job as FAILED on unhandled error
        logger.error({ jobId, error }, "Unhandled error in scraping job");

        try {
            await prisma.scrapingJob.update({
                where: { id: jobId },
                data: {
                    status: "FAILED",
                    completedAt: new Date(),
                    completedCount,
                    failedCount,
                    errors: [...errors, {
                        accountId: "system",
                        platform: "SYSTEM",
                        handle: "",
                        error: error instanceof Error ? error.message : "Unknown error",
                        timestamp: new Date().toISOString(),
                    }],
                },
            });
        } catch (dbError) {
            logger.error({ jobId, dbError }, "Failed to update job status after error");
        }

        throw error;
    }
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

    await Promise.all(executing);
    return results;
}

/**
 * Scrape a single account with exponential backoff retry.
 */
async function scrapeWithRetry(
    platform: Platform,
    handle: string,
    accountId?: string
): Promise<ScrapeResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await scrapeAccount(platform, handle);
            // Add accountId to the result if provided
            return { ...result, accountId };
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
        accountId,
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

    // Sanitize handle: remove leading @ and whitespace
    const cleanHandle = handle.trim().replace(/^@/, "");
    const encodedHandle = encodeURIComponent(cleanHandle);

    // ScrapeCreatorsAPI endpoints by platform
    const endpoints: Record<Platform, string> = {
        INSTAGRAM: `https://api.scrapecreators.com/v1/instagram/profile?handle=${encodedHandle}`,
        TIKTOK: `https://api.scrapecreators.com/v1/tiktok/profile?handle=${encodedHandle}`,
        TWITTER: `https://api.scrapecreators.com/v1/twitter/profile?handle=${encodedHandle}`,
    };

    const url = endpoints[platform];
    logger.info({ platform, handle, cleanHandle, url }, "Scraping account...");

    try {
        const response = await fetch(url, {
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const text = await response.text();
            logger.error({ platform, handle, status: response.status, body: text }, "Scrape API Error");
            throw new Error(`API error: ${response.status} ${response.statusText} - ${text.substring(0, 100)}`);
        }

        // Use generic unknown for initial parse, then delegate
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await response.json()) as any;

        // Log successful raw data for debugging if needed (using debug level)
        // logger.debug({ platform, handle, data }, "Scrape raw data received");

        // Delegate parsing to dedicated parser (SRP)
        const stats = parsePlatformData(platform, handle, data);

        return {
            success: true,
            platform,
            handle,
            data: stats,
        };

    } catch (e) {
        // Enhance error catching to log if it wasn't caught above
        if (e instanceof Error) {
            // logger.error({ platform, handle, error: e.message }, "ScrapeAccount caught error");
        }
        throw e;
    }
}

/**
 * Sleep utility for delays.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry scraping only for accounts that failed in the latest completed job.
 * Saves snapshots to the ORIGINAL job to keep data together.
 */
export async function retryFailedAccounts(): Promise<{
    success: boolean;
    jobId?: string;
    failedCount?: number;
    error?: string;
}> {
    logger.info("Starting retry for failed accounts");

    // Get the latest completed job with errors
    const latestJob = await prisma.scrapingJob.findFirst({
        where: {
            status: "COMPLETED",
            failedCount: { gt: 0 }
        },
        orderBy: { completedAt: "desc" },
        select: {
            id: true,
            errors: true,
            completedCount: true,
            failedCount: true,
            totalAccounts: true
        }
    });

    if (!latestJob || !latestJob.errors) {
        return { success: false, error: "No failed accounts found to retry" };
    }

    const originalJobId = latestJob.id;
    const errors = latestJob.errors as Array<{
        accountId: string;
        platform: string;
        handle: string;
        error: string;
    }>;

    // Get unique account IDs from errors (exclude "system" errors)
    const failedAccountIds = [...new Set(errors.map(e => e.accountId).filter(id => id !== "system"))];

    if (failedAccountIds.length === 0) {
        return { success: false, error: "No valid failed accounts to retry" };
    }

    // Fetch the failed accounts
    const accounts = await prisma.account.findMany({
        where: {
            id: { in: failedAccountIds },
            isActive: true
        }
    });

    if (accounts.length === 0) {
        return { success: false, error: "Failed accounts are no longer active" };
    }

    // Generate tasks for the failed accounts
    const tasks: ScrapeTask[] = [];
    for (const account of accounts) {
        // Check which platforms failed for this account
        const accountErrors = errors.filter(e => e.accountId === account.id);
        const failedPlatforms = new Set(accountErrors.map(e => e.platform));

        // Only retry platforms that failed
        if (failedPlatforms.has("INSTAGRAM") && account.instagram) {
            tasks.push({ accountId: account.id, platform: "INSTAGRAM" as Platform, handle: account.instagram });
        }
        if (failedPlatforms.has("TIKTOK") && account.tiktok) {
            tasks.push({ accountId: account.id, platform: "TIKTOK" as Platform, handle: account.tiktok });
        }
        if (failedPlatforms.has("TWITTER") && account.twitter) {
            tasks.push({ accountId: account.id, platform: "TWITTER" as Platform, handle: account.twitter });
        }
    }

    if (tasks.length === 0) {
        return { success: false, error: "No valid tasks to retry (handles may have been removed)" };
    }

    // Set the original job back to RUNNING so it shows in job logs
    await prisma.scrapingJob.update({
        where: { id: originalJobId },
        data: { status: "RUNNING" }
    });

    logger.info({ jobId: originalJobId, totalTasks: tasks.length }, "Retrying failed accounts for original job");

    // Process retry in background, saving to the ORIGINAL job
    processRetryJob(originalJobId, accounts, tasks, latestJob.completedCount, latestJob.failedCount).catch((error) => {
        logger.error({ jobId: originalJobId, error }, "Retry processing failed");
    });

    return {
        success: true,
        jobId: originalJobId,
        failedCount: tasks.length
    };
}

/**
 * Process retry job - saves snapshots to the original job and updates its counts.
 */
async function processRetryJob(
    jobId: string,
    accounts: Awaited<ReturnType<typeof prisma.account.findMany>>,
    tasks: ScrapeTask[],
    originalCompletedCount: number,
    originalFailedCount: number
): Promise<void> {
    let completedCount = originalCompletedCount;
    let failedCount = originalFailedCount;
    const newErrors: Array<{
        accountId: string;
        platform: string;
        handle: string;
        error: string;
        timestamp: string;
    }> = [];

    // Process tasks in batches
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);

        // Scrape batch with concurrency
        const results = await Promise.all(
            batch.map((task) =>
                scrapeWithRetry(task.platform, task.handle, task.accountId)
            )
        );

        // Process results
        for (const result of results) {
            if (result.success && result.data) {
                const snapshotData: Parameters<typeof prisma.snapshot.create>[0]["data"] = {
                    accountId: result.accountId!,
                    platform: result.platform,
                    followers: result.data.followers,
                    following: result.data.following,
                    posts: result.data.posts,
                    engagement: result.data.engagement,
                    jobId: jobId, // Use ORIGINAL job ID
                };

                if (result.platform === "TIKTOK") {
                    snapshotData.likes = result.data.likes;
                }

                await prisma.snapshot.create({
                    data: snapshotData,
                });
                completedCount++;
                failedCount--; // Reduce failed count since we succeeded
            } else {
                // Still failed
                newErrors.push({
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
            where: { id: jobId },
            data: {
                completedCount,
                failedCount,
                errors: newErrors.length > 0 ? newErrors : [],
            },
        });

        // Delay between batches
        if (i + BATCH_SIZE < tasks.length) {
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
    }

    // Set job back to COMPLETED
    await prisma.scrapingJob.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date() }
    });

    logger.info({ jobId, completedCount, failedCount, retriedTasks: tasks.length }, "Retry job completed");
}
