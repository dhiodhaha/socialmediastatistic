import type { Platform } from "@repo/types";
import {
    buildContentLevelOutput,
    calculateReconstructionCoverage,
    engagementScore,
    filterQuarterContent,
    type ReconstructedContentItem,
    selectContentForEnrichment,
} from "../lib/content-reconstruction";

const SCRAPECREATORS_BASE_URL = "https://api.scrapecreators.com";

export interface PlatformProfileStats {
    followers: number | null;
    following: number | null;
    totalPosts: number | null;
    isVerified: boolean | null;
    displayName: string | null;
}

export interface QuarterSummaryStats {
    quarterItemCount: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
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
    /** True for Twitter: quarter filter is empty, stats are computed from popular tweets instead */
    isPopularMode: boolean;
}

export interface LiveReviewPlatformInput {
    platform: Platform;
    handle: string;
    year: number;
    quarter: number;
    listingPageLimit: number;
    enrichedContentLimit: number;
}

export interface LiveReviewPlatformResult {
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
    output: ReturnType<typeof buildContentLevelOutput>;
    profileStats: PlatformProfileStats | null;
    quarterSummary: QuarterSummaryStats | null;
}

interface ListingPageResult {
    items: ReconstructedContentItem[];
    nextCursor: string | null;
    hasMore: boolean;
    diagnostics?: string[];
    switchedToReels?: boolean;
}

export async function fetchCreditBalance() {
    const data = await scrapeCreatorsFetch("/v1/credit-balance");
    const record = asRecord(data);

    return {
        credits:
            readNumber(record, ["credits"]) ??
            readNumber(record, ["credit_balance"]) ??
            readNumber(record, ["remaining_credits"]) ??
            readNumber(record, ["balance"]) ??
            null,
        raw: data,
    };
}

export async function runLivePlatformReview(
    input: LiveReviewPlatformInput,
): Promise<LiveReviewPlatformResult> {
    try {
        const {
            items,
            listingPagesFetched,
            reachedQuarterStart,
            parserDiagnostics,
            instagramUsedReels,
        } = await fetchQuarterListings(input);

        const coverageDiagnostics = buildCoverageDiagnostics({
            items,
            year: input.year,
            quarter: input.quarter,
            listingPageLimit: input.listingPageLimit,
            listingPagesFetched,
            reachedQuarterStart,
        });

        const diagnostics = [...parserDiagnostics, ...coverageDiagnostics];

        if (input.platform === "TWITTER") {
            diagnostics.unshift(
                "Platform Twitter hanya menyediakan tweet terpopuler, bukan urutan kronologis terbaru. Konten kuartal yang tidak viral mungkin tidak tercakup dalam data ini.",
            );
        }

        if (input.platform === "INSTAGRAM" && instagramUsedReels) {
            diagnostics.unshift(
                "Endpoint postingan Instagram mengalami gangguan server. Data diambil dari endpoint reels sebagai pengganti — postingan feed tidak tercakup.",
            );
        }

        // Fetch profile stats (1 credit); fail silently so listing results are never lost
        const profileStats = await fetchPlatformProfile(input.platform, input.handle);
        const profileCreditUsed = profileStats !== null ? 1 : 0;

        const coverage = calculateReconstructionCoverage({
            year: input.year,
            quarter: input.quarter,
            listingPagesFetched,
            reachedQuarterStart,
            items,
        });

        const enrichedItems = selectContentForEnrichment({
            items,
            maxItems: input.enrichedContentLimit,
            minimumPerMonth: 1,
        });

        const quarterSummary = buildQuarterSummaryStats(
            input.platform,
            items,
            input.year,
            input.quarter,
            profileStats,
        );

        return {
            platform: input.platform,
            handle: input.handle,
            success: true,
            creditsUsed: listingPagesFetched + profileCreditUsed,
            rawItemsFetched: items.length,
            fetchedDateRange: fetchedDateRange(items),
            diagnostics,
            coverage,
            enrichedItems,
            output: buildContentLevelOutput({ coverage, enrichedItems }),
            profileStats,
            quarterSummary,
        };
    } catch (error) {
        const coverage = calculateReconstructionCoverage({
            year: input.year,
            quarter: input.quarter,
            listingPagesFetched: 0,
            reachedQuarterStart: false,
            items: [],
        });
        const enrichedItems = selectContentForEnrichment({
            items: [],
            maxItems: input.enrichedContentLimit,
            minimumPerMonth: 1,
        });

        return {
            platform: input.platform,
            handle: input.handle,
            success: false,
            error: error instanceof Error ? error.message : "Unknown API error",
            creditsUsed: 0,
            rawItemsFetched: 0,
            fetchedDateRange: { earliest: null, latest: null },
            diagnostics: [],
            coverage,
            enrichedItems,
            output: buildContentLevelOutput({ coverage, enrichedItems }),
            profileStats: null,
            quarterSummary: null,
        };
    }
}

