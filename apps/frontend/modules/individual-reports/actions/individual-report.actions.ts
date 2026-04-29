"use server";

import { type Platform, prisma } from "@repo/database";
import { buildContentLevelPlan } from "@/modules/individual-reports/lib/content-reconstruction";
import {
    baselineMonthKey,
    buildIndividualQuarterlySnapshotSummary,
    DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
    DEFAULT_INDIVIDUAL_LISTING_PAGE_LIMIT,
    DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT,
    estimateIndividualReportCredits,
    type IndividualReportRequest,
    monthKey,
    quarterEndMonthKey,
    validateIndividualReportRequest,
} from "@/modules/individual-reports/lib/individual-quarterly-report";
import {
    buildSnapshotHistoryForExport,
    createRun,
    findIndividualReportRuns,
    findLatestSuccessfulPlatformResults,
    findQuarterSnapshots,
    getFailedPlatformsForPeriod,
    loadPlatformResultsByIds,
    loadRunWithPlatformResults,
    savePlatformResult,
    updateRunStatus,
} from "@/modules/individual-reports/lib/individual-report-persistence";
import {
    buildCoverageLabel,
    platformHandle,
} from "@/modules/individual-reports/lib/individual-report-platform";
import type {
    IndividualLiveReviewRequest,
    IndividualQuarterComparisonRequest,
    IndividualReportRunData,
    ManualQuarterSnapshotRequest,
    PlatformResultJson,
    WorkerCreditBalance,
    WorkerLiveReviewResult,
} from "@/modules/individual-reports/lib/individual-report-types";
import {
    INDIVIDUAL_REPORT_METHODOLOGY_NOTES,
    PUBLIC_INTERACTION_GROWTH_NOTE,
} from "@/modules/individual-reports/lib/individual-report-types";
import {
    validateManualSnapshotInput,
    validateQuarterComparisonInput,
} from "@/modules/individual-reports/lib/individual-report-validation";
import {
    callWorkerJson,
    callWorkerPdfBase64,
} from "@/modules/individual-reports/lib/individual-report-worker-client";
import {
    asInteractionResultJson,
    computeInteractionGrowth,
    requireInteractionResultJson,
} from "@/modules/individual-reports/lib/public-interaction-growth";
import { buildIndividualQuarterComparison } from "@/modules/individual-reports/lib/quarter-stat-comparison";
import { auth } from "@/shared/lib/auth";
import { isDemoMode } from "@/shared/lib/demo-mode";

export async function getIndividualReportAccountOptions() {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const accounts = await prisma.account.findMany({
        where: { isActive: true },
        orderBy: { username: "asc" },
        select: {
            id: true,
            username: true,
            instagram: true,
            tiktok: true,
            twitter: true,
        },
    });

    return accounts.map((account) => ({
        id: account.id,
        username: account.username,
        handles: {
            INSTAGRAM: account.instagram,
            TIKTOK: account.tiktok,
            TWITTER: account.twitter,
        },
    }));
}

export async function prepareIndividualQuarterlyReportDraft(input: IndividualReportRequest) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const validation = validateIndividualReportRequest(input);
    if (!validation.valid) {
        return { success: false as const, error: validation.error };
    }

    const account = await prisma.account.findUnique({
        where: { id: input.accountId },
        select: {
            id: true,
            username: true,
            instagram: true,
            tiktok: true,
            twitter: true,
            snapshots: {
                where: { platform: input.platform },
                orderBy: { scrapedAt: "desc" },
                select: {
                    followers: true,
                    posts: true,
                    likes: true,
                    scrapedAt: true,
                },
            },
        },
    });

    if (!account) {
        return { success: false as const, error: "Account not found." };
    }

    const handle = platformHandle(account, input.platform);
    if (!handle) {
        return { success: false as const, error: "Account does not have this platform handle." };
    }

    const baselineKey = baselineMonthKey(input.year, input.quarter);
    const quarterEndKey = quarterEndMonthKey(input.year, input.quarter);
    const baselineSnapshot =
        account.snapshots.find((snapshot) => monthKey(snapshot.scrapedAt) === baselineKey) || null;
    const quarterEndSnapshot =
        account.snapshots.find((snapshot) => monthKey(snapshot.scrapedAt) === quarterEndKey) ||
        null;

    return {
        success: true as const,
        data: {
            request: input,
            creditEstimate: estimateIndividualReportCredits({
                listingPageLimit: DEFAULT_INDIVIDUAL_LISTING_PAGE_LIMIT,
                detailedContentLimit: DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
            }),
            report: buildIndividualQuarterlySnapshotSummary({
                accountName: account.username,
                handle,
                platform: input.platform,
                year: input.year,
                quarter: input.quarter,
                baselineSnapshot,
                quarterEndSnapshot,
            }),
            contentLevelPlan: buildContentLevelPlan({
                listingPageLimit: DEFAULT_INDIVIDUAL_LISTING_PAGE_LIMIT,
                detailedContentLimit: DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
            }),
            executionModel: {
                mode: "manual-local-first",
                liveScrapingEnabled: false,
                note: "This foundation workflow prepares an objective draft only. Future content reconstruction will require explicit operator confirmation before external API calls.",
            },
        },
    };
}

