"use server";

import { type Platform, type Prisma, prisma } from "@repo/database";
import type {
    calculateReconstructionCoverage,
    selectContentForEnrichment,
} from "@/modules/individual-reports/lib/content-reconstruction";
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
    asInteractionResultJson,
    computeInteractionGrowth,
    type InteractionGrowthResult,
} from "@/modules/individual-reports/lib/public-interaction-growth";
import {
    buildIndividualQuarterComparison,
    type QuarterSelection,
    quarterBounds,
    type SnapshotStatPoint,
} from "@/modules/individual-reports/lib/quarter-stat-comparison";
import { auth } from "@/shared/lib/auth";

interface IndividualLiveReviewRequest {
    accountId: string;
    platforms: Platform[];
    year: number;
    quarter: number;
    listingPageLimit?: number;
    enrichedContentLimit?: number;
}

interface IndividualQuarterComparisonRequest {
    accountId: string;
    current: QuarterSelection;
    comparison: QuarterSelection;
    platforms: Platform[];
}

interface ManualQuarterSnapshotRequest {
    accountId: string;
    platform: Platform;
    year: number;
    quarter: number;
    scrapedAt: string;
    followers: number;
    posts?: number | null;
    likes?: number | null;
    engagement?: number | null;
    sourceNote?: string | null;
}

interface WorkerCreditBalance {
    credits: number | null;
    raw: unknown;
}

interface WorkerPlatformProfileStats {
    followers: number | null;
    following: number | null;
    totalPosts: number | null;
    isVerified: boolean | null;
    displayName: string | null;
}

interface WorkerQuarterSummaryStats {
    quarterItemCount: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    totalShares: number;
    totalSaves: number;
    totalReposts: number;
    totalQuotes: number;
    totalBookmarks: number;
    avgLikes: number | null;
    avgComments: number | null;
    avgViews: number | null;
    avgEngagementRate: number | null;
    topPost: {
        url: string | null;
        likes: number | null;
        publishedAt: string;
    } | null;
    contentTypeBreakdown: Record<string, number>;
    monthlyInteractionTotals: Array<{
        key: string;
        label: string;
        contentCount: number;
        totalLikes: number;
        totalComments: number;
        totalViews: number;
        totalShares: number;
        totalSaves: number;
        totalReposts: number;
        totalQuotes: number;
        totalBookmarks: number;
        publicInteractions: number;
        publicReachInteractions: number | null;
    }>;
    isPopularMode: boolean;
}

interface WorkerLiveReviewResult {
    platform: Platform;
    handle: string;
    success: boolean;
    error?: string;
    creditsUsed: number;
    rawItemsFetched: number;
    fetchedDateRange: {
        earliest: string | null;
        latest: string | null;
    };
    diagnostics: string[];
    coverage: ReturnType<typeof calculateReconstructionCoverage>;
    enrichedItems: ReturnType<typeof selectContentForEnrichment>;
    profileStats?: WorkerPlatformProfileStats | null;
    quarterSummary?: WorkerQuarterSummaryStats | null;
}

// Shape stored in IndividualReportPlatformResult.resultJson
export interface PlatformResultJson {
    platform: Platform;
    handle: string;
    success: boolean;
    error?: string;
    creditsUsed: number;
    rawItemsFetched: number;
    fetchedDateRange: {
        earliest: string | null;
        latest: string | null;
    };
    diagnostics: string[];
    coverage: ReturnType<typeof calculateReconstructionCoverage>;
    enrichedItems: ReturnType<typeof selectContentForEnrichment>;
    profileStats?: WorkerPlatformProfileStats | null;
    quarterSummary?: WorkerQuarterSummaryStats | null;
    methodologyNotes: string[];
}