async function fetchPlatformProfile(
    platform: Platform,
    handle: string,
): Promise<PlatformProfileStats | null> {
    const cleanHandle = handle.trim().replace(/^@/, "");

    try {
        if (platform === "INSTAGRAM") {
            const data = await scrapeCreatorsFetch(
                `/v1/instagram/profile?handle=${encodeURIComponent(cleanHandle)}`,
            );
            const record = asRecord(data);
            const user = asRecord(asRecord(record.data).user);
            const followedBy = asRecord(user.edge_followed_by);
            const follow = asRecord(user.edge_follow);
            const timeline = asRecord(user.edge_owner_to_timeline_media);

            return {
                followers: readNumber(followedBy, ["count"]),
                following: readNumber(follow, ["count"]),
                totalPosts: readNumber(timeline, ["count"]),
                isVerified: typeof user.is_verified === "boolean" ? user.is_verified : null,
                displayName: readString(user, ["full_name"]),
            };
        }

        if (platform === "TIKTOK") {
            const data = await scrapeCreatorsFetch(
                `/v1/tiktok/profile?handle=${encodeURIComponent(cleanHandle)}`,
            );
            const record = asRecord(data);
            const stats = asRecord(record.stats);
            const user = asRecord(record.user);

            return {
                followers: readNumber(stats, ["followerCount"]),
                following: readNumber(stats, ["followingCount"]),
                totalPosts: readNumber(stats, ["videoCount"]),
                isVerified: typeof user.verified === "boolean" ? user.verified : null,
                displayName: readString(user, ["nickname"]),
            };
        }

        if (platform === "TWITTER") {
            const data = await scrapeCreatorsFetch(
                `/v1/twitter/profile?handle=${encodeURIComponent(cleanHandle)}`,
            );
            const record = asRecord(data);
            const legacy = asRecord(record.legacy ?? record);

            return {
                followers: readNumber(legacy, ["followers_count", "normal_followers_count"]),
                following: readNumber(legacy, ["friends_count"]),
                totalPosts: readNumber(legacy, ["statuses_count"]),
                isVerified:
                    typeof record.is_blue_verified === "boolean" ? record.is_blue_verified : null,
                displayName: readString(legacy, ["name"]) ?? readString(record, ["name"]),
            };
        }

        return null;
    } catch {
        return null;
    }
}

function buildQuarterSummaryStats(
    platform: Platform,
    items: ReconstructedContentItem[],
    year: number,
    quarter: number,
    profileStats: PlatformProfileStats | null,
): QuarterSummaryStats | null {
    const quarterItems = filterQuarterContent(items, year, quarter);

    // Twitter: the endpoint returns popular tweets, not a chronological feed.
    // When the quarter filter yields nothing, fall back to showing all returned items.
    const isPopularMode = platform === "TWITTER" && quarterItems.length === 0 && items.length > 0;
    const workingItems = isPopularMode ? [...items] : quarterItems;

    if (workingItems.length === 0) {
        return null;
    }

    const totalLikes = workingItems.reduce((sum, item) => sum + (item.metrics.likes ?? 0), 0);
    const totalComments = workingItems.reduce((sum, item) => sum + (item.metrics.comments ?? 0), 0);
    const totalViews = workingItems.reduce((sum, item) => sum + (item.metrics.views ?? 0), 0);

    const hasViews = workingItems.some((item) => item.metrics.views != null);

    const avgEngagementRate =
        profileStats?.followers && profileStats.followers > 0
            ? Math.round(
                  ((((totalLikes + totalComments) / workingItems.length) * 100) /
                      profileStats.followers) *
                      100,
              ) / 100
            : null;

    const topPostItem = [...workingItems].sort(
        (a, b) => engagementScore(b) - engagementScore(a),
    )[0];

    const contentTypeBreakdown: Record<string, number> = {};
    for (const item of workingItems) {
        const type = item.mediaType ?? "unknown";
        contentTypeBreakdown[type] = (contentTypeBreakdown[type] ?? 0) + 1;
    }

    return {
        quarterItemCount: workingItems.length,
        totalLikes,
        totalComments,
        totalViews,
        avgLikes: Math.round(totalLikes / workingItems.length),
        avgComments: Math.round(totalComments / workingItems.length),
        avgViews: hasViews ? Math.round(totalViews / workingItems.length) : null,
        avgEngagementRate,
        topPost: topPostItem
            ? {
                  url: topPostItem.url ?? null,
                  likes: topPostItem.metrics.likes ?? null,
                  publishedAt: topPostItem.publishedAt.toISOString(),
              }
            : null,
        contentTypeBreakdown,
        isPopularMode,
    };
}

