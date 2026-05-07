"use server";

import {
    type InfluencerPostCategory,
    type InfluencerSentiment,
    type InfluencerSize,
    type Platform,
    type Prisma,
    prisma,
} from "@repo/database";
import type {
    InfluencerDetailRecord,
    InfluencerImportRecord,
    InfluencerPostRecord,
    ResolvedInfluencerSource,
    ResolveInfluencerSourcesInput,
    RetryInfluencerAnalysisInput,
    RetryInfluencerScrapePlatformInput,
    RunInfluencerScrapeInput,
} from "@repo/types";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { callWorkerJson } from "@/modules/individual-reports/lib/individual-report-worker-client";
import {
    getAuthorizationErrorMessage,
    requireAuthenticated,
    requireEditorOrAdmin,
} from "@/shared/lib/authorization";
import { logger } from "@/shared/lib/logger";
import {
    combineNotes,
    parseInfluencerSentiment,
    parseInfluencerSize,
    parsePlatformList,
    splitTopicTokens,
} from "../lib/influencer-normalization";
import { type InfluencerInput, influencerSchema } from "../lib/influencer-schemas";

interface InfluencerListFilters {
    page?: number;
    limit?: number;
    search?: string;
    platform?: Platform | "ALL";
    sentiment?: InfluencerSentiment | "ALL";
    size?: InfluencerSize | "ALL";
}

interface InfluencerPostFilters {
    page?: number;
    limit?: number;
    platform?: Platform | "ALL";
    category?: InfluencerPostCategory | "ALL";
    sentiment?: InfluencerSentiment | "ALL";
    topic?: string;
}

interface AddInfluencerFromSourceInput {
    source: string;
    defaultPlatform?: Platform | null;
    name?: string | null;
    professionInstitution?: string | null;
    topics?: string[];
    note?: string | null;
    isActive?: boolean;
}

interface CaptureInfluencerFromSourceInput {
    source: string;
    defaultPlatform?: Platform | null;
    isActive?: boolean;
}

interface BatchAddInfluencersFromSourcesInput {
    sources: string[];
    defaultPlatform?: Platform | null;
    professionInstitution?: string | null;
    topics?: string[];
    note?: string | null;
    isActive?: boolean;
}