// Shape for building the export payload (same as before for the worker PDF endpoint)
interface IndividualReportRunData {
    account: {
        id: string;
        username: string;
    };
    request: {
        accountId: string;
        platforms: Platform[];
        year: number;
        quarter: number;
        listingPageLimit: number;
        enrichedContentLimit: number;
    };
    estimatedCredits: ReturnType<typeof estimateIndividualReportCredits>;
    actualCreditsUsed: number;
    results: WorkerLiveReviewResult[];
    methodologyNotes: string[];
    interactionGrowth?: InteractionGrowthResult[];
}

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
            methodologyNotes: [
                "Rekonstruksi konten menggunakan endpoint daftar dari setiap platform yang dipilih.",
                "Data yang dikembalikan difilter ke kuartal yang dipilih sebelum analisis cakupan dan pemilihan konten.",
                "Konten terpilih diurutkan secara objektif berdasarkan metrik keterlibatan dari data daftar.",
                "Data Twitter menampilkan tweet terpopuler karena keterbatasan platform, bukan urutan kronologis kuartal.",
            ],
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
        methodologyNotes: [
            "Rekonstruksi konten menggunakan endpoint daftar dari setiap platform yang dipilih.",
            "Data yang dikembalikan difilter ke kuartal yang dipilih sebelum analisis cakupan dan pemilihan konten.",
            "Konten terpilih diurutkan secara objektif berdasarkan metrik keterlibatan dari data daftar.",
            "Data Twitter menampilkan tweet terpopuler karena keterbatasan platform, bukan urutan kronologis kuartal.",
            "Public Interaction Growth dihitung dari metrik publik yang tersedia melalui API pihak ketiga dan disimpan oleh aplikasi ini. Angka ini dapat berbeda dari analitik platform internal karena platform dapat menyertakan metrik privat, penyaringan spam, penanganan konten terhapus, pemisahan bayar/organik, dan sinyal interaksi non-publik.",
        ],
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
            asInteractionResultJson(r.resultJson)!,
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
        methodologyNotes: [
            "Rekonstruksi konten menggunakan endpoint daftar dari setiap platform yang dipilih.",
            "Data yang dikembalikan difilter ke kuartal yang dipilih sebelum analisis cakupan dan pemilihan konten.",
            "Konten terpilih diurutkan secara objektif berdasarkan metrik keterlibatan dari data daftar.",
            "Data Twitter menampilkan tweet terpopuler karena keterbatasan platform, bukan urutan kronologis kuartal.",
            "Public Interaction Growth dihitung dari metrik publik yang tersedia melalui API pihak ketiga dan disimpan oleh aplikasi ini. Angka ini dapat berbeda dari analitik platform internal karena platform dapat menyertakan metrik privat, penyaringan spam, penanganan konten terhapus, pemisahan bayar/organik, dan sinyal interaksi non-publik.",
        ],
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
            asInteractionResultJson(r.resultJson)!,
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildCoverageLabel(
    results: Array<{ platform: string | Platform; status?: string; success?: boolean }>,
): string {
    const included = results
        .filter((r) => r.status === "SUCCESS" || r.success === true)
        .map((r) => platformDisplayName(r.platform as Platform));

    const excluded = results
        .filter((r) => r.status === "FAILED" || r.success === false)
        .map((r) => platformDisplayName(r.platform as Platform));

    if (excluded.length === 0) return "";
    if (included.length === 0) return `Semua platform gagal: ${excluded.join(", ")}`;
    return `Termasuk: ${included.join(", ")}; Tidak tersedia: ${excluded.join(", ")}`;
}

function platformDisplayName(platform: Platform): string {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    return "Twitter / X";
}

async function callWorkerJson<T>(path: string, init: RequestInit): Promise<T> {
    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;
    if (!workerSecret) throw new Error("WORKER_SECRET not configured.");

    const response = await fetch(`${workerUrl}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${workerSecret}`,
            "Content-Type": "application/json",
            ...init.headers,
        },
    });

    const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        data?: unknown;
        error?: string;
    } | null;

    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || `Worker request failed: ${response.status}`);
    }

    return payload?.data as T;
}

