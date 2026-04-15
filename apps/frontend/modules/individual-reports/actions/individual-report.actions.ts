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
import { auth } from "@/shared/lib/auth";

interface IndividualLiveReviewRequest {
    accountId: string;
    platforms: Platform[];
    year: number;
    quarter: number;
    listingPageLimit?: number;
    enrichedContentLimit?: number;
}

interface WorkerCreditBalance {
    credits: number | null;
    raw: unknown;
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
}

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
                note: "This foundation workflow prepares an objective draft only. Future content reconstruction will require explicit operator confirmation before live ScrapeCreators calls.",
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
        select: {
            id: true,
            username: true,
            instagram: true,
            tiktok: true,
            twitter: true,
        },
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

    const results = [];
    for (const entry of runnablePlatforms) {
        const result = await callWorkerJson<WorkerLiveReviewResult>(
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
        results.push(result);
    }

    const estimatedCredits = estimateIndividualReportCredits({
        includeProfileRequest: false,
        listingPageLimit: listingPageLimit * runnablePlatforms.length,
        detailedContentLimit: 0,
    });

    const runData: IndividualReportRunData = {
        account: {
            id: account.id,
            username: account.username,
        },
        request: {
            accountId: input.accountId,
            platforms: runnablePlatforms.map((entry) => entry.platform),
            year: input.year,
            quarter: input.quarter,
            listingPageLimit,
            enrichedContentLimit,
        },
        estimatedCredits,
        actualCreditsUsed: results.reduce((total, result) => total + result.creditsUsed, 0),
        results,
        methodologyNotes: [
            "Live content reconstruction uses ScrapeCreators listing endpoints only in this release.",
            "Returned items are filtered into the selected quarter before coverage and enrichment selection.",
            "Selected content inspection is objective ranking from listing metrics; detail endpoints are not called yet.",
            "Twitter / X coverage is limited by ScrapeCreators' public user-tweets endpoint and may return popular tweets rather than a chronological quarterly feed.",
        ],
    };

    const savedRun = await prisma.individualReportRun.create({
        data: {
            accountId: account.id,
            year: input.year,
            quarter: input.quarter,
            platforms: runData.request.platforms,
            status: results.every((result) => result.success) ? "COMPLETED" : "FAILED",
            estimatedCredits: estimatedCredits.totalCredits,
            actualCreditsUsed: runData.actualCreditsUsed,
            resultJson: toPrismaJson(runData),
        },
        select: {
            id: true,
            createdAt: true,
        },
    });

    return {
        success: true as const,
        data: {
            ...runData,
            run: {
                id: savedRun.id,
                createdAt: savedRun.createdAt.toISOString(),
            },
        },
    };
}

export async function getSavedIndividualReportRuns(accountId?: string) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const runs = await prisma.individualReportRun.findMany({
        where: accountId ? { accountId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
            id: true,
            accountId: true,
            year: true,
            quarter: true,
            platforms: true,
            status: true,
            estimatedCredits: true,
            actualCreditsUsed: true,
            resultJson: true,
            createdAt: true,
            account: {
                select: {
                    username: true,
                },
            },
        },
    });

    return runs.map((run) => ({
        id: run.id,
        accountId: run.accountId,
        accountName: run.account.username,
        year: run.year,
        quarter: run.quarter,
        platforms: parsePlatformList(run.platforms),
        status: run.status,
        estimatedCredits: run.estimatedCredits,
        actualCreditsUsed: run.actualCreditsUsed,
        createdAt: run.createdAt.toISOString(),
        result: run.resultJson as unknown as IndividualReportRunData,
    }));
}

export async function exportIndividualQuarterlyReportPdf(runId: string) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const run = await prisma.individualReportRun.findUnique({
        where: { id: runId },
        select: {
            resultJson: true,
        },
    });

    if (!run) {
        return { success: false as const, error: "Saved individual report run not found." };
    }

    try {
        const base64 = await callWorkerPdfBase64(
            "/export/individual-quarterly-pdf",
            run.resultJson,
        );
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

async function callWorkerJson<T>(path: string, init: RequestInit): Promise<T> {
    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerSecret) {
        throw new Error("WORKER_SECRET not configured.");
    }

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

    if (!workerSecret) {
        throw new Error("WORKER_SECRET not configured.");
    }

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

function parsePlatformList(value: Prisma.JsonValue): Platform[] {
    return Array.isArray(value)
        ? value.filter((platform): platform is Platform =>
              ["INSTAGRAM", "TIKTOK", "TWITTER"].includes(String(platform)),
          )
        : [];
}