export async function getInfluencers(filters: InfluencerListFilters = {}) {
    try {
        await requireAuthenticated();

        const page = filters.page ?? 1;
        const limit = filters.limit ?? 12;
        const skip = (page - 1) * limit;
        const where = buildInfluencerWhere(filters);

        const [influencers, total] = await Promise.all([
            prisma.influencer.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
                include: {
                    topicAssignments: {
                        include: { topic: true },
                    },
                    scrapeTargets: {
                        orderBy: { updatedAt: "desc" },
                        take: 1,
                        select: {
                            status: true,
                        },
                    },
                },
            }),
            prisma.influencer.count({ where }),
        ]);

        return {
            success: true,
            data: influencers.map((influencer) => ({
                id: influencer.id,
                name: influencer.name,
                displayAlias: influencer.displayAlias,
                note: influencer.note,
                size: influencer.size,
                professionInstitution: influencer.professionInstitution,
                profileSentiment: influencer.profileSentiment,
                canonicalUrl: influencer.canonicalUrl,
                instagramHandle: influencer.instagramHandle,
                tiktokHandle: influencer.tiktokHandle,
                twitterHandle: influencer.twitterHandle,
                threadsHandle: influencer.threadsHandle,
                youtubeHandle: influencer.youtubeHandle,
                activePlatforms: influencer.activePlatforms,
                isActive: influencer.isActive,
                lastScrapedAt: influencer.lastScrapedAt,
                lastAnalyzedAt: influencer.lastAnalyzedAt,
                topics: influencer.topicAssignments.map((assignment) => assignment.topic.name),
                latestRunStatus: influencer.scrapeTargets[0]?.status ?? null,
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    } catch (error) {
        logger.error({ error }, "Failed to fetch influencers");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to fetch influencers"),
        };
    }
}

export async function getInfluencerDetail(id: string, filters: InfluencerPostFilters = {}) {
    try {
        await requireAuthenticated();

        const influencer = await prisma.influencer.findUnique({
            where: { id },
            include: {
                topicAssignments: {
                    include: { topic: true },
                },
            },
        });

        if (!influencer) {
            return { success: false, error: "Influencer not found" };
        }

        const [scrapeRuns, posts] = await Promise.all([
            prisma.influencerScrapeRun.findMany({
                where: {
                    targets: { some: { influencerId: id } },
                },
                orderBy: { createdAt: "desc" },
                take: 12,
                include: {
                    targets: {
                        where: { influencerId: id },
                        orderBy: [{ createdAt: "desc" }, { platform: "asc" }],
                    },
                },
            }),
            fetchInfluencerPosts(id, filters),
        ]);

        const detail: InfluencerDetailRecord = {
            id: influencer.id,
            name: influencer.name,
            displayAlias: influencer.displayAlias,
            note: influencer.note,
            size: influencer.size,
            professionInstitution: influencer.professionInstitution,
            profileSentiment: influencer.profileSentiment,
            profileTopicSummary: influencer.profileTopicSummary,
            profileSummary: influencer.profileSummary,
            canonicalUrl: influencer.canonicalUrl,
            handles: {
                INSTAGRAM: influencer.instagramHandle ?? undefined,
                TIKTOK: influencer.tiktokHandle ?? undefined,
                TWITTER: influencer.twitterHandle ?? undefined,
                THREADS: influencer.threadsHandle ?? undefined,
                YOUTUBE: influencer.youtubeHandle ?? undefined,
            },
            activePlatforms: influencer.activePlatforms,
            isActive: influencer.isActive,
            lastScrapedAt: influencer.lastScrapedAt,
            lastAnalyzedAt: influencer.lastAnalyzedAt,
            topics: influencer.topicAssignments.map((assignment) => assignment.topic.name),
            scrapeRuns: scrapeRuns.map((run) => ({
                id: run.id,
                status: run.status,
                requestedPlatforms: run.requestedPlatforms,
                creditsUsed: run.creditsUsed,
                errorSummary: run.errorSummary,
                startedAt: run.startedAt,
                completedAt: run.completedAt,
                createdAt: run.createdAt,
                targets: run.targets.map((target) => ({
                    id: target.id,
                    platform: target.platform,
                    handle: target.handle,
                    status: target.status,
                    creditsUsed: target.creditsUsed,
                    profileUrl: target.profileUrl,
                    profileDisplayName: target.profileDisplayName,
                    profileBio: target.profileBio,
                    profileFollowers: target.profileFollowers,
                    profileFollowing: target.profileFollowing,
                    profilePosts: target.profilePosts,
                    profileVerified: target.profileVerified,
                    error: target.error,
                    scrapedAt: target.scrapedAt,
                })),
            })),
            posts: posts.data,
        };

        return {
            success: true,
            data: detail,
            postsPagination: posts.pagination,
        };
    } catch (error) {
        logger.error({ error, influencerId: id }, "Failed to fetch influencer detail");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to fetch influencer detail"),
        };
    }
}

export async function getInfluencerPosts(id: string, filters: InfluencerPostFilters = {}) {
    try {
        await requireAuthenticated();
        return { success: true, ...(await fetchInfluencerPosts(id, filters)) };
    } catch (error) {
        logger.error({ error, influencerId: id }, "Failed to fetch influencer posts");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to fetch influencer posts"),
        };
    }
}

