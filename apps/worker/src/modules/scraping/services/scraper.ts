import { prisma, type Platform } from "@repo/database";
import type { ScrapeResult } from "@repo/types";
import { logger } from "../../../shared/lib/logger";
import { sendDiscordNotification } from "../../../shared/lib/discord";

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
 * Global Smart Scraping: 
 * 1. Checks if a job for this category is already RUNNING.
 * 2. Deduplicates at the handle level: Skips handle+platform combinations already scraped today
 *    anywhere in the system to save API credits.
 * 3. Smart Update: Re-scrapes only if account was modified after today's snapshot.
 */
export async function runScrapingJob(categoryId?: string): Promise<string> {
    logger.info({ categoryId }, "Starting scraping job trigger");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Guard: Check if a job with same category (or global) is already RUNNING
    const runningJob = await prisma.scrapingJob.findFirst({
        where: {
            status: "RUNNING",
            categoryId: categoryId || null
        },
        orderBy: { createdAt: "desc" }
    });

    if (runningJob) {
        logger.info({ runningJobId: runningJob.id }, "Found already running job for this category. Joining status tracking.");
        return runningJob.id;
    }

    // 2. Fetch active accounts (filtered by category if provided)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { isActive: true };
    if (categoryId) {
        whereClause.categories = {
            some: { categoryId: categoryId }
        };
    }

    const accounts = await prisma.account.findMany({
        where: whereClause,
    });

    if (accounts.length === 0) {
        throw new Error("No active accounts found to scrape");
    }

    // 3. Global Deduplication Logic:
    // Find ALL snapshots created today for ALL relevant accounts
    const todaysSnapshots = await prisma.snapshot.findMany({
        where: {
            scrapedAt: { gte: todayStart },
            accountId: { in: accounts.map(a => a.id) }
        },
        select: { accountId: true, platform: true, scrapedAt: true }
    });

    // Create a map of accountId:platform -> latest scrapedAt today
    const snapshotMap = new Map<string, Date>();
    for (const s of todaysSnapshots) {
        const key = `${s.accountId}:${s.platform}`;
        const existing = snapshotMap.get(key);
        if (!existing || s.scrapedAt > existing) {
            snapshotMap.set(key, s.scrapedAt);
        }
    }

    // 4. Generate Tasks with Smart Filtering
    const jobTasks: ScrapeTask[] = [];
    for (const account of accounts) {
        const platforms: Array<{ name: Platform; handle: string | null }> = [
            { name: "INSTAGRAM", handle: account.instagram },
            { name: "TIKTOK", handle: account.tiktok },
            { name: "TWITTER", handle: account.twitter },
        ];

        for (const p of platforms) {
            if (!p.handle || p.handle.trim().length === 0) continue;

            const trimmedHandle = p.handle.trim();
            const snapshotKey = `${account.id}:${p.name}`;
            const lastScrapedToday = snapshotMap.get(snapshotKey);

            // Logic:
            // - If Never scraped today -> Scrape
            // - If Scraped today but account was updated AFTER that snapshot -> Scrape (Smart Update)
            // - Otherwise -> Skip
            if (!lastScrapedToday || account.updatedAt > lastScrapedToday) {
                jobTasks.push({ accountId: account.id, platform: p.name, handle: trimmedHandle });
            }
        }
    }

    if (jobTasks.length === 0) {
        logger.info("All accounts already up-to-date for today. Skipping job creation.");
        // Try to return the latest completed job today if exists
        const latestToday = await prisma.scrapingJob.findFirst({
            where: {
                createdAt: { gte: todayStart },
                status: "COMPLETED",
                categoryId: categoryId || null
            },
            orderBy: { createdAt: "desc" }
        });
        return latestToday?.id || "already-synced";
    }

    // 5. Job Merging: Check if we can reuse an existing job for today
    let jobId: string;
    let initialCompletedCount = 0;
    let initialFailedCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let initialErrors: any[] = [];

    const existingJob = await prisma.scrapingJob.findFirst({
        where: {
            createdAt: { gte: todayStart },
            categoryId: categoryId || null
        },
        orderBy: { createdAt: "desc" }
    });

    if (existingJob) {
        logger.info({ jobId: existingJob.id, tasksToAdd: jobTasks.length }, "Merging tasks into existing daily job");
        jobId = existingJob.id;
        initialCompletedCount = existingJob.completedCount;
        initialFailedCount = existingJob.failedCount;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialErrors = (existingJob.errors as any[]) || [];

        // Set status to RUNNING if it was completed
        await prisma.scrapingJob.update({
            where: { id: jobId },
            data: {
                status: "RUNNING",
                totalAccounts: { increment: 0 } // Just ensuring we touch it, total might not strictly change if we are just updating
            }
        });
    } else {
        // Create NEW Job
        const job = await prisma.scrapingJob.create({
            data: {
                status: "RUNNING",
                totalAccounts: accounts.length, // Total in scope
                startedAt: new Date(),
                categoryId: categoryId || null,
            },
        });
        jobId = job.id;
        logger.info({ jobId: job.id, totalTasks: jobTasks.length }, "Created new scraping job");
    }

    // Process in background
    processScrapingJob(jobId, accounts, jobTasks, initialCompletedCount, initialFailedCount, initialErrors).catch((error) => {
        logger.error({ jobId, error }, "Scraping job processing failed");
    });

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

            // Save results to database (with Merge/Upsert Logic)
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

                    if (result.platform === "TIKTOK") {
                        snapshotData.likes = result.data.likes;
                    }

                    // CHECK FOR EXISTING SNAPSHOT IN THIS JOB (Merge Logic)
                    const existingSnapshot = await prisma.snapshot.findFirst({
                        where: {
                            jobId: jobId,
                            accountId: result.accountId!,
                            platform: result.platform
                        }
                    });

                    if (existingSnapshot) {
                        // Update existing snapshot (replace old data with new)
                        await prisma.snapshot.update({
                            where: { id: existingSnapshot.id },
                            data: {
                                ...snapshotData,
                                scrapedAt: new Date() // Update timestamp
                            }
                        });
                        // Don't increment completedCount since it was already counted previously
                        // But wait, if we are 'fixing' an error, maybe we should?
                        // If we are updating valid data with new valid data, count remains same.
                        // Ideally we should track 'updatedCount', but keeping it simple.
                    } else {
                        // Create new
                        await prisma.snapshot.create({
                            data: snapshotData,
                        });
                        completedCount++;
                    }

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