async function callWorkerPdfBase64(path: string, body: unknown): Promise<string> {
    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;
    if (!workerSecret) throw new Error("WORKER_SECRET not configured.");

    const response = await fetch(`${workerUrl}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${workerSecret}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PDF export failed: ${response.status} - ${text.slice(0, 180)}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
}

function platformHandle(
    account: { instagram: string | null; tiktok: string | null; twitter: string | null },
    platform: Platform,
) {
    if (platform === "INSTAGRAM") return account.instagram;
    if (platform === "TIKTOK") return account.tiktok;
    return account.twitter;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validateQuarterComparisonInput(input: {
    accountId: string;
    current: QuarterSelection;
    comparison: QuarterSelection;
    platforms: Platform[];
}) {
    if (!input.accountId) return "Account is required.";
    if (!isValidQuarter(input.current.quarter) || !isValidQuarter(input.comparison.quarter)) {
        return "Quarter must be between 1 and 4.";
    }
    if (!isValidYear(input.current.year) || !isValidYear(input.comparison.year)) {
        return "Year is outside the supported range.";
    }
    if (input.platforms.length === 0) return "Select at least one platform.";
    return null;
}

function validateManualSnapshotInput(input: ManualQuarterSnapshotRequest) {
    const baseError = validateQuarterComparisonInput({
        accountId: input.accountId,
        current: { year: input.year, quarter: input.quarter },
        comparison: { year: input.year, quarter: input.quarter },
        platforms: [input.platform],
    });
    if (baseError) return baseError;
    if (!Number.isInteger(input.followers) || input.followers < 0) {
        return "Followers must be a non-negative whole number.";
    }
    if (input.posts != null && (!Number.isInteger(input.posts) || input.posts < 0)) {
        return "Posts must be a non-negative whole number.";
    }
    if (input.likes != null && (!Number.isInteger(input.likes) || input.likes < 0)) {
        return "Likes must be a non-negative whole number.";
    }
    if (input.engagement != null && (!Number.isFinite(input.engagement) || input.engagement < 0)) {
        return "Engagement must be a non-negative number.";
    }

    const scrapedAt = new Date(input.scrapedAt);
    if (Number.isNaN(scrapedAt.getTime())) return "Snapshot date is invalid.";
    const bounds = quarterBounds({ year: input.year, quarter: input.quarter });
    if (scrapedAt < bounds.start || scrapedAt > bounds.end) {
        return "Snapshot date must be inside the selected quarter.";
    }

    return null;
}

function isValidQuarter(quarter: number) {
    return Number.isInteger(quarter) && quarter >= 1 && quarter <= 4;
}

function isValidYear(year: number) {
    return Number.isInteger(year) && year >= 2020 && year <= 2100;
}

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function findQuarterSnapshots(
    accountId: string,
    quarter: QuarterSelection,
    platforms: Platform[],
): Promise<SnapshotStatPoint[]> {
    const bounds = quarterBounds(quarter);
    const rows = await prisma.snapshot.findMany({
        where: {
            accountId,
            platform: { in: platforms },
            scrapedAt: {
                gte: bounds.start,
                lte: bounds.end,
            },
        },
        select: {
            platform: true,
            followers: true,
            posts: true,
            likes: true,
            engagement: true,
            scrapedAt: true,
            source: true,
            sourceNote: true,
        },
        orderBy: { scrapedAt: "desc" },
    });

    return rows.map((snapshot) => ({
        platform: snapshot.platform as Platform,
        followers: snapshot.followers,
        posts: snapshot.posts,
        likes: snapshot.likes,
        engagement: snapshot.engagement,
        scrapedAt: snapshot.scrapedAt,
        source: snapshot.source as "SCRAPED" | "MANUAL",
        sourceNote: snapshot.sourceNote,
    }));
}

function runDelegate() {
    return (
        prisma as typeof prisma & {
            individualReportRun?: typeof prisma.individualReportRun;
        }
    ).individualReportRun;
}

function platformResultDelegate() {
    return (
        prisma as typeof prisma & {
            individualReportPlatformResult?: typeof prisma.individualReportPlatformResult;
        }
    ).individualReportPlatformResult;
}

async function createRun(input: {
    accountId: string;
    year: number;
    quarter: number;
    estimatedCredits: number;
}): Promise<{ id: string; createdAt: Date }> {
    const delegate = runDelegate();
    if (delegate) {
        return delegate.create({
            data: {
                accountId: input.accountId,
                year: input.year,
                quarter: input.quarter,
                estimatedCredits: input.estimatedCredits,
                actualCreditsUsed: 0,
                status: "PARTIAL",
            },
            select: { id: true, createdAt: true },
        });
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; createdAt: Date }>>(
        `INSERT INTO "IndividualReportRun" ("id","accountId","year","quarter","status","estimatedCredits","actualCreditsUsed","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,'PARTIAL'::"IndividualReportStatus",$5,0,NOW(),NOW())
         RETURNING "id","createdAt"`,
        crypto.randomUUID(),
        input.accountId,
        input.year,
        input.quarter,
        input.estimatedCredits,
    );
    if (!rows[0]) throw new Error("Failed to create run.");
    return rows[0];
}

async function updateRunStatus(
    runId: string,
    status: "COMPLETE" | "PARTIAL" | "FAILED",
    actualCreditsUsed: number,
) {
    const delegate = runDelegate();
    if (delegate) {
        await delegate.update({
            where: { id: runId },
            data: { status, actualCreditsUsed },
        });
        return;
    }

    await prisma.$queryRawUnsafe(
        `UPDATE "IndividualReportRun" SET "status"=$1::"IndividualReportStatus","actualCreditsUsed"=$2,"updatedAt"=NOW() WHERE "id"=$3`,
        status,
        actualCreditsUsed,
        runId,
    );
}

async function savePlatformResult(input: {
    runId: string;
    platform: Platform;
    handle: string;
    status: "SUCCESS" | "FAILED";
    creditsUsed: number;
    resultJson: PlatformResultJson;
    error?: string;
}) {
    const delegate = platformResultDelegate();
    if (delegate) {
        await delegate.create({
            data: {
                runId: input.runId,
                platform: input.platform,
                handle: input.handle,
                status: input.status,
                creditsUsed: input.creditsUsed,
                resultJson: toPrismaJson(input.resultJson),
                error: input.error ?? null,
                scrapedAt: new Date(),
            },
        });
        return;
    }

    await prisma.$queryRawUnsafe(
        `INSERT INTO "IndividualReportPlatformResult" ("id","runId","platform","handle","status","creditsUsed","resultJson","error","scrapedAt","createdAt","updatedAt")
         VALUES ($1,$2,$3::"Platform",$4,$5::"IndividualReportPlatformStatus",$6,$7::jsonb,$8,NOW(),NOW(),NOW())`,
        crypto.randomUUID(),
        input.runId,
        input.platform,
        input.handle,
        input.status,
        input.creditsUsed,
        JSON.stringify(input.resultJson),
        input.error ?? null,
    );
}

async function findIndividualReportRuns(accountId?: string) {
    const delegate = runDelegate();
    if (delegate) {
        const runs = await delegate.findMany({
            where: accountId ? { accountId } : undefined,
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                accountId: true,
                year: true,
                quarter: true,
                status: true,
                estimatedCredits: true,
                actualCreditsUsed: true,
                createdAt: true,
                account: { select: { username: true } },
                platformResults: {
                    select: {
                        id: true,
                        platform: true,
                        handle: true,
                        status: true,
                        creditsUsed: true,
                        error: true,
                        scrapedAt: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        return runs.map((run) => ({
            id: run.id,
            accountId: run.accountId,
            accountName: run.account.username,
            year: run.year,
            quarter: run.quarter,
            status: run.status as string,
            estimatedCredits: run.estimatedCredits,
            actualCreditsUsed: run.actualCreditsUsed,
            createdAt: run.createdAt.toISOString(),
            platformResults: run.platformResults.map((pr) => ({
                id: pr.id,
                platform: pr.platform as Platform,
                handle: pr.handle,
                status: pr.status as string,
                creditsUsed: pr.creditsUsed,
                error: pr.error,
                scrapedAt: pr.scrapedAt?.toISOString() ?? null,
            })),
        }));
    }

    const rows = await prisma.$queryRawUnsafe<
        Array<{
            id: string;
            accountId: string;
            accountName: string;
            year: number;
            quarter: number;
            status: string;
            estimatedCredits: number;
            actualCreditsUsed: number;
            createdAt: Date;
        }>
    >(
        `SELECT r."id",r."accountId",a."username" AS "accountName",r."year",r."quarter",r."status"::text,r."estimatedCredits",r."actualCreditsUsed",r."createdAt"
         FROM "IndividualReportRun" r JOIN "Account" a ON a."id"=r."accountId"
         WHERE ($1::text IS NULL OR r."accountId"=$2)
         ORDER BY r."createdAt" DESC LIMIT 20`,
        accountId ?? null,
        accountId ?? null,
    );

    const runIds = rows.map((r) => r.id);
    const prRows =
        runIds.length > 0
            ? await prisma.$queryRawUnsafe<
                  Array<{
                      id: string;
                      runId: string;
                      platform: string;
                      handle: string;
                      status: string;
                      creditsUsed: number;
                      error: string | null;
                      scrapedAt: Date | null;
                  }>
              >(
                  `SELECT "id","runId","platform"::text,"handle","status"::text,"creditsUsed","error","scrapedAt"
                   FROM "IndividualReportPlatformResult"
                   WHERE "runId" = ANY($1::text[])
                   ORDER BY "createdAt" ASC`,
                  runIds,
              )
            : [];

    return rows.map((run) => ({
        id: run.id,
        accountId: run.accountId,
        accountName: run.accountName,
        year: Number(run.year),
        quarter: Number(run.quarter),
        status: run.status,
        estimatedCredits: run.estimatedCredits,
        actualCreditsUsed: run.actualCreditsUsed,
        createdAt: run.createdAt.toISOString(),
        platformResults: prRows
            .filter((pr) => pr.runId === run.id)
            .map((pr) => ({
                id: pr.id,
                platform: pr.platform as Platform,
                handle: pr.handle,
                status: pr.status,
                creditsUsed: pr.creditsUsed,
                error: pr.error,
                scrapedAt: pr.scrapedAt?.toISOString() ?? null,
            })),
    }));
}

async function getFailedPlatformsForPeriod(
    accountId: string,
    year: number,
    quarter: number,
): Promise<Platform[]> {
    const allResults = await findLatestSuccessfulPlatformResults(accountId, year, quarter);
    const successfulPlatforms = new Set(allResults.map((r) => r.platform));

    // Find all platforms that have been attempted but never succeeded
    const delegate = platformResultDelegate();
    if (delegate) {
        const attempted = await delegate.findMany({
            where: {
                run: { accountId, year, quarter },
            },
            select: { platform: true },
            distinct: ["platform"],
        });

        return attempted
            .map((r) => r.platform as Platform)
            .filter((p) => !successfulPlatforms.has(p));
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ platform: string }>>(
        `SELECT DISTINCT pr."platform"::text
         FROM "IndividualReportPlatformResult" pr
         JOIN "IndividualReportRun" r ON r."id"=pr."runId"
         WHERE r."accountId"=$1 AND r."year"=$2 AND r."quarter"=$3`,
        accountId,
        year,
        quarter,
    );

    return rows.map((r) => r.platform as Platform).filter((p) => !successfulPlatforms.has(p));
}

async function findLatestSuccessfulPlatformResults(
    accountId: string,
    year: number,
    quarter: number,
) {
    const delegate = platformResultDelegate();
    if (delegate) {
        // Get latest successful per platform using a subquery approach
        const allSuccessful = await delegate.findMany({
            where: {
                run: { accountId, year, quarter },
                status: "SUCCESS",
            },
            select: {
                id: true,
                platform: true,
                handle: true,
                status: true,
                creditsUsed: true,
                resultJson: true,
                scrapedAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        // Keep only the latest per platform
        const seen = new Set<string>();
        return allSuccessful
            .filter((r) => {
                if (seen.has(r.platform)) return false;
                seen.add(r.platform);
                return true;
            })
            .map((r) => ({
                id: r.id,
                platform: r.platform as Platform,
                handle: r.handle,
                status: r.status as string,
                creditsUsed: r.creditsUsed,
                resultJson: r.resultJson,
                scrapedAt: r.scrapedAt?.toISOString() ?? null,
            }));
    }

    const rows = await prisma.$queryRawUnsafe<
        Array<{
            id: string;
            platform: string;
            handle: string;
            status: string;
            creditsUsed: number;
            resultJson: Prisma.JsonValue;
            scrapedAt: Date | null;
        }>
    >(
        `SELECT DISTINCT ON (pr."platform") pr."id",pr."platform"::text,pr."handle",pr."status"::text,pr."creditsUsed",pr."resultJson",pr."scrapedAt"
         FROM "IndividualReportPlatformResult" pr
         JOIN "IndividualReportRun" r ON r."id"=pr."runId"
         WHERE r."accountId"=$1 AND r."year"=$2 AND r."quarter"=$3 AND pr."status"='SUCCESS'
         ORDER BY pr."platform", pr."createdAt" DESC`,
        accountId,
        year,
        quarter,
    );

    return rows.map((r) => ({
        id: r.id,
        platform: r.platform as Platform,
        handle: r.handle,
        status: r.status,
        creditsUsed: r.creditsUsed,
        resultJson: r.resultJson,
        scrapedAt: r.scrapedAt?.toISOString() ?? null,
    }));
}

async function loadPlatformResultsByIds(ids: string[]) {
    const delegate = platformResultDelegate();
    if (delegate) {
        const rows = await delegate.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                platform: true,
                handle: true,
                status: true,
                creditsUsed: true,
                resultJson: true,
            },
        });
        return rows.map((r) => ({
            ...r,
            platform: r.platform as Platform,
            status: r.status as string,
        }));
    }

    const rows = await prisma.$queryRawUnsafe<
        Array<{
            id: string;
            platform: string;
            handle: string;
            status: string;
            creditsUsed: number;
            resultJson: Prisma.JsonValue;
        }>
    >(
        `SELECT "id","platform"::text,"handle","status"::text,"creditsUsed","resultJson"
         FROM "IndividualReportPlatformResult"
         WHERE "id" = ANY($1::text[])`,
        ids,
    );

    return rows.map((r) => ({ ...r, platform: r.platform as Platform }));
}

async function loadRunWithPlatformResults(runId: string) {
    const delegate = runDelegate();
    if (delegate) {
        return delegate.findUnique({
            where: { id: runId },
            select: {
                accountId: true,
                year: true,
                quarter: true,
                actualCreditsUsed: true,
                platformResults: {
                    select: {
                        platform: true,
                        status: true,
                        creditsUsed: true,
                        resultJson: true,
                    },
                },
            },
        });
    }

    const rows = await prisma.$queryRawUnsafe<
        Array<{
            accountId: string;
            year: number;
            quarter: number;
            actualCreditsUsed: number;
            prPlatform: string;
            prStatus: string;
            prCreditsUsed: number;
            prResultJson: Prisma.JsonValue;
        }>
    >(
        `SELECT r."accountId",r."year",r."quarter",r."actualCreditsUsed",
                pr."platform"::text AS "prPlatform",pr."status"::text AS "prStatus",pr."creditsUsed" AS "prCreditsUsed",pr."resultJson" AS "prResultJson"
         FROM "IndividualReportRun" r
         LEFT JOIN "IndividualReportPlatformResult" pr ON pr."runId"=r."id"
         WHERE r."id"=$1`,
        runId,
    );

    if (!rows[0]) return null;
    const first = rows[0];
    return {
        accountId: first.accountId,
        year: Number(first.year),
        quarter: Number(first.quarter),
        actualCreditsUsed: first.actualCreditsUsed,
        platformResults: rows
            .filter((r) => r.prPlatform)
            .map((r) => ({
                platform: r.prPlatform as Platform,
                status: r.prStatus,
                creditsUsed: r.prCreditsUsed,
                resultJson: r.prResultJson,
            })),
    };
}

async function buildSnapshotHistoryForExport(
    accountId: string,
    year: number,
    quarter: number,
    platforms: Platform[],
) {
    const startMonthIdx = (quarter - 1) * 3;
    const startDate = new Date(year, startMonthIdx, 1);
    const endDate = new Date(year, startMonthIdx + 3, 0, 23, 59, 59);

    const snapshots = await prisma.$queryRawUnsafe<
        Array<{
            platform: string;
            followers: number;
            posts: number | null;
            likes: number | null;
            engagement: number | null;
            scrapedAt: Date;
        }>
    >(
        `SELECT s."platform", s."followers", s."posts", s."likes", s."engagement", s."scrapedAt"
         FROM "Snapshot" s
         WHERE s."accountId"=$1 AND s."platform"=ANY($2::"Platform"[])
           AND s."scrapedAt">=$3 AND s."scrapedAt"<=$4
         ORDER BY s."scrapedAt" ASC`,
        accountId,
        platforms,
        startDate,
        endDate,
    );

    const platformMap = new Map<
        string,
        Map<
            string,
            {
                monthKey: string;
                label: string;
                followers: number;
                posts: number | null;
                likes: number | null;
                engagement: number | null;
            }
        >
    >();

    for (const snap of snapshots) {
        if (!platformMap.has(snap.platform)) platformMap.set(snap.platform, new Map());
        const monthMap = platformMap.get(snap.platform)!;
        const d = new Date(snap.scrapedAt);
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("id-ID", { month: "short", year: "numeric" });
        monthMap.set(mk, {
            monthKey: mk,
            label,
            followers: snap.followers,
            posts: snap.posts,
            likes: snap.likes,
            engagement: snap.engagement,
        });
    }

    return Array.from(platformMap.entries()).map(([platform, monthMap]) => ({
        platform,
        months: Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
    }));
}