export async function createInfluencer(input: InfluencerInput) {
    try {
        await requireEditorOrAdmin();
        const validated = influencerSchema.parse(input);

        const duplicates = await findExistingInfluencerMatches(validated);
        if (duplicates.length > 0) {
            return {
                success: false,
                error: "Influencer already exists for one of the supplied handles or URL.",
            };
        }

        const influencer = await prisma.$transaction(async (tx) => {
            const created = await tx.influencer.create({
                data: {
                    name: validated.name,
                    displayAlias: validated.displayAlias,
                    note: validated.note,
                    size: validated.size,
                    professionInstitution: validated.professionInstitution,
                    profileSentiment: validated.profileSentiment,
                    canonicalUrl: validated.canonicalUrl,
                    instagramHandle: validated.instagramHandle,
                    tiktokHandle: validated.tiktokHandle,
                    twitterHandle: validated.twitterHandle,
                    threadsHandle: validated.threadsHandle,
                    youtubeHandle: validated.youtubeHandle,
                    activePlatforms: validated.activePlatforms,
                    isActive: validated.isActive,
                },
            });

            await syncInfluencerTopics(tx, created.id, validated.topics, "replace");
            return created;
        });

        revalidatePath("/influencers");
        return { success: true, data: influencer };
    } catch (error) {
        logger.error({ error }, "Failed to create influencer");
        if (error instanceof ZodError) {
            return { success: false, error: error.issues[0]?.message ?? "Invalid influencer data" };
        }

        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to create influencer"),
        };
    }
}

export async function updateInfluencer(id: string, input: InfluencerInput) {
    try {
        await requireEditorOrAdmin();
        const validated = influencerSchema.parse(input);

        const existing = await prisma.influencer.findUnique({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Influencer tidak ditemukan." };
        }

        const duplicates = await findExistingInfluencerMatches(validated, id);
        if (duplicates.length > 0) {
            return {
                success: false,
                error: "Handle atau URL ini sudah dipakai influencer lain.",
            };
        }

        const influencer = await prisma.$transaction(async (tx) => {
            const updated = await tx.influencer.update({
                where: { id },
                data: {
                    name: validated.name,
                    displayAlias: validated.displayAlias,
                    note: validated.note,
                    size: validated.size,
                    professionInstitution: validated.professionInstitution,
                    profileSentiment: validated.profileSentiment,
                    canonicalUrl: validated.canonicalUrl,
                    instagramHandle: validated.instagramHandle,
                    tiktokHandle: validated.tiktokHandle,
                    twitterHandle: validated.twitterHandle,
                    threadsHandle: validated.threadsHandle,
                    youtubeHandle: validated.youtubeHandle,
                    activePlatforms: validated.activePlatforms,
                    isActive: validated.isActive,
                },
            });

            await syncInfluencerTopics(tx, id, validated.topics, "replace");
            return updated;
        });

        revalidatePath("/influencers");
        revalidatePath(`/influencers/${id}`);
        return { success: true, data: influencer };
    } catch (error) {
        logger.error({ error, id }, "Failed to update influencer");
        if (error instanceof ZodError) {
            return {
                success: false,
                error: error.issues[0]?.message ?? "Data influencer tidak valid",
            };
        }

        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to update influencer"),
        };
    }
}

export async function importInfluencers(rows: InfluencerImportRecord[]) {
    try {
        await requireEditorOrAdmin();

        const results: Array<{
            rowNumber: number;
            influencerId?: string;
            action: "CREATED" | "UPDATED" | "SKIPPED" | "ERROR";
            message: string;
        }> = [];

        for (const [index, row] of rows.entries()) {
            const normalized = normalizeImportRecord(row);

            if (!normalized) {
                results.push({
                    rowNumber: index + 2,
                    action: "SKIPPED",
                    message: "Row did not contain a usable influencer name or handle.",
                });
                continue;
            }

            const result = await upsertImportedInfluencer(index + 2, normalized);
            results.push(result);
        }

        revalidatePath("/influencers");
        return {
            success: true,
            imported: results.filter((result) => result.action === "CREATED").length,
            updated: results.filter((result) => result.action === "UPDATED").length,
            skipped: results.filter((result) => result.action === "SKIPPED").length,
            errors: results.filter((result) => result.action === "ERROR"),
            rows: results,
        };
    } catch (error) {
        logger.error({ error }, "Failed to import influencers");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to import influencers"),
        };
    }
}