export async function getIndividualReportCreditBalance() {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    try {
        const balance = await callWorkerJson<WorkerCreditBalance>(
            "/individual-reports/credit-balance",
            {
                method: "GET",
            },
        );
        return { success: true as const, data: balance };
    } catch (error) {
        return {
            success: false as const,
            error: error instanceof Error ? error.message : "Failed to fetch credit balance.",
        };
    }
}

export async function runIndividualQuarterlyLiveReview(input: IndividualLiveReviewRequest) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const listingPageLimit = input.listingPageLimit ?? DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT;
    const enrichedContentLimit =
        input.enrichedContentLimit ?? DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT;
    const platforms = Array.from(new Set(input.platforms));

    if (platforms.length === 0) {
        return { success: false as const, error: "Select at least one platform." };
    }

    for (const platform of platforms) {
        const validation = validateIndividualReportRequest({
            accountId: input.accountId,
            platform,
            year: input.year,
            quarter: input.quarter,
        });
        if (!validation.valid) {
            return { success: false as const, error: validation.error };
        }
    }

    const account = await prisma.account.findUnique({
        where: { id: input.accountId },
        select: { id: true, username: true, instagram: true, tiktok: true, twitter: true },
    });
    if (!account) {
        return { success: false as const, error: "Account not found." };
    }

    const runnablePlatforms = platforms
        .map((platform) => ({ platform, handle: platformHandle(account, platform) }))
        .filter((entry): entry is { platform: Platform; handle: string } => !!entry.handle);

    if (runnablePlatforms.length === 0) {
        return {
            success: false as const,
            error: "Selected account has no handles for the requested platform(s).",
        };
    }

    const estimatedCredits = estimateIndividualReportCredits({
        includeProfileRequest: false,
        listingPageLimit: listingPageLimit * runnablePlatforms.length,
        detailedContentLimit: 0,
    });

    // Create the run record first
    const run = await createRun({
        accountId: account.id,
        year: input.year,
        quarter: input.quarter,
        estimatedCredits: estimatedCredits.totalCredits,
    });

    // Scrape each platform and save results individually
    const platformResults: PlatformResultJson[] = [];
    for (const entry of runnablePlatforms) {
        let workerResult: WorkerLiveReviewResult;
        let platformStatus: "SUCCESS" | "FAILED";
        let errorMsg: string | undefined;

        try {
            workerResult = await callWorkerJson<WorkerLiveReviewResult>(
                "/individual-reports/live-review",
                {
                    method: "POST",
                    body: JSON.stringify({
                        platform: entry.platform,
                        handle: entry.handle,
                        year: input.year,
                        quarter: input.quarter,
                        listingPageLimit,
                        enrichedContentLimit,
                    }),
                },
            );
            platformStatus = workerResult.success ? "SUCCESS" : "FAILED";
            errorMsg = workerResult.error;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            workerResult = {
                platform: entry.platform,
                handle: entry.handle,
                success: false,
                error: msg,
                creditsUsed: 0,
                rawItemsFetched: 0,
                fetchedDateRange: { earliest: null, latest: null },
                diagnostics: [],
                coverage: {
                    status: "empty" as const,
                    totalContentItems: 0,
                    listingPagesFetched: 0,
                    reachedQuarterStart: false,
                    months: [],
                    note: msg,
                },
                enrichedItems: [],
            };
            platformStatus = "FAILED";
            errorMsg = msg;
        }

        const resultJson: PlatformResultJson = {
            ...workerResult,
            methodologyNotes: [...INDIVIDUAL_REPORT_METHODOLOGY_NOTES],
        };

        await savePlatformResult({
            runId: run.id,
            platform: entry.platform,
            handle: entry.handle,
            status: platformStatus,
            creditsUsed: workerResult.creditsUsed,
            resultJson,
            error: errorMsg,
        });

        platformResults.push(resultJson);
    }

    const totalCreditsUsed = platformResults.reduce((sum, r) => sum + r.creditsUsed, 0);
    const allSuccess = platformResults.every((r) => r.success);
    const anySuccess = platformResults.some((r) => r.success);
    const runStatus = allSuccess ? "COMPLETE" : anySuccess ? "PARTIAL" : "FAILED";

    await updateRunStatus(run.id, runStatus, totalCreditsUsed);

    return {
        success: true as const,
        data: {
            run: {
                id: run.id,
                createdAt: run.createdAt.toISOString(),
                status: runStatus,
            },
            account: { id: account.id, username: account.username },
            request: {
                accountId: input.accountId,
                platforms: runnablePlatforms.map((e) => e.platform),
                year: input.year,
                quarter: input.quarter,
                listingPageLimit,
                enrichedContentLimit,
            },
            estimatedCredits,
            actualCreditsUsed: totalCreditsUsed,
            results: platformResults,
        },
    };
}