async function fetchQuarterListings(input: LiveReviewPlatformInput) {
    const items: ReconstructedContentItem[] = [];
    const parserDiagnostics: string[] = [];
    let cursor: string | null = null;
    let listingPagesFetched = 0;
    let reachedQuarterStart = false;
    let instagramUsedReels = false;
    const quarterStart = new Date(input.year, (input.quarter - 1) * 3, 1);

    for (let page = 0; page < input.listingPageLimit; page++) {
        const result = await fetchListingPage(
            input.platform,
            input.handle,
            cursor,
            instagramUsedReels,
        );
        listingPagesFetched++;
        items.push(...result.items);
        parserDiagnostics.push(...(result.diagnostics ?? []));

        if (result.switchedToReels) {
            instagramUsedReels = true;
        }

        if (result.items.some((item) => item.publishedAt < quarterStart)) {
            reachedQuarterStart = true;
            break;
        }

        if (!result.hasMore || !result.nextCursor) {
            break;
        }

        cursor = result.nextCursor;
    }

    return {
        items,
        listingPagesFetched,
        reachedQuarterStart,
        parserDiagnostics,
        instagramUsedReels,
    };
}

async function fetchListingPage(
    platform: Platform,
    handle: string,
    cursor: string | null,
    instagramUseReels = false,
): Promise<ListingPageResult> {
    const cleanHandle = handle.trim().replace(/^@/, "");

    if (platform === "INSTAGRAM") {
        return fetchInstagramListingPage(cleanHandle, cursor, instagramUseReels);
    }

    if (platform === "TIKTOK") {
        const params = new URLSearchParams({
            handle: cleanHandle,
            sort_by: "latest",
            trim: "true",
        });
        if (cursor) params.set("max_cursor", cursor);
        const data = await scrapeCreatorsFetch(`/v3/tiktok/profile/videos?${params.toString()}`);
        return parseTikTokListing(data);
    }

    // Twitter
    const params = new URLSearchParams({ handle: cleanHandle, trim: "true" });
    const data = await scrapeCreatorsFetch(`/v1/twitter/user-tweets?${params.toString()}`);
    return parseTwitterListing(data);
}

async function fetchInstagramListingPage(
    cleanHandle: string,
    cursor: string | null,
    useReels: boolean,
): Promise<ListingPageResult> {
    if (!useReels) {
        try {
            const params = new URLSearchParams({ handle: cleanHandle, trim: "true" });
            if (cursor) params.set("next_max_id", cursor);
            const data = await scrapeCreatorsFetch(`/v2/instagram/user/posts?${params.toString()}`);
            return parseInstagramListing(data);
        } catch (error) {
            const is500 =
                error instanceof Error &&
                (error.message.includes("API_ERROR_500") ||
                    error.message.includes("Internal Server Error"));

            if (!is500) throw error;

            // Fall back to reels endpoint
            const params = new URLSearchParams({ handle: cleanHandle, trim: "true" });
            if (cursor) params.set("max_id", cursor);
            const data = await scrapeCreatorsFetch(`/v1/instagram/user/reels?${params.toString()}`);
            const result = parseInstagramReelsListing(data);
            return { ...result, switchedToReels: true };
        }
    }

    // Already in reels mode
    const params = new URLSearchParams({ handle: cleanHandle, trim: "true" });
    if (cursor) params.set("max_id", cursor);
    const data = await scrapeCreatorsFetch(`/v1/instagram/user/reels?${params.toString()}`);
    return parseInstagramReelsListing(data);
}