export async function addInfluencerFromSource(input: AddInfluencerFromSourceInput) {
    try {
        await requireEditorOrAdmin();

        const result = await importInfluencerSourcesInternal([
            {
                rowNumber: 1,
                source: input.source,
                defaultPlatform: input.defaultPlatform ?? undefined,
                name: input.name ?? null,
                professionInstitution: input.professionInstitution ?? null,
                topics: input.topics ?? [],
                note: input.note ?? null,
                isActive: input.isActive ?? true,
            },
        ]);

        const row = result.rows[0];
        if (!row || row.action === "ERROR" || row.action === "SKIPPED") {
            return {
                success: false,
                error: row?.message || "Failed to add influencer from source.",
            };
        }

        return {
            success: true,
            data: row,
        };
    } catch (error) {
        logger.error({ error, input }, "Failed to add influencer from source");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to add influencer from source"),
        };
    }
}

export async function captureInfluencerFromSource(input: CaptureInfluencerFromSourceInput) {
    try {
        const session = await requireEditorOrAdmin();
        const source = input.source.trim();

        if (!source) {
            return { success: false, error: "Link atau handle wajib diisi." };
        }

        const [resolved] = await resolveInfluencerSourcesWithWorker({
            sources: [source],
            defaultPlatform: input.defaultPlatform ?? undefined,
        });

        if (!resolved || resolved.error || !resolved.platform || !resolved.handle) {
            return {
                success: false,
                error: resolved?.error || "Link tidak bisa dikenali sebagai profil atau post.",
            };
        }

        const influencerInput = buildInfluencerInputFromResolvedSource(resolved, {
            name: null,
            professionInstitution: null,
            topics: [],
            note: null,
            isActive: input.isActive ?? true,
        });
        const row = await upsertImportedInfluencer(1, influencerInput);

        if (row.action === "ERROR" || !row.influencerId) {
            return {
                success: false,
                error: row.message || "Gagal menambahkan influencer dari link.",
            };
        }

        let scrapeRunId: string;
        try {
            const scrape = await callWorkerJson<{ scrapeRunId: string }>("/influencers/scrape", {
                method: "POST",
                body: JSON.stringify({
                    influencerIds: [row.influencerId],
                    platforms: [resolved.platform],
                    requestedById: session.user.id,
                } satisfies RunInfluencerScrapeInput),
            });
            scrapeRunId = scrape.scrapeRunId;
        } catch (error) {
            logger.error(
                { error, influencerId: row.influencerId, platform: resolved.platform },
                "Influencer saved but automatic scrape trigger failed",
            );
            revalidatePath("/influencers");
            revalidatePath(`/influencers/${row.influencerId}`);

            return {
                success: false,
                error: "Profil sudah tersimpan, tetapi scrape otomatis gagal dijalankan.",
            };
        }

        revalidatePath("/influencers");
        revalidatePath(`/influencers/${row.influencerId}`);

        return {
            success: true,
            data: {
                ...row,
                platform: resolved.platform,
                scrapeRunId,
            },
        };
    } catch (error) {
        logger.error({ error, input }, "Failed to capture influencer from source");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to capture influencer from source"),
        };
    }
}

export async function batchAddInfluencersFromSources(input: BatchAddInfluencersFromSourcesInput) {
    try {
        await requireEditorOrAdmin();

        const result = await importInfluencerSourcesInternal(
            input.sources.map((source, index) => ({
                rowNumber: index + 1,
                source,
                defaultPlatform: input.defaultPlatform ?? undefined,
                name: null,
                professionInstitution: input.professionInstitution ?? null,
                topics: input.topics ?? [],
                note: input.note ?? null,
                isActive: input.isActive ?? true,
            })),
        );

        return {
            success: true,
            ...result,
        };
    } catch (error) {
        logger.error({ error, input }, "Failed to batch add influencers from sources");
        return {
            success: false,
            error: getAuthorizationErrorMessage(
                error,
                "Failed to batch add influencers from sources",
            ),
        };
    }
}

export async function runInfluencerScrape(input: Omit<RunInfluencerScrapeInput, "requestedById">) {
    try {
        const session = await requireEditorOrAdmin();
        const result = await callWorkerJson<{ scrapeRunId: string }>("/influencers/scrape", {
            method: "POST",
            body: JSON.stringify({
                ...input,
                requestedById: session.user.id,
            } satisfies RunInfluencerScrapeInput),
        });

        revalidatePath("/influencers");
        for (const influencerId of input.influencerIds) {
            revalidatePath(`/influencers/${influencerId}`);
        }

        return { success: true, data: result };
    } catch (error) {
        logger.error({ error, input }, "Failed to run influencer scrape");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to run influencer scrape"),
        };
    }
}

