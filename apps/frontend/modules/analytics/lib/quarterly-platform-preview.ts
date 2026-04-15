import type { Platform } from "@repo/database";
import { calculateGrowth } from "@/modules/analytics/lib/report-metrics";
import type { QuarterlyStatus } from "./quarterly-reporting";

export interface QuarterlyPreviewSnapshot {
    platform: Platform;
    followers: number;
    posts: number | null;
    likes: number | null;
    scrapedAt: Date;
    jobId?: string | null;
}

export interface QuarterlyPreviewAccount {
    id: string;
    username: string;
    instagram: string | null;
    tiktok: string | null;
    twitter: string | null;
    categoryNames: string[];
    snapshots: QuarterlyPreviewSnapshot[];
}

export interface QuarterlyPreviewRow {
    accountId: string;
    accountName: string;
    handle: string;
    category: string;
    platform: Platform;
    sharedAccount: boolean;
    rankingEligible: boolean;
    hasQuarterEndData: boolean;
    performanceIssue: boolean;
    dataQualityIssue: boolean;
    missingMonths: string[];
    oldStats: { followers: number | null; posts: number | null; likes: number | null };
    newStats: { followers: number | null; posts: number | null; likes: number | null };
    delta: {
        followersVal: number | null;
        followersPct: number | null;
        postsVal: number | null;
        postsPct: number | null;
        likesVal: number | null;
        likesPct: number | null;
    };
    issueLabels: string[];
    detailNote: string | null;
}

export interface QuarterlyMover {
    accountId: string;
    accountName: string;
    handle: string;
    category: string;
    followerGrowthPct: number;
    followerGrowthValue: number;
    detailNote: string | null;
}

export interface QuarterlyPlatformSummary {
    platform: Platform;
    totalAccounts: number;
    rankingEligibleCount: number;
    performanceIssueCount: number;
    dataQualityIssueCount: number;
    netFollowerGrowth: number;
    topGainers: QuarterlyMover[];
    topDecliners: QuarterlyMover[];
}

export interface QuarterlyPlatformPreview {
    status: QuarterlyStatus;
    methodologyNote: string | null;
    rows: QuarterlyPreviewRow[];
    summaries: QuarterlyPlatformSummary[];
}