export async function retryFailedPlatforms(input: {
    accountId: string;
    year: number;
    quarter: number;
    listingPageLimit?: number;
    enrichedContentLimit?: number;
}) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    // Find failed platforms across all runs for this account/year/quarter
    const failedPlatforms = await getFailedPlatformsForPeriod(
        input.accountId,
        input.year,
        input.quarter,
    );

    if (failedPlatforms.length === 0) {
        return {
            success: false as const,
            error: "No failed platforms found for this account/period.",
        };
    }

    return runIndividualQuarterlyLiveReview({
        accountId: input.accountId,
        platforms: failedPlatforms,
        year: input.year,
        quarter: input.quarter,
        listingPageLimit: input.listingPageLimit,
        enrichedContentLimit: input.enrichedContentLimit,
    });
}

export async function getSavedIndividualReportRuns(accountId?: string) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    return findIndividualReportRuns(accountId);
}

/**
 * Get the latest successful platform results for an account/year/quarter.
 * Used by the export composer to build the default selection.
 */
export async function getLatestSuccessfulPlatformResults(
    accountId: string,
    year: number,
    quarter: number,
) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    return findLatestSuccessfulPlatformResults(accountId, year, quarter);
}

export async function getIndividualQuarterComparison(input: IndividualQuarterComparisonRequest) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const platforms = Array.from(new Set(input.platforms));
    if (platforms.length === 0) {
        return { success: false as const, error: "Select at least one platform." };
    }

    const validationError = validateQuarterComparisonInput({
        accountId: input.accountId,
        current: input.current,
        comparison: input.comparison,
        platforms,
    });
    if (validationError) {
        return { success: false as const, error: validationError };
    }

    const account = await prisma.account.findUnique({
        where: { id: input.accountId },
        select: { id: true, username: true },
    });
    if (!account) {
        return { success: false as const, error: "Account not found." };
    }

    const [currentSnapshots, comparisonSnapshots] = await Promise.all([
        findQuarterSnapshots(input.accountId, input.current, platforms),
        findQuarterSnapshots(input.accountId, input.comparison, platforms),
    ]);

    return {
        success: true as const,
        data: buildIndividualQuarterComparison({
            account,
            current: input.current,
            comparison: input.comparison,
            platforms,
            currentSnapshots,
            comparisonSnapshots,
        }),
    };
}

export async function createManualQuarterSnapshot(input: ManualQuarterSnapshotRequest) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    if (isDemoMode) {
        return {
            success: false as const,
            error: "Manual snapshot changes are disabled in demo mode.",
        };
    }

    const validationError = validateManualSnapshotInput(input);
    if (validationError) {
        return { success: false as const, error: validationError };
    }

    const account = await prisma.account.findUnique({
        where: { id: input.accountId },
        select: { id: true },
    });
    if (!account) {
        return { success: false as const, error: "Account not found." };
    }

    await prisma.snapshot.create({
        data: {
            accountId: input.accountId,
            platform: input.platform,
            followers: input.followers,
            posts: input.posts ?? null,
            likes: input.likes ?? null,
            engagement: input.engagement ?? null,
            scrapedAt: new Date(input.scrapedAt),
            source: "MANUAL",
            sourceNote: input.sourceNote?.trim() || null,
        },
    });

    return { success: true as const };
}

export async function exportIndividualQuarterComparisonPdf(
    input: IndividualQuarterComparisonRequest,
) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const comparison = await getIndividualQuarterComparison(input);
    if (!comparison.success) return comparison;

    try {
        const base64 = await callWorkerPdfBase64(
            "/export/individual-quarter-comparison-pdf",
            comparison.data,
        );
        return { success: true as const, data: base64 };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to export individual quarter comparison PDF.",
        };
    }
}

/**
 * Export PDF from an explicit list of platform result IDs.
 * Allows composing results across different runs.
 */