export async function retryInfluencerScrapePlatform(
    input: Omit<RetryInfluencerScrapePlatformInput, "requestedById">,
) {
    try {
        const session = await requireEditorOrAdmin();
        const result = await callWorkerJson<{ scrapeRunId: string }>(
            "/influencers/scrape/retry-platform",
            {
                method: "POST",
                body: JSON.stringify({
                    ...input,
                    requestedById: session.user.id,
                } satisfies RetryInfluencerScrapePlatformInput),
            },
        );

        revalidatePath("/influencers");
        return { success: true, data: result };
    } catch (error) {
        logger.error({ error, input }, "Failed to retry influencer scrape platform");
        return {
            success: false,
            error: getAuthorizationErrorMessage(
                error,
                "Failed to retry influencer scrape platform",
            ),
        };
    }
}

export async function retryInfluencerAnalysis(input: RetryInfluencerAnalysisInput) {
    try {
        await requireEditorOrAdmin();
        const result = await callWorkerJson<{ queued: number }>("/influencers/analysis/retry", {
            method: "POST",
            body: JSON.stringify(input),
        });

        revalidatePath("/influencers");
        return { success: true, data: result };
    } catch (error) {
        logger.error({ error, input }, "Failed to retry influencer analysis");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to retry influencer analysis"),
        };
    }
}

async function fetchInfluencerPosts(id: string, filters: InfluencerPostFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 15;
    const skip = (page - 1) * limit;
    const analysisWhere: Prisma.InfluencerPostAnalysisWhereInput = {};
    const where: Prisma.InfluencerPostWhereInput = {
        influencerId: id,
    };

    if (filters.platform && filters.platform !== "ALL") {
        where.platform = filters.platform;
    }

    if (filters.category && filters.category !== "ALL") {
        analysisWhere.category = filters.category;
    }

    if (filters.sentiment && filters.sentiment !== "ALL") {
        analysisWhere.sentiment = filters.sentiment;
    }

    if (filters.topic?.trim()) {
        analysisWhere.controlledTopics = {
            has: filters.topic.trim(),
        };
    }

    if (Object.keys(analysisWhere).length > 0) {
        where.analyses = {
            some: analysisWhere,
        };
    }

    const [posts, total] = await Promise.all([
        prisma.influencerPost.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
            include: {
                analyses: {
                    orderBy: { analyzedAt: "desc" },
                    take: 1,
                },
            },
        }),
        prisma.influencerPost.count({ where }),
    ]);

    return {
        data: posts.map(mapInfluencerPost),
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    };
}

function mapInfluencerPost(
    post: Prisma.InfluencerPostGetPayload<{
        include: {
            analyses: {
                take: 1;
            };
        };
    }>,
): InfluencerPostRecord {
    const analysis = post.analyses[0] ?? null;

    return {
        id: post.id,
        platform: post.platform,
        platformPostId: post.platformPostId,
        threadId: post.threadId,
        url: post.url,
        caption: post.caption,
        content: post.content,
        mediaType: post.mediaType,
        thumbnailUrl: post.thumbnailUrl,
        publishedAt: post.publishedAt,
        analysis: analysis
            ? {
                  id: analysis.id,
                  status: analysis.status,
                  category: analysis.category,
                  sentiment: analysis.sentiment,
                  controlledTopics: analysis.controlledTopics,
                  freeTags: analysis.freeTags,
                  transcript: analysis.transcript,
                  transcriptStatus: analysis.transcriptStatus,
                  captionSummary: analysis.captionSummary,
                  threadSummary: analysis.threadSummary,
                  threadSummaryStatus: analysis.threadSummaryStatus,
                  postSummary: analysis.postSummary,
                  confidence: analysis.confidence,
                  error: analysis.error,
                  analyzedAt: analysis.analyzedAt,
              }
            : null,
    };
}

