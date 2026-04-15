import type { QuarterlyPlatformPreview, QuarterlyPreviewRow } from "./quarterly-platform-preview";

export type QuarterlyExportScope = "PLATFORM" | "ALL";

export interface QuarterlyExportData {
    periodLabel: string;
    baselineLabel: string;
    includeCover?: boolean;
    customTitle?: string;
    scope: QuarterlyExportScope;
    executiveSummary: {
        headlineLabel: string;
        headlineValue: number;
        quarterEndCoverageLabel: string;
        fullQuarterCoverageLabel: string;
        totalAccounts: number;
        warnings: string[];
        methodologyNote: string | null;
        sourceMonths: Array<{
            label: string;
            sourceLabel: string;
        }>;
        baselineSourceLabel: string;
        platformHighlights: Array<{
            platform: string;
            netFollowerGrowth: number;
            rankingEligibleCount: number;
            performanceIssueCount: number;
            dataQualityIssueCount: number;
            topGainers: Array<{
                accountName: string;
                handle: string;
                followerGrowthPct: number;
                followerGrowthValue: number;
            }>;
            topDecliners: Array<{
                accountName: string;
                handle: string;
                followerGrowthPct: number;
                followerGrowthValue: number;
            }>;
        }>;
    };
    sections: Array<{
        platform: string;
        summary: {
            netFollowerGrowth: number;
            rankingEligibleCount: number;
            totalAccounts: number;
            performanceIssueCount: number;
            dataQualityIssueCount: number;
        };
        rows: Array<{
            accountName: string;
            handle: string;
            category: string;
            sharedAccount: boolean;
            isRanked: boolean;
            performanceIssue: boolean;
            dataQualityIssue: boolean;
            detailNote: string | null;
            oldFollowers: number | null;
            newFollowers: number | null;
            followersPct: number | null;
            oldPosts: number | null;
            newPosts: number | null;
            postsPct: number | null;
            oldLikes: number | null;
            newLikes: number | null;
            likesPct: number | null;
        }>;
    }>;
}

export function buildQuarterlyExportData({
    preview,
    categoryLabel,
    scope,
    selectedPlatform,
}: {
    preview: QuarterlyPlatformPreview;
    categoryLabel: string;
    scope: QuarterlyExportScope;
    selectedPlatform?: string;
}): QuarterlyExportData {
    const selectedSummaries = preview.summaries.filter((summary) =>
        scope === "ALL"
            ? preview.rows.some((row) => row.platform === summary.platform)
            : summary.platform === selectedPlatform,
    );
    const selectedRows = preview.rows.filter((row) =>
        scope === "ALL" ? true : row.platform === selectedPlatform,
    );

    const periodLabel = `Q${preview.status.selectedQuarter} ${preview.status.selectedYear}`;
    const quarterEndCoverageLabel = `${preview.status.coverage.quarterEndCaptured}/${preview.status.coverage.totalAccounts}`;
    const fullQuarterCoverageLabel = `${preview.status.coverage.fullQuarterCaptured}/${preview.status.coverage.totalAccounts}`;

    return {
        periodLabel,
        baselineLabel: preview.status.baseline.label,
        includeCover: true,
        customTitle:
            scope === "ALL"
                ? `Laporan Triwulanan<br/>${categoryLabel}`
                : `Laporan Triwulanan ${platformLabel(selectedPlatform || "")}<br/>${categoryLabel}`,
        scope,
        executiveSummary: {
            headlineLabel: "Cross-platform net follower growth",
            headlineValue: selectedSummaries.reduce(
                (total, summary) => total + summary.netFollowerGrowth,
                0,
            ),
            quarterEndCoverageLabel,
            fullQuarterCoverageLabel,
            totalAccounts: preview.status.coverage.totalAccounts,
            warnings: preview.status.warnings,
            methodologyNote: preview.methodologyNote,
            sourceMonths: preview.status.sourceMonths.map((month) => ({
                label: month.label,
                sourceLabel: month.sourceLabel || "Missing anchor",
            })),
            baselineSourceLabel: preview.status.baseline.sourceLabel || "Baseline unavailable",
            platformHighlights: selectedSummaries.map((summary) => ({
                platform: platformLabel(summary.platform),
                netFollowerGrowth: summary.netFollowerGrowth,
                rankingEligibleCount: summary.rankingEligibleCount,
                performanceIssueCount: summary.performanceIssueCount,
                dataQualityIssueCount: summary.dataQualityIssueCount,
                topGainers: summary.topGainers.map((mover) => ({
                    accountName: mover.accountName,
                    handle: mover.handle,
                    followerGrowthPct: mover.followerGrowthPct,
                    followerGrowthValue: mover.followerGrowthValue,
                })),
                topDecliners: summary.topDecliners.map((mover) => ({
                    accountName: mover.accountName,
                    handle: mover.handle,
                    followerGrowthPct: mover.followerGrowthPct,
                    followerGrowthValue: mover.followerGrowthValue,
                })),
            })),
        },
        sections: selectedSummaries.map((summary) => ({
            platform: platformLabel(summary.platform),
            summary: {
                netFollowerGrowth: summary.netFollowerGrowth,
                rankingEligibleCount: summary.rankingEligibleCount,
                totalAccounts: summary.totalAccounts,
                performanceIssueCount: summary.performanceIssueCount,
                dataQualityIssueCount: summary.dataQualityIssueCount,
            },
            rows: selectedRows
                .filter((row) => row.platform === summary.platform)
                .map((row) => mapExportRow(row)),
        })),
    };
}

function mapExportRow(row: QuarterlyPreviewRow) {
    return {
        accountName: row.accountName,
        handle: `@${row.handle}`,
        category: row.category,
        sharedAccount: row.sharedAccount,
        isRanked: row.rankingEligible,
        performanceIssue: row.performanceIssue,
        dataQualityIssue: row.dataQualityIssue,
        detailNote: row.detailNote,
        oldFollowers: row.oldStats.followers,
        newFollowers: row.newStats.followers,
        followersPct: row.delta.followersPct,
        oldPosts: row.oldStats.posts,
        newPosts: row.newStats.posts,
        postsPct: row.delta.postsPct,
        oldLikes: row.oldStats.likes,
        newLikes: row.newStats.likes,
        likesPct: row.delta.likesPct,
    };
}

function platformLabel(platform: string) {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    if (platform === "TWITTER") return "Twitter / X";
    return platform;
}
