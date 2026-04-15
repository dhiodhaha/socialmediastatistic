import type { Platform } from "@repo/types";
import {
    buildContentLevelOutput,
    calculateReconstructionCoverage,
    type ReconstructedContentItem,
    selectContentForEnrichment,
} from "../lib/content-reconstruction";

const SCRAPECREATORS_BASE_URL = "https://api.scrapecreators.com";

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
}

interface ListingPageResult {
    items: ReconstructedContentItem[];
    nextCursor: string | null;
    hasMore: boolean;
    diagnostics?: string[];
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
        const { items, listingPagesFetched, reachedQuarterStart, parserDiagnostics } =
            await fetchQuarterListings(input);
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
                "ScrapeCreators Twitter user-tweets returns up to 100 popular public tweets, not a chronological latest feed; quarter coverage can be empty even when the account posted in the quarter.",
            );
        }
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

        return {
            platform: input.platform,
            handle: input.handle,
            success: true,
            creditsUsed: listingPagesFetched,
            rawItemsFetched: items.length,
            fetchedDateRange: fetchedDateRange(items),
            diagnostics,
            coverage,
            enrichedItems,
            output: buildContentLevelOutput({ coverage, enrichedItems }),
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
            error: error instanceof Error ? error.message : "Unknown ScrapeCreators error",
            creditsUsed: 0,
            rawItemsFetched: 0,
            fetchedDateRange: {
                earliest: null,
                latest: null,
            },
            diagnostics: [],
            coverage,
            enrichedItems,
            output: buildContentLevelOutput({ coverage, enrichedItems }),
        };
    }
}

async function fetchQuarterListings(input: LiveReviewPlatformInput) {
    const items: ReconstructedContentItem[] = [];
    const parserDiagnostics: string[] = [];
    let cursor: string | null = null;
    let listingPagesFetched = 0;
    let reachedQuarterStart = false;
    const quarterStart = new Date(input.year, (input.quarter - 1) * 3, 1);

    for (let page = 0; page < input.listingPageLimit; page++) {
        const result = await fetchListingPage(input.platform, input.handle, cursor);
        listingPagesFetched++;
        items.push(...result.items);
        parserDiagnostics.push(...(result.diagnostics || []));

        if (result.items.some((item) => item.publishedAt < quarterStart)) {
            reachedQuarterStart = true;
            break;
        }

        if (!result.hasMore || !result.nextCursor) {
            break;
        }

        cursor = result.nextCursor;
    }

    return { items, listingPagesFetched, reachedQuarterStart, parserDiagnostics };
}

async function fetchListingPage(
    platform: Platform,
    handle: string,
    cursor: string | null,
): Promise<ListingPageResult> {
    const cleanHandle = handle.trim().replace(/^@/, "");
    const params = new URLSearchParams({ handle: cleanHandle, trim: "true" });

    if (platform === "INSTAGRAM" && cursor) {
        params.set("next_max_id", cursor);
    }
    if (platform === "TIKTOK") {
        params.set("sort_by", "latest");
        if (cursor) params.set("max_cursor", cursor);
    }

    const path = listingEndpoint(platform);
    const data = await scrapeCreatorsFetch(`${path}?${params.toString()}`);

    if (platform === "INSTAGRAM") return parseInstagramListing(data);
    if (platform === "TIKTOK") return parseTikTokListing(data);
    return parseTwitterListing(data);
}

async function scrapeCreatorsFetch(path: string) {
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
        const text = await response.text();
        throw new Error(`ScrapeCreators ${response.status}: ${text.slice(0, 180)}`);
    }

    return response.json() as Promise<unknown>;
}

function listingEndpoint(platform: Platform) {
    if (platform === "INSTAGRAM") return "/v2/instagram/user/posts";
    if (platform === "TIKTOK") return "/v3/tiktok/profile/videos";
    return "/v1/twitter/user-tweets";
}