function buildInfluencerWhere(filters: InfluencerListFilters): Prisma.InfluencerWhereInput {
    const where: Prisma.InfluencerWhereInput = {};
    const search = filters.search?.trim();

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { displayAlias: { contains: search, mode: "insensitive" } },
            { instagramHandle: { contains: search, mode: "insensitive" } },
            { tiktokHandle: { contains: search, mode: "insensitive" } },
            { twitterHandle: { contains: search, mode: "insensitive" } },
            { threadsHandle: { contains: search, mode: "insensitive" } },
            { youtubeHandle: { contains: search, mode: "insensitive" } },
        ];
    }

    if (filters.platform && filters.platform !== "ALL") {
        where.activePlatforms = { has: filters.platform };
    }

    if (filters.sentiment && filters.sentiment !== "ALL") {
        where.profileSentiment = filters.sentiment;
    }

    if (filters.size && filters.size !== "ALL") {
        where.size = filters.size;
    }

    return where;
}

function normalizeImportRecord(row: InfluencerImportRecord) {
    const name = row.name?.trim();
    const topics = splitTopicTokens(row.professionInstitution);
    const platforms = parsePlatformList(row.socialMedia);

    const baseName = name || topics[0] || row.note?.trim() || "";

    if (!baseName) {
        return null;
    }

    const parsed = influencerSchema.parse({
        name: baseName,
        size: parseInfluencerSize(row.size),
        professionInstitution: row.professionInstitution ?? null,
        profileSentiment: parseInfluencerSentiment(row.sentiment),
        note: row.note ?? null,
        topics,
        isActive: true,
        instagramHandle: null,
        tiktokHandle: null,
        twitterHandle: null,
        threadsHandle: null,
        youtubeHandle: null,
        canonicalUrl: null,
        displayAlias: null,
    });

    return {
        ...parsed,
        activePlatforms: platforms,
    };
}

async function importInfluencerSourcesInternal(
    rows: Array<{
        rowNumber: number;
        source: string;
        defaultPlatform?: Platform;
        name: string | null;
        professionInstitution: string | null;
        topics: string[];
        note: string | null;
        isActive: boolean;
    }>,
) {
    const sourceInputs = rows.map((row) => row.source.trim()).filter(Boolean);

    if (sourceInputs.length === 0) {
        return {
            imported: 0,
            updated: 0,
            skipped: rows.length,
            errors: [] as Array<{
                rowNumber: number;
                influencerId?: string;
                action: "CREATED" | "UPDATED" | "SKIPPED" | "ERROR";
                message: string;
            }>,
            rows: rows.map((row) => ({
                rowNumber: row.rowNumber,
                action: "SKIPPED" as const,
                message: "Row did not contain a usable source URL or handle.",
            })),
        };
    }

    const defaultPlatform = rows.find((row) => row.defaultPlatform)?.defaultPlatform ?? undefined;
    const resolved = await resolveInfluencerSourcesWithWorker({
        sources: rows.map((row) => row.source),
        defaultPlatform,
    });

    const results: Array<{
        rowNumber: number;
        influencerId?: string;
        action: "CREATED" | "UPDATED" | "SKIPPED" | "ERROR";
        message: string;
    }> = [];

    for (const [index, row] of rows.entries()) {
        const resolution = resolved[index];

        if (!resolution || resolution.error) {
            results.push({
                rowNumber: row.rowNumber,
                action: "ERROR",
                message: resolution?.error || "Source could not be resolved.",
            });
            continue;
        }

        const influencerInput = buildInfluencerInputFromResolvedSource(resolution, row);
        const result = await upsertImportedInfluencer(row.rowNumber, influencerInput);
        results.push(result);
    }

    revalidatePath("/influencers");
    for (const influencerId of Array.from(
        new Set(results.map((row) => row.influencerId).filter(Boolean)),
    )) {
        revalidatePath(`/influencers/${influencerId}`);
    }

    return {
        imported: results.filter((result) => result.action === "CREATED").length,
        updated: results.filter((result) => result.action === "UPDATED").length,
        skipped: results.filter((result) => result.action === "SKIPPED").length,
        errors: results.filter((result) => result.action === "ERROR"),
        rows: results,
    };
}

