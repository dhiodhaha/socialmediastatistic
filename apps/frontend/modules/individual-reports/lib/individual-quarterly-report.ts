import type { Platform } from "@repo/database";
import { calculateGrowth } from "@/modules/analytics/lib/report-metrics";

export const INDIVIDUAL_REPORT_PLATFORMS = ["INSTAGRAM", "TIKTOK", "TWITTER"] as const;
export const DEFAULT_INDIVIDUAL_LISTING_PAGE_LIMIT = 3;
export const DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT = 6;

export interface IndividualReportRequest {
    accountId: string;
    platform: Platform;
    year: number;
    quarter: number;
}

export interface CreditEstimateInput {
    includeProfileRequest?: boolean;
    listingPageLimit: number;
    detailedContentLimit: number;
}

export interface IndividualSnapshotSummaryInput {
    accountName: string;
    handle: string;
    platform: Platform;
    year: number;
    quarter: number;
    baselineSnapshot?: IndividualSnapshot | null;
    quarterEndSnapshot?: IndividualSnapshot | null;
}

export interface IndividualSnapshot {
    followers: number;
    posts: number | null;
    likes: number | null;
    scrapedAt: Date;
}

export function validateIndividualReportRequest(input: IndividualReportRequest) {
    if (!input.accountId.trim()) {
        return { valid: false as const, error: "Account is required." };
    }

    if (!INDIVIDUAL_REPORT_PLATFORMS.includes(input.platform)) {
        return { valid: false as const, error: "Unsupported platform." };
    }

    if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
        return { valid: false as const, error: "Year must be a valid four-digit reporting year." };
    }

    if (!Number.isInteger(input.quarter) || input.quarter < 1 || input.quarter > 4) {
        return { valid: false as const, error: "Quarter must be between 1 and 4." };
    }

    return { valid: true as const };
}

export function estimateIndividualReportCredits(input: CreditEstimateInput) {
    const profileCredits = input.includeProfileRequest === false ? 0 : 1;
    const listingCredits = Math.max(0, input.listingPageLimit);
    const detailCredits = Math.max(0, input.detailedContentLimit);

    return {
        totalCredits: profileCredits + listingCredits + detailCredits,
        breakdown: {
            profileCredits,
            listingCredits,
            detailCredits,
        },
        note: "Estimate assumes one ScrapeCreators credit per request. OpenAI usage is not included in this ScrapeCreators estimate.",
    };
}

export function buildIndividualQuarterlySnapshotSummary(input: IndividualSnapshotSummaryInput) {
    const periodLabel = `Q${input.quarter} ${input.year}`;
    const baselineLabel = baselineMonthLabel(input.year, input.quarter);
    const quarterEndLabel = quarterEndMonthLabel(input.year, input.quarter);
    const baselineSnapshot = input.baselineSnapshot || null;
    const quarterEndSnapshot = input.quarterEndSnapshot || null;
    const hasOfficialComparison = !!baselineSnapshot && !!quarterEndSnapshot;

    const followerGrowth = hasOfficialComparison
        ? calculateGrowth(baselineSnapshot.followers, quarterEndSnapshot.followers, "followers")
        : null;
    const postsGrowth = hasOfficialComparison
        ? calculateGrowth(baselineSnapshot.posts || 0, quarterEndSnapshot.posts || 0, "posts")
        : null;
    const likesGrowth =
        input.platform === "TIKTOK" && hasOfficialComparison
            ? calculateGrowth(baselineSnapshot.likes || 0, quarterEndSnapshot.likes || 0, "likes")
            : null;

    const warnings: string[] = [];
    if (!baselineSnapshot) {
        warnings.push(`Quarter-start baseline unavailable for ${baselineLabel}.`);
    }
    if (!quarterEndSnapshot) {
        warnings.push(`Quarter-end snapshot unavailable for ${quarterEndLabel}.`);
    }

    return {
        title: `${input.accountName} ${platformLabel(input.platform)} Individual Quarterly Report`,
        accountName: input.accountName,
        handle: input.handle,
        platform: input.platform,
        platformLabel: platformLabel(input.platform),
        periodLabel,
        baselineLabel,
        quarterEndLabel,
        officialSummary: {
            baseline: baselineSnapshot ? serializeSnapshot(baselineSnapshot) : null,
            quarterEnd: quarterEndSnapshot ? serializeSnapshot(quarterEndSnapshot) : null,
            followerGrowth,
            postsGrowth,
            likesGrowth,
        },
        sections: [
            {
                id: "official-snapshot-summary",
                title: "Official Snapshot-Based Quarterly Summary",
                status: hasOfficialComparison ? "ready" : "incomplete",
            },
            {
                id: "content-reconstruction",
                title: "Quarter Content Reconstruction",
                status: "future-live-fetch",
            },
            {
                id: "selected-content-enrichment",
                title: "Selected Content Enrichment",
                status: "future-live-fetch",
            },
        ],
        warnings,
        methodologyNotes: [
            "Official summary uses stored monthly snapshots from the database.",
            "Content-level reconstruction is intentionally separate from portfolio quarterly reporting.",
            "No live ScrapeCreators request is executed by this foundation workflow.",
        ],
    };
}

export function quarterEndMonthIndex(quarter: number) {
    return quarter * 3 - 1;
}

export function baselineMonthIndex(quarter: number) {
    return (quarter - 1) * 3;
}

export function monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function quarterEndMonthKey(year: number, quarter: number) {
    return monthKey(new Date(year, quarterEndMonthIndex(quarter), 1));
}

export function baselineMonthKey(year: number, quarter: number) {
    return monthKey(new Date(year, baselineMonthIndex(quarter), 1));
}

function quarterEndMonthLabel(year: number, quarter: number) {
    return new Date(year, quarterEndMonthIndex(quarter), 1).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
    });
}

function baselineMonthLabel(year: number, quarter: number) {
    return new Date(year, baselineMonthIndex(quarter), 1).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
    });
}

function platformLabel(platform: Platform) {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    return "Twitter / X";
}

function serializeSnapshot(snapshot: IndividualSnapshot) {
    return {
        followers: snapshot.followers,
        posts: snapshot.posts,
        likes: snapshot.likes,
        scrapedAt: snapshot.scrapedAt.toISOString(),
    };
}