export function parseInstagramListing(data: unknown): ListingPageResult {
    const record = asRecord(data);
    const items = asArray(record.items).flatMap((item) => {
        const entry = asRecord(item);
        const timestamp = readNumber(entry, ["taken_at"]);
        const publishedAt = timestamp ? new Date(timestamp * 1000) : null;
        if (!publishedAt || Number.isNaN(publishedAt.getTime())) return [];

        return [
            {
                id: String(entry.id || entry.pk || entry.code || crypto.randomUUID()),
                url: readString(entry, ["url"]) || buildInstagramUrl(readString(entry, ["code"])),
                publishedAt,
                textExcerpt: readString(asRecord(entry.caption), ["text"]),
                metrics: {
                    likes: readNumber(entry, ["like_count"]),
                    comments: readNumber(entry, ["comment_count"]),
                    views:
                        readNumber(entry, ["play_count"]) ?? readNumber(entry, ["ig_play_count"]),
                    shares: null,
                },
            },
        ];
    });

    return {
        items,
        nextCursor: readString(record, ["next_max_id"]),
        hasMore: Boolean(record.more_available),
        diagnostics: items.length === 0 ? [responseShapeDiagnostic("Instagram", record)] : [],
    };
}

export function parseTikTokListing(data: unknown): ListingPageResult {
    const record = asRecord(data);
    const items = asArray(record.aweme_list).flatMap((item) => {
        const entry = asRecord(item);
        const timestamp =
            readString(entry, ["create_time_utc"]) || readNumber(entry, ["create_time"]);
        const publishedAt =
            typeof timestamp === "string" ? new Date(timestamp) : new Date((timestamp || 0) * 1000);
        if (Number.isNaN(publishedAt.getTime())) return [];

        const stats = asRecord(entry.statistics);

        return [
            {
                id: String(entry.aweme_id || entry.id || crypto.randomUUID()),
                url: readString(entry, ["url"]),
                publishedAt,
                textExcerpt: readString(entry, ["desc"]),
                metrics: {
                    likes: readNumber(stats, ["digg_count"]),
                    comments: readNumber(stats, ["comment_count"]),
                    views: readNumber(stats, ["play_count"]),
                    shares: readNumber(stats, ["share_count"]),
                },
            },
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
            readString(legacy, ["created_at"]) ||
            readString(entry, ["created_at"]) ||
            readString(entry, ["createdAt"]) ||
            readString(asRecord(entry.tweet), ["created_at"]);
        const publishedAt = publishedRaw ? new Date(publishedRaw) : null;
        if (!publishedAt || Number.isNaN(publishedAt.getTime())) return [];

        const views = asRecord(entry.views);
        return [
            {
                id: String(entry.rest_id || legacy.id_str || entry.id || crypto.randomUUID()),
                url: readString(entry, ["url"]),
                publishedAt,
                textExcerpt:
                    readString(legacy, ["full_text"]) ||
                    readString(legacy, ["text"]) ||
                    readString(entry, ["text"]) ||
                    readString(entry, ["full_text"]),
                metrics: {
                    likes: readNumber(legacy, ["favorite_count"]),
                    comments: readNumber(legacy, ["reply_count"]),
                    views: readNumber(views, ["count"]),
                    shares:
                        (readNumber(legacy, ["retweet_count"]) || 0) +
                        (readNumber(legacy, ["quote_count"]) || 0),
                },
            },
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
                      `Twitter parser found ${rawTweets.length} candidate tweet object(s), but none had a parseable created_at date.`,
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

function responseShapeDiagnostic(platform: string, record: Record<string, unknown>) {
    const keys = Object.keys(record).slice(0, 12);
    return `${platform} parser did not find parseable listing items. Response keys: ${keys.length > 0 ? keys.join(", ") : "none"}.`;
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
        earliest: sorted[0]?.publishedAt.toISOString() || null,
        latest: sorted[sorted.length - 1]?.publishedAt.toISOString() || null,
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
        diagnostics.push("ScrapeCreators returned no parseable listing items.");
        return diagnostics;
    }

    if (quarterItems.length === 0) {
        diagnostics.push(
            `Fetched ${items.length} listing item(s), but none were inside Q${quarter} ${year}.`,
        );
    }

    if (!reachedQuarterStart && listingPagesFetched >= listingPageLimit) {
        diagnostics.push(
            "The listing page limit was reached before an item older than the quarter start was found. Increase page depth for high-volume accounts.",
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