async function upsertImportedInfluencer(rowNumber: number, input: InfluencerInput) {
    const matches = await findExistingInfluencerMatches(input);

    if (matches.length > 1) {
        return {
            rowNumber,
            action: "ERROR" as const,
            message:
                "This row matches multiple existing influencers. Please resolve duplicates first.",
        };
    }

    const existing = matches[0] ?? null;

    if (!existing) {
        const created = await prisma.$transaction(async (tx) => {
            const influencer = await tx.influencer.create({
                data: {
                    name: input.name,
                    displayAlias: input.displayAlias,
                    note: input.note,
                    size: input.size,
                    professionInstitution: input.professionInstitution,
                    profileSentiment: input.profileSentiment,
                    canonicalUrl: input.canonicalUrl,
                    instagramHandle: input.instagramHandle,
                    tiktokHandle: input.tiktokHandle,
                    twitterHandle: input.twitterHandle,
                    threadsHandle: input.threadsHandle,
                    youtubeHandle: input.youtubeHandle,
                    activePlatforms: input.activePlatforms,
                    isActive: input.isActive,
                },
            });

            await syncInfluencerTopics(tx, influencer.id, input.topics, "replace");
            return influencer;
        });

        return {
            rowNumber,
            influencerId: created.id,
            action: "CREATED" as const,
            message: "Influencer created from import.",
        };
    }

    await prisma.$transaction(async (tx) => {
        await tx.influencer.update({
            where: { id: existing.id },
            data: {
                name: existing.name || input.name,
                displayAlias: input.displayAlias ?? existing.displayAlias,
                note: combineNotes(existing.note, input.note),
                size: input.size ?? existing.size,
                professionInstitution:
                    input.professionInstitution ?? existing.professionInstitution,
                profileSentiment: input.profileSentiment ?? existing.profileSentiment,
                canonicalUrl: input.canonicalUrl ?? existing.canonicalUrl,
                instagramHandle: input.instagramHandle ?? existing.instagramHandle,
                tiktokHandle: input.tiktokHandle ?? existing.tiktokHandle,
                twitterHandle: input.twitterHandle ?? existing.twitterHandle,
                threadsHandle: input.threadsHandle ?? existing.threadsHandle,
                youtubeHandle: input.youtubeHandle ?? existing.youtubeHandle,
                activePlatforms: Array.from(
                    new Set([...existing.activePlatforms, ...input.activePlatforms]),
                ),
                isActive: existing.isActive || input.isActive,
            },
        });

        await syncInfluencerTopics(
            tx,
            existing.id,
            Array.from(
                new Set([
                    ...existing.topicAssignments.map((assignment) => assignment.topic.name),
                    ...input.topics,
                ]),
            ),
            "replace",
        );
    });

    return {
        rowNumber,
        influencerId: existing.id,
        action: "UPDATED" as const,
        message: "Matched an existing influencer and merged import data.",
    };
}

async function findExistingInfluencerMatches(input: InfluencerInput, excludeId?: string) {
    const or: Prisma.InfluencerWhereInput[] = [];
    const baseWhere = excludeId ? { id: { not: excludeId } } : {};

    if (input.canonicalUrl) or.push({ canonicalUrl: input.canonicalUrl });
    if (input.instagramHandle) or.push({ instagramHandle: input.instagramHandle });
    if (input.tiktokHandle) or.push({ tiktokHandle: input.tiktokHandle });
    if (input.twitterHandle) or.push({ twitterHandle: input.twitterHandle });
    if (input.threadsHandle) or.push({ threadsHandle: input.threadsHandle });
    if (input.youtubeHandle) or.push({ youtubeHandle: input.youtubeHandle });

    if (or.length === 0) {
        return prisma.influencer.findMany({
            where: {
                ...baseWhere,
                name: {
                    equals: input.name,
                    mode: "insensitive",
                },
            },
            include: {
                topicAssignments: {
                    include: { topic: true },
                },
            },
        });
    }

    return prisma.influencer.findMany({
        where: {
            ...baseWhere,
            OR: or,
        },
        include: {
            topicAssignments: {
                include: { topic: true },
            },
        },
    });
}

