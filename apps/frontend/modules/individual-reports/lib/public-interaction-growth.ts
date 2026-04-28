import type { Platform } from "@repo/database";
import { calculateGrowth } from "@/modules/analytics/lib/report-metrics";

export type InteractionCoverageStatus =
    | "complete-public-coverage"
    | "partial-public-coverage"
    | "limited-platform-coverage"
    | "unavailable";

export interface NormalizedQuarterInteractions {
    platform: Platform;
    quarterItemCount: number;
    publicInteractions: number;
    publicReachInteractions: number | null;
    breakdown: {
        likes: number;
        comments: number;
        shares: number;
        saves: number;
        reposts: number;
        quotes: number;
        bookmarks: number;
        views: number;
    };
    coverageStatus: InteractionCoverageStatus;
}

export interface InteractionGrowthResult {
    platform: Platform;
    current: NormalizedQuarterInteractions;
    comparison: NormalizedQuarterInteractions | null;
    absoluteDelta: number | null;
    percentDelta: number | null;
    reason: string | null;
    reachAbsoluteDelta: number | null;
    reachPercentDelta: number | null;
}

export interface InteractionResultJson {
    platform: Platform;
    coverage?: {
        status?: string | null;
    } | null;
    quarterSummary?: {
        quarterItemCount?: number | null;
        totalLikes?: number | null;
        totalComments?: number | null;
        totalViews?: number | null;
        totalShares?: number | null;
        totalSaves?: number | null;
        totalReposts?: number | null;
        totalQuotes?: number | null;
        totalBookmarks?: number | null;
        avgViews?: number | null;
        isPopularMode?: boolean | null;
    } | null;
}

export function asInteractionResultJson(value: unknown): InteractionResultJson | null {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    if (!isPlatform(record.platform)) return null;

    return value as InteractionResultJson;
}

export function determineInteractionCoverage(
    platform: Platform,
    coverageStatus: string,
    isPopularMode: boolean,
): InteractionCoverageStatus {
    if (platform === "TWITTER") {
        return "limited-platform-coverage";
    }

    if (coverageStatus === "complete-listing-coverage") {
        return "complete-public-coverage";
    }

    if (coverageStatus === "partial-listing-coverage") {
        return "partial-public-coverage";
    }

    return "unavailable";
}

export function normalizeQuarterInteractions(
    resultJson: InteractionResultJson,
): NormalizedQuarterInteractions {
    const platform = resultJson.platform;
    const isPopularMode = resultJson.quarterSummary?.isPopularMode === true;
    const coverageStatus = determineInteractionCoverage(
        platform,
        resultJson.coverage?.status || "empty",
        isPopularMode,
    );

    const qs = resultJson.quarterSummary;
    if (!qs) {
        return {
            platform,
            quarterItemCount: 0,
            publicInteractions: 0,
            publicReachInteractions: null,
            breakdown: {
                likes: 0,
                comments: 0,
                shares: 0,
                saves: 0,
                reposts: 0,
                quotes: 0,
                bookmarks: 0,
                views: 0,
            },
            coverageStatus,
        };
    }

    const likes = qs.totalLikes || 0;
    const comments = qs.totalComments || 0;
    const views = qs.totalViews || 0;
    const shares = qs.totalShares || 0;
    const saves = qs.totalSaves || 0;
    const reposts = qs.totalReposts || 0;
    const quotes = qs.totalQuotes || 0;
    const bookmarks = qs.totalBookmarks || 0;

    const publicInteractions = likes + comments + shares + saves + reposts + quotes + bookmarks;

    const hasViews = qs.avgViews !== null && qs.avgViews !== undefined;
    const publicReachInteractions = hasViews ? publicInteractions + views : null;

    return {
        platform,
        quarterItemCount: qs.quarterItemCount || 0,
        publicInteractions,
        publicReachInteractions,
        breakdown: {
            likes,
            comments,
            shares,
            saves,
            reposts,
            quotes,
            bookmarks,
            views,
        },
        coverageStatus,
    };
}

export function computeInteractionGrowth(
    currentResultJson: InteractionResultJson,
    comparisonResultJson: InteractionResultJson | null,
    platform: Platform,
): InteractionGrowthResult {
    const current = normalizeQuarterInteractions(currentResultJson);
    const comparison = comparisonResultJson
        ? normalizeQuarterInteractions(comparisonResultJson)
        : null;

    let absoluteDelta: number | null = null;
    let percentDelta: number | null = null;
    let reachAbsoluteDelta: number | null = null;
    let reachPercentDelta: number | null = null;
    let reason: string | null = null;

    if (!comparison) {
        reason = null;
    } else if (comparison.publicInteractions === 0) {
        reason =
            "Kuartal pembanding memiliki 0 interaksi, persentase pertumbuhan tidak dapat dihitung.";
        absoluteDelta = current.publicInteractions - comparison.publicInteractions;
    } else {
        const growth = calculateGrowth(
            comparison.publicInteractions,
            current.publicInteractions,
            "likes", // re-using the likes key from the generic calculateGrowth to get standard pct
        );
        absoluteDelta = growth.likesVal;
        percentDelta = growth.likesPct;
    }

    if (
        comparison &&
        comparison.publicReachInteractions !== null &&
        current.publicReachInteractions !== null
    ) {
        if (comparison.publicReachInteractions === 0) {
            reachAbsoluteDelta =
                current.publicReachInteractions - comparison.publicReachInteractions;
        } else {
            const growth = calculateGrowth(
                comparison.publicReachInteractions,
                current.publicReachInteractions,
                "likes",
            );
            reachAbsoluteDelta = growth.likesVal;
            reachPercentDelta = growth.likesPct;
        }
    }

    return {
        platform,
        current,
        comparison,
        absoluteDelta,
        percentDelta,
        reason,
        reachAbsoluteDelta,
        reachPercentDelta,
    };
}

function isPlatform(value: unknown): value is Platform {
    return value === "INSTAGRAM" || value === "TIKTOK" || value === "TWITTER";
}