async function scrapeCreatorsFetch(path: string, attempt = 0): Promise<unknown> {
    const apiKey = process.env.SCRAPECREATORS_API_KEY;

    if (!apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured.");
    }

    const response = await fetch(`${SCRAPECREATORS_BASE_URL}${path}`, {
        headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        if (response.status === 500 && attempt < 2) {
            await sleep(900 * (attempt + 1));
            return scrapeCreatorsFetch(path, attempt + 1);
        }
        const text = await response.text();
        throw new Error(`API_ERROR_${response.status}: ${text.slice(0, 180)}`);
    }

    return response.json() as Promise<unknown>;
}

export function parseInstagramListing(data: unknown): ListingPageResult {
    const record = asRecord(data);
    const items = asArray(record.items).flatMap((item) => {
        const entry = asRecord(item);
        const timestamp = readNumber(entry, ["taken_at"]);
        const publishedAt = timestamp ? new Date(timestamp * 1000) : null;
        if (!publishedAt || Number.isNaN(publishedAt.getTime())) return [];

        const mediaType = instagramMediaType(readNumber(entry, ["media_type"]));

        return [
            {
                id: String(entry.id ?? entry.pk ?? entry.code ?? crypto.randomUUID()),
                url: readString(entry, ["url"]) ?? buildInstagramUrl(readString(entry, ["code"])),
                publishedAt,
                textExcerpt: readString(asRecord(entry.caption), ["text"]),
                thumbnailUrl: extractInstagramThumbnail(entry, mediaType),
                mediaType,
                metrics: {
                    likes: readNumber(entry, ["like_count"]),
                    comments: readNumber(entry, ["comment_count"]),
                    views:
                        readNumber(entry, ["play_count"]) ?? readNumber(entry, ["ig_play_count"]),
                    shares: null,
                },
            } satisfies ReconstructedContentItem,
        ];
    });

    return {
        items,
        nextCursor: readString(record, ["next_max_id"]),
        hasMore: Boolean(record.more_available),
        diagnostics: items.length === 0 ? [responseShapeDiagnostic("Instagram", record)] : [],
    };
}

export function parseInstagramReelsListing(data: unknown): ListingPageResult {
    const record = asRecord(data);
    const pagingInfo = asRecord(record.paging_info);
    const items = asArray(record.items).flatMap((item) => {
        const media = asRecord(asRecord(item).media);
        const timestamp = readNumber(media, ["taken_at"]);
        const publishedAt = timestamp ? new Date(timestamp * 1000) : null;
        if (!publishedAt || Number.isNaN(publishedAt.getTime())) return [];

        const captionRaw = media.caption;
        const textExcerpt =
            typeof captionRaw === "string"
                ? captionRaw
                : readString(asRecord(captionRaw), ["text"]);

        return [
            {
                id: String(media.id ?? media.pk ?? crypto.randomUUID()),
                url: readString(media, ["url"]) ?? buildInstagramUrl(readString(media, ["code"])),
                publishedAt,
                textExcerpt,
                thumbnailUrl: extractInstagramThumbnail(media, "reel"),
                mediaType: "reel" as const,
                metrics: {
                    likes: readNumber(media, ["like_count"]),
                    comments: readNumber(media, ["comment_count"]),
                    views:
                        readNumber(media, ["play_count"]) ?? readNumber(media, ["ig_play_count"]),
                    shares: null,
                },
            } satisfies ReconstructedContentItem,
        ];
    });

    return {
        items,
        nextCursor: readString(pagingInfo, ["max_id"]),
        hasMore: Boolean(pagingInfo.more_available),
        diagnostics: items.length === 0 ? [responseShapeDiagnostic("Instagram Reels", record)] : [],
    };
}

export function parseTikTokListing(data: unknown): ListingPageResult {
    const record = asRecord(data);
    const items = asArray(record.aweme_list).flatMap((item) => {
        const entry = asRecord(item);
        const timestamp =
            readString(entry, ["create_time_utc"]) ?? readNumber(entry, ["create_time"]);
        const publishedAt =
            typeof timestamp === "string" ? new Date(timestamp) : new Date((timestamp ?? 0) * 1000);
        if (Number.isNaN(publishedAt.getTime())) return [];

        const stats = asRecord(entry.statistics);

        return [
            {
                id: String(entry.aweme_id ?? entry.id ?? crypto.randomUUID()),
                url: readString(entry, ["url"]),
                publishedAt,
                textExcerpt: readString(entry, ["desc"]),
                thumbnailUrl: extractTikTokThumbnail(entry),
                mediaType: "video" as const,
                metrics: {
                    likes: readNumber(stats, ["digg_count"]),
                    comments: readNumber(stats, ["comment_count"]),
                    views: readNumber(stats, ["play_count"]),
                    shares: readNumber(stats, ["share_count"]),
                },
            } satisfies ReconstructedContentItem,
        ];
    });

    return {
        items,
        nextCursor: readString(record, ["max_cursor"]),
        hasMore: Boolean(record.has_more),
        diagnostics: items.length === 0 ? [responseShapeDiagnostic("TikTok", record)] : [],
    };
}

export function parseTwitterListing(data: unknown): ListingPageResult {
    const record = asRecord(data);
    const rawTweets = extractTwitterTweetCandidates(record);
    const items = rawTweets.flatMap((item) => {
        const entry = asRecord(item);
        const legacy = asRecord(entry.legacy);
        const publishedRaw =
            readString(legacy, ["created_at"]) ??
            readString(entry, ["created_at"]) ??
            readString(entry, ["createdAt"]) ??
            readString(asRecord(entry.tweet), ["created_at"]);
        const publishedAt = publishedRaw ? new Date(publishedRaw) : null;
        if (!publishedAt || Number.isNaN(publishedAt.getTime())) return [];

        const views = asRecord(entry.views);
        return [
            {
                id: String(entry.rest_id ?? legacy.id_str ?? entry.id ?? crypto.randomUUID()),
                url: readString(entry, ["url"]),
                publishedAt,
                textExcerpt:
                    readString(legacy, ["full_text"]) ??
                    readString(legacy, ["text"]) ??
                    readString(entry, ["text"]) ??
                    readString(entry, ["full_text"]),
                mediaType: "tweet" as const,
                metrics: {
                    likes: readNumber(legacy, ["favorite_count"]),
                    comments: readNumber(legacy, ["reply_count"]),
                    views: readNumber(views, ["count"]),
                    shares:
                        (readNumber(legacy, ["retweet_count"]) ?? 0) +
                        (readNumber(legacy, ["quote_count"]) ?? 0),
                },
            } satisfies ReconstructedContentItem,
        ];
    });

    return {
        items,
        nextCursor: null,
        hasMore: false,
        diagnostics:
            items.length === 0
                ? [
                      responseShapeDiagnostic("Twitter", record),
                      `Parser Twitter menemukan ${rawTweets.length} objek tweet kandidat, namun tidak ada yang memiliki tanggal yang dapat diproses.`,
                  ]
                : [],
    };
}

function extractTwitterTweetCandidates(record: Record<string, unknown>) {
    const directArrays = [
        asArray(record.tweets),
        asArray(record.data),
        asArray(record.items),
        asArray(record.results),
    ].find((items) => items.length > 0);

    if (directArrays) {
        return directArrays;
    }

    const candidates: unknown[] = [];
    collectTwitterCandidates(record, candidates, 0);
    return candidates;
}

function collectTwitterCandidates(value: unknown, candidates: unknown[], depth: number) {
    if (depth > 8 || !value || typeof value !== "object") return;

    if (Array.isArray(value)) {
        for (const item of value) collectTwitterCandidates(item, candidates, depth + 1);
        return;
    }

    const record = value as Record<string, unknown>;
    const legacy = asRecord(record.legacy);
    const looksLikeTweet =
        record.__typename === "Tweet" ||
        !!record.tweet_results ||
        !!record.rest_id ||
        !!readString(legacy, ["full_text"]) ||
        !!readString(legacy, ["created_at"]);

    if (looksLikeTweet) {
        const tweetResult = asRecord(record.tweet_results);
        const result = asRecord(tweetResult.result);
        candidates.push(Object.keys(result).length > 0 ? result : record);
    }

    for (const child of Object.values(record)) {
        collectTwitterCandidates(child, candidates, depth + 1);
    }
}

function instagramMediaType(mediaTypeNum: number | null): ReconstructedContentItem["mediaType"] {
    if (mediaTypeNum === 1) return "image";
    if (mediaTypeNum === 2) return "video";
    if (mediaTypeNum === 8) return "carousel";
    return "unknown";
}

function extractInstagramThumbnail(
    entry: Record<string, unknown>,
    mediaType: ReconstructedContentItem["mediaType"] | undefined,
): string | null {
    if (mediaType === "carousel") {
        const children = asArray(entry.carousel_media);
        if (children.length > 0) {
            return extractInstagramThumbnail(
                asRecord(children[0]),
                instagramMediaType(readNumber(asRecord(children[0]), ["media_type"])),
            );
        }
    }
    const candidates = asArray(asRecord(entry.image_versions2).candidates);
    if (candidates.length > 0) {
        return readString(asRecord(candidates[0]), ["url"]);
    }
    return null;
}

function extractTikTokThumbnail(entry: Record<string, unknown>): string | null {
    const video = asRecord(entry.video);
    const cover = asRecord(video.cover);
    const urlList = asArray(cover.url_list);
    if (urlList.length > 0) {
        return typeof urlList[0] === "string" ? urlList[0] : null;
    }
    return null;
}

function responseShapeDiagnostic(platform: string, record: Record<string, unknown>) {
    const keys = Object.keys(record).slice(0, 12);
    return `Parser ${platform} tidak menemukan item yang dapat diproses. Kunci respons: ${keys.length > 0 ? keys.join(", ") : "tidak ada"}.`;
}

function buildInstagramUrl(code: string | null) {
    return code ? `https://www.instagram.com/p/${code}/` : null;
}

function fetchedDateRange(items: ReconstructedContentItem[]) {
    if (items.length === 0) {
        return { earliest: null, latest: null };
    }

    const sorted = [...items].sort(
        (left, right) => left.publishedAt.getTime() - right.publishedAt.getTime(),
    );

    return {
        earliest: sorted[0]?.publishedAt.toISOString() ?? null,
        latest: sorted[sorted.length - 1]?.publishedAt.toISOString() ?? null,
    };
}

function buildCoverageDiagnostics({
    items,
    year,
    quarter,
    listingPageLimit,
    listingPagesFetched,
    reachedQuarterStart,
}: {
    items: ReconstructedContentItem[];
    year: number;
    quarter: number;
    listingPageLimit: number;
    listingPagesFetched: number;
    reachedQuarterStart: boolean;
}) {
    const quarterItems = items.filter((item) => isInQuarter(item.publishedAt, year, quarter));
    const diagnostics: string[] = [];

    if (items.length === 0) {
        diagnostics.push("Tidak ada data yang dapat diproses dari respons API.");
        return diagnostics;
    }

    if (quarterItems.length === 0) {
        diagnostics.push(
            `Diambil ${items.length} item, namun tidak ada yang masuk ke Q${quarter} ${year}.`,
        );
    }

    if (!reachedQuarterStart && listingPagesFetched >= listingPageLimit) {
        diagnostics.push(
            "Batas halaman data tercapai sebelum menemukan item lebih lama dari awal kuartal. Tingkatkan kedalaman halaman untuk akun dengan volume tinggi.",
        );
    }

    return diagnostics;
}

function isInQuarter(date: Date, year: number, quarter: number) {
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);

    return date >= start && date <= end;
}

function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function readString(record: Record<string, unknown>, path: string[]) {
    const value = readPath(record, path);
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
    return null;
}

function readNumber(record: Record<string, unknown>, path: string[]) {
    const value = readPath(record, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
        return Number(value);
    }
    return null;
}

function readPath(record: Record<string, unknown>, path: string[]) {
    let current: unknown = record;

    for (const key of path) {
        if (!current || typeof current !== "object") return null;
        current = (current as Record<string, unknown>)[key];
    }

    return current;
}