async function syncInfluencerTopics(
    tx: Prisma.TransactionClient,
    influencerId: string,
    topics: string[],
    mode: "replace" | "merge",
) {
    const uniqueTopics = Array.from(new Set(topics.map((topic) => topic.trim()).filter(Boolean)));

    if (uniqueTopics.length === 0) {
        if (mode === "replace") {
            await tx.influencerTopicAssignment.deleteMany({
                where: { influencerId },
            });
        }
        return;
    }

    await tx.influencerTopic.createMany({
        data: uniqueTopics.map((name) => ({ name, isControlled: true })),
        skipDuplicates: true,
    });

    const persistedTopics = await tx.influencerTopic.findMany({
        where: { name: { in: uniqueTopics } },
        select: { id: true },
    });

    if (mode === "replace") {
        await tx.influencerTopicAssignment.deleteMany({
            where: { influencerId },
        });
    }

    await tx.influencerTopicAssignment.createMany({
        data: persistedTopics.map((topic) => ({
            influencerId,
            topicId: topic.id,
        })),
        skipDuplicates: true,
    });
}

async function resolveInfluencerSourcesWithWorker(input: ResolveInfluencerSourcesInput) {
    return callWorkerJson<ResolvedInfluencerSource[]>("/influencers/resolve-sources", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

function buildInfluencerInputFromResolvedSource(
    resolved: ResolvedInfluencerSource,
    row: {
        name: string | null;
        professionInstitution: string | null;
        topics: string[];
        note: string | null;
        isActive: boolean;
    },
) {
    if (!resolved.platform || !resolved.handle) {
        throw new Error("Resolved source is missing a platform or handle.");
    }

    const name = deriveInfluencerName(resolved, row.name);
    const displayAlias = deriveInfluencerAlias(resolved, name);
    const automaticNote =
        resolved.kind === "POST" && resolved.sourceUrl
            ? `Added from post URL: ${resolved.sourceUrl}`
            : resolved.sourceUrl && resolved.sourceUrl !== resolved.canonicalUrl
              ? `Added from source URL: ${resolved.sourceUrl}`
              : null;

    return influencerSchema.parse({
        name,
        displayAlias,
        note: combineNotes(automaticNote, row.note),
        size: null,
        professionInstitution: row.professionInstitution,
        profileSentiment: null,
        canonicalUrl: resolved.canonicalUrl,
        instagramHandle: resolved.platform === "INSTAGRAM" ? resolved.handle : null,
        tiktokHandle: resolved.platform === "TIKTOK" ? resolved.handle : null,
        twitterHandle: resolved.platform === "TWITTER" ? resolved.handle : null,
        threadsHandle: resolved.platform === "THREADS" ? resolved.handle : null,
        youtubeHandle: resolved.platform === "YOUTUBE" ? resolved.handle : null,
        topics: Array.from(new Set(row.topics.map((topic) => topic.trim()).filter(Boolean))),
        isActive: row.isActive,
    });
}

function deriveInfluencerName(resolved: ResolvedInfluencerSource, customName: string | null) {
    const trimmedCustomName = customName?.trim();
    if (trimmedCustomName) {
        return trimmedCustomName;
    }

    const displayName = resolved.displayName?.trim();
    if (displayName) {
        return displayName;
    }

    return resolved.handle ?? resolved.input.trim();
}

function deriveInfluencerAlias(resolved: ResolvedInfluencerSource, name: string) {
    if (!resolved.handle) {
        return null;
    }

    const normalizedName = name.trim().toLowerCase();
    const normalizedDisplayName = resolved.displayName?.trim().toLowerCase() ?? null;
    const handleAlias = resolved.handle.startsWith("@") ? resolved.handle : `@${resolved.handle}`;

    if (normalizedDisplayName && normalizedDisplayName !== normalizedName) {
        return resolved.displayName;
    }

    return normalizedName !== resolved.handle.toLowerCase() ? handleAlias : null;
}