export function buildQuarterlyPlatformPreview({
    status,
    accounts,
    categoryFilterLabel,
}: {
    status: QuarterlyStatus;
    accounts: QuarterlyPreviewAccount[];
    categoryFilterLabel?: string | null;
}): QuarterlyPlatformPreview {
    const rows: QuarterlyPreviewRow[] = [];

    for (const account of accounts) {
        const category =
            account.categoryNames.length > 0
                ? account.categoryNames.join(", ")
                : "Official Account";

        const platforms: Array<{ platform: Platform; handle: string | null }> = [
            { platform: "INSTAGRAM", handle: account.instagram },
            { platform: "TIKTOK", handle: account.tiktok },
            { platform: "TWITTER", handle: account.twitter },
        ];

        for (const platformEntry of platforms) {
            if (!platformEntry.handle) continue;

            const platformSnapshots = account.snapshots.filter(
                (snapshot) => snapshot.platform === platformEntry.platform,
            );

            const baselineSnapshot = findSnapshotForAnchor(platformSnapshots, {
                key: status.baseline.key,
                anchorJobId: status.baseline.anchorJobId,
            });
            const quarterEndSnapshot = findSnapshotForAnchor(platformSnapshots, {
                key: status.quarterEnd.key,
                anchorJobId: status.quarterEnd.anchorJobId,
            });

            const coveredMonths = new Set<string>();
            for (const month of status.sourceMonths) {
                if (
                    findSnapshotForAnchor(platformSnapshots, {
                        key: month.key,
                        anchorJobId: month.anchorJobId,
                    })
                ) {
                    coveredMonths.add(month.key);
                }
            }

            const missingMonths = status.sourceMonths
                .filter((month) => !coveredMonths.has(month.key))
                .map((month) => month.label);

            const rankingEligible = !!quarterEndSnapshot && !!baselineSnapshot;

            const followerDelta = rankingEligible
                ? calculateGrowth(
                      baselineSnapshot.followers,
                      quarterEndSnapshot.followers,
                      "followers",
                  )
                : null;
            const postsDelta = rankingEligible
                ? calculateGrowth(
                      baselineSnapshot.posts || 0,
                      quarterEndSnapshot.posts || 0,
                      "posts",
                  )
                : null;
            const likesDelta =
                platformEntry.platform === "TIKTOK" && rankingEligible
                    ? calculateGrowth(
                          baselineSnapshot.likes || 0,
                          quarterEndSnapshot.likes || 0,
                          "likes",
                      )
                    : null;

            const performanceIssue = !!(rankingEligible && (followerDelta?.followersVal || 0) < 0);
            const dataQualityIssue = !quarterEndSnapshot || missingMonths.length > 0;

            const issueLabels: string[] = [];
            if (performanceIssue) issueLabels.push("Performance issue");
            if (dataQualityIssue) issueLabels.push("Data quality issue");

            let detailNote: string | null = null;
            if (!quarterEndSnapshot) {
                detailNote = "Missing quarter-end snapshot.";
            } else if (!baselineSnapshot) {
                detailNote = "Previous quarter baseline unavailable.";
            } else if (missingMonths.length > 0) {
                detailNote = `Missing supporting month snapshots: ${missingMonths.join(", ")}.`;
            }

            rows.push({
                accountId: account.id,
                accountName: account.username,
                handle: platformEntry.handle,
                category,
                platform: platformEntry.platform,
                sharedAccount: account.categoryNames.length > 1,
                rankingEligible,
                hasQuarterEndData: !!quarterEndSnapshot,
                performanceIssue,
                dataQualityIssue,
                missingMonths,
                oldStats: {
                    followers: baselineSnapshot?.followers ?? null,
                    posts: baselineSnapshot?.posts ?? null,
                    likes: baselineSnapshot?.likes ?? null,
                },
                newStats: {
                    followers: quarterEndSnapshot?.followers ?? null,
                    posts: quarterEndSnapshot?.posts ?? null,
                    likes: quarterEndSnapshot?.likes ?? null,
                },
                delta: {
                    followersVal: followerDelta?.followersVal ?? null,
                    followersPct: followerDelta?.followersPct ?? null,
                    postsVal: postsDelta?.postsVal ?? null,
                    postsPct: postsDelta?.postsPct ?? null,
                    likesVal: likesDelta?.likesVal ?? null,
                    likesPct: likesDelta?.likesPct ?? null,
                },
                issueLabels,
                detailNote,
            });
        }
    }

    return {
        status,
        methodologyNote: categoryFilterLabel
            ? `Category-filtered quarterly views use current category membership for ${categoryFilterLabel}. Shared accounts may appear in multiple reporting groups, and category totals should not be treated as additive rollups.`
            : null,
        rows,
        summaries: buildPlatformSummaries(rows),
    };
}

function buildPlatformSummaries(rows: QuarterlyPreviewRow[]): QuarterlyPlatformSummary[] {
    return (["INSTAGRAM", "TIKTOK", "TWITTER"] as const).map((platform) => {
        const platformRows = rows.filter((row) => row.platform === platform);
        const rankedRows = platformRows
            .filter((row) => row.rankingEligible && row.delta.followersPct !== null)
            .toSorted((a, b) => (b.delta.followersPct || 0) - (a.delta.followersPct || 0));

        return {
            platform,
            totalAccounts: platformRows.length,
            rankingEligibleCount: rankedRows.length,
            performanceIssueCount: platformRows.filter((row) => row.performanceIssue).length,
            dataQualityIssueCount: platformRows.filter((row) => row.dataQualityIssue).length,
            netFollowerGrowth: rankedRows.reduce(
                (total, row) => total + (row.delta.followersVal || 0),
                0,
            ),
            topGainers: rankedRows.slice(0, 3).map(toQuarterlyMover),
            topDecliners: rankedRows.toReversed().slice(0, 3).map(toQuarterlyMover),
        };
    });
}

function toQuarterlyMover(row: QuarterlyPreviewRow): QuarterlyMover {
    return {
        accountId: row.accountId,
        accountName: row.accountName,
        handle: row.handle,
        category: row.category,
        followerGrowthPct: row.delta.followersPct || 0,
        followerGrowthValue: row.delta.followersVal || 0,
        detailNote: row.detailNote,
    };
}

function findSnapshotForAnchor(
    snapshots: QuarterlyPreviewSnapshot[],
    anchor: { key: string; anchorJobId: string | null },
) {
    if (anchor.anchorJobId) {
        const snapshotByJob = snapshots.find((snapshot) => snapshot.jobId === anchor.anchorJobId);
        if (snapshotByJob) return snapshotByJob;
    }

    return snapshots.find((snapshot) => monthString(snapshot.scrapedAt) === anchor.key) || null;
}

function monthString(date: Date) {
    return date.toISOString().slice(0, 7);
}
