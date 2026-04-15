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
    coverage: ReturnType<typeof calculateReconstructionCoverage>;
    enrichedItems: ReturnType<typeof selectContentForEnrichment>;
    output: ReturnType<typeof buildContentLevelOutput>;
}

interface ListingPageResult {
    items: ReconstructedContentItem[];
    nextCursor: string | null;
    hasMore: boolean;
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
        const { items, listingPagesFetched, reachedQuarterStart } =
            await fetchQuarterListings(input);
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
            coverage,
            enrichedItems,
            output: buildContentLevelOutput({ coverage, enrichedItems }),
        };
    }
}

async function fetchQuarterListings(input: LiveReviewPlatformInput) {
    const items: ReconstructedContentItem[] = [];
    let cursor: string | null = null;
    let listingPagesFetched = 0;
    let reachedQuarterStart = false;
    const quarterStart = new Date(input.year, (input.quarter - 1) * 3, 1);

    for (let page = 0; page < input.listingPageLimit; page++) {
        const result = await fetchListingPage(input.platform, input.handle, cursor);
        listingPagesFetched++;
        items.push(...result.items);

        if (result.items.some((item) => item.publishedAt < quarterStart)) {
            reachedQuarterStart = true;
            break;
        }

        if (!result.hasMore || !result.nextCursor) {
            break;
        }

        cursor = result.nextCursor;
    }

    return { items, listingPagesFetched, reachedQuarterStart };
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
    };
}

export function parseTwitterListing(data: unknown): ListingPageResult {
    const record = asRecord(data);
    const items = asArray(record.tweets).flatMap((item) => {
        const entry = asRecord(item);
        const legacy = asRecord(entry.legacy);
        const publishedRaw =
            readString(legacy, ["created_at"]) || readString(entry, ["created_at"]);
        const publishedAt = publishedRaw ? new Date(publishedRaw) : null;
        if (!publishedAt || Number.isNaN(publishedAt.getTime())) return [];

        return [
            {
                id: String(entry.rest_id || legacy.id_str || entry.id || crypto.randomUUID()),
                url: readString(entry, ["url"]),
                publishedAt,
                textExcerpt: readString(legacy, ["full_text"]) || readString(entry, ["text"]),
                metrics: {
                    likes: readNumber(legacy, ["favorite_count"]),
                    comments: readNumber(legacy, ["reply_count"]),
                    views: readNumber(asRecord(entry.views), ["count"]),
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
    };
}

function buildInstagramUrl(code: string | null) {
    return code ? `https://www.instagram.com/p/${code}/` : null;
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