export async function exportComposedIndividualPdf(input: {
    platformResultIds: string[];
    accountId: string;
    year: number;
    quarter: number;
}) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const results = await loadPlatformResultsByIds(input.platformResultIds);
    if (results.length === 0) {
        return { success: false as const, error: "No platform results found." };
    }

    const account = await prisma.account.findUnique({
        where: { id: input.accountId },
        select: { id: true, username: true },
    });
    if (!account) {
        return { success: false as const, error: "Account not found." };
    }

    const platforms = results.map((r) => r.platform as Platform);
    const estimatedCredits = estimateIndividualReportCredits({
        includeProfileRequest: false,
        listingPageLimit: 0,
        detailedContentLimit: 0,
    });

    const coverageLabel = buildCoverageLabel(results);

    const exportPayload: IndividualReportRunData & { coverageLabel?: string } = {
        account: { id: account.id, username: account.username },
        request: {
            accountId: account.id,
            platforms,
            year: input.year,
            quarter: input.quarter,
            listingPageLimit: DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT,
            enrichedContentLimit: DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
        },
        estimatedCredits,
        actualCreditsUsed: results.reduce((sum, r) => sum + (r.creditsUsed ?? 0), 0),
        results: results.map((r) => r.resultJson as unknown as WorkerLiveReviewResult),
        methodologyNotes: [...INDIVIDUAL_REPORT_METHODOLOGY_NOTES, PUBLIC_INTERACTION_GROWTH_NOTE],
        coverageLabel,
    };

    let compYear = input.year;
    let compQuarter = input.quarter - 1;
    if (compQuarter === 0) {
        compYear -= 1;
        compQuarter = 4;
    }
    const prevResults = await findLatestSuccessfulPlatformResults(
        account.id,
        compYear,
        compQuarter,
    );

    exportPayload.interactionGrowth = results.map((r) => {
        const prev = prevResults.find((p) => p.platform === r.platform);
        return computeInteractionGrowth(
            requireInteractionResultJson(r.resultJson, r.platform as Platform),
            asInteractionResultJson(prev?.resultJson ?? null),
            r.platform as Platform,
        );
    });

    const snapshotHistory = await buildSnapshotHistoryForExport(
        account.id,
        input.year,
        input.quarter,
        platforms,
    );

    try {
        const base64 = await callWorkerPdfBase64("/export/individual-quarterly-pdf", {
            ...exportPayload,
            snapshotHistory,
        });
        return { success: true as const, data: base64 };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to export individual quarterly PDF.",
        };
    }
}

/**
 * Legacy: export PDF from a single run ID (all platforms in that run).
 */
export async function exportIndividualQuarterlyReportPdf(runId: string) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    // Load the run with its platform results
    const runWithResults = await loadRunWithPlatformResults(runId);
    if (!runWithResults) {
        return { success: false as const, error: "Saved individual report run not found." };
    }

    const successfulResults = runWithResults.platformResults.filter(
        (r) => r.status === "SUCCESS" && r.resultJson,
    );

    if (successfulResults.length === 0) {
        return {
            success: false as const,
            error: "No successful platform results in this run.",
        };
    }

    const platforms = successfulResults.map((r) => r.platform);
    const coverageLabel = buildCoverageLabel(successfulResults);

    const account = await prisma.account.findUnique({
        where: { id: runWithResults.accountId },
        select: { id: true, username: true },
    });
    if (!account) {
        return { success: false as const, error: "Account not found." };
    }

    const estimatedCredits = estimateIndividualReportCredits({
        includeProfileRequest: false,
        listingPageLimit: 0,
        detailedContentLimit: 0,
    });

    const exportPayload: IndividualReportRunData & { coverageLabel?: string } = {
        account: { id: account.id, username: account.username },
        request: {
            accountId: account.id,
            platforms,
            year: runWithResults.year,
            quarter: runWithResults.quarter,
            listingPageLimit: DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT,
            enrichedContentLimit: DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
        },
        estimatedCredits,
        actualCreditsUsed: runWithResults.actualCreditsUsed,
        results: successfulResults.map((r) => r.resultJson as unknown as WorkerLiveReviewResult),
        methodologyNotes: [...INDIVIDUAL_REPORT_METHODOLOGY_NOTES, PUBLIC_INTERACTION_GROWTH_NOTE],
        coverageLabel,
    };

    let compYear = runWithResults.year;
    let compQuarter = runWithResults.quarter - 1;
    if (compQuarter === 0) {
        compYear -= 1;
        compQuarter = 4;
    }
    const prevResults = await findLatestSuccessfulPlatformResults(
        account.id,
        compYear,
        compQuarter,
    );

    exportPayload.interactionGrowth = successfulResults.map((r) => {
        const prev = prevResults.find((p) => p.platform === r.platform);
        return computeInteractionGrowth(
            requireInteractionResultJson(r.resultJson, r.platform as Platform),
            asInteractionResultJson(prev?.resultJson ?? null),
            r.platform as Platform,
        );
    });

    const snapshotHistory = await buildSnapshotHistoryForExport(
        account.id,
        runWithResults.year,
        runWithResults.quarter,
        platforms,
    );

    try {
        const base64 = await callWorkerPdfBase64("/export/individual-quarterly-pdf", {
            ...exportPayload,
            snapshotHistory,
        });
        return { success: true as const, data: base64 };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to export individual quarterly PDF.",
        };
    }
}
