import { describe, expect, it } from "vitest";
import { buildQuarterlyExportData } from "./quarterly-export";
import type { QuarterlyPlatformPreview } from "./quarterly-platform-preview";

const preview: QuarterlyPlatformPreview = {
    status: {
        selectedYear: 2026,
        selectedQuarter: 1,
        sourceMonths: [
            {
                key: "2026-01",
                label: "Jan 2026",
                hasAnchor: true,
                anchorJobId: "jan",
                source: "inferred",
                sourceLabel: "Auto from completion month",
            },
            {
                key: "2026-02",
                label: "Feb 2026",
                hasAnchor: true,
                anchorJobId: "feb",
                source: "inferred",
                sourceLabel: "Auto from completion month",
            },
            {
                key: "2026-03",
                label: "Mar 2026",
                hasAnchor: true,
                anchorJobId: "mar",
                source: "manual",
                sourceLabel: "Manual reporting month",
            },
        ],
        quarterEnd: {
            key: "2026-03",
            label: "Mar 2026",
            hasAnchor: true,
            anchorJobId: "mar",
            source: "manual",
            sourceLabel: "Manual reporting month",
        },
        baseline: {
            key: "2025-12",
            label: "Dec 2025",
            hasAnchor: true,
            anchorJobId: "dec",
            source: "inferred",
            sourceLabel: "Auto from completion month",
        },
        availability: {
            isAvailable: true,
            reason: "Quarter available for review",
        },
        coverage: {
            quarterEndCaptured: 8,
            fullQuarterCaptured: 6,
            totalAccounts: 10,
        },
        warnings: ["Missing supporting month snapshots: Feb 2026."],
    },
    rows: [
        {
            accountId: "1",
            accountName: "Kemdikbud",
            handle: "kemdikbud",
            category: "Pendidikan",
            platform: "INSTAGRAM",
            rankingEligible: true,
            hasQuarterEndData: true,
            performanceIssue: false,
            dataQualityIssue: false,
            missingMonths: [],
            oldStats: { followers: 100, posts: 10, likes: null },
            newStats: { followers: 130, posts: 15, likes: null },
            delta: {
                followersVal: 30,
                followersPct: 30,
                postsVal: 5,
                postsPct: 50,
                likesVal: null,
                likesPct: null,
            },
            issueLabels: [],
            detailNote: null,
        },
        {
            accountId: "2",
            accountName: "Kominfo",
            handle: "kominfo",
            category: "Komunikasi",
            platform: "TIKTOK",
            rankingEligible: true,
            hasQuarterEndData: true,
            performanceIssue: true,
            dataQualityIssue: false,
            missingMonths: [],
            oldStats: { followers: 100, posts: 10, likes: 1000 },
            newStats: { followers: 90, posts: 12, likes: 900 },
            delta: {
                followersVal: -10,
                followersPct: -10,
                postsVal: 2,
                postsPct: 20,
                likesVal: -100,
                likesPct: -10,
            },
            issueLabels: ["Performance issue"],
            detailNote: null,
        },
    ],
    summaries: [
        {
            platform: "INSTAGRAM",
            totalAccounts: 1,
            rankingEligibleCount: 1,
            performanceIssueCount: 0,
            dataQualityIssueCount: 0,
            netFollowerGrowth: 30,
            topGainers: [
                {
                    accountId: "1",
                    accountName: "Kemdikbud",
                    handle: "kemdikbud",
                    category: "Pendidikan",
                    followerGrowthPct: 30,
                    followerGrowthValue: 30,
                    detailNote: null,
                },
            ],
            topDecliners: [],
        },
        {
            platform: "TIKTOK",
            totalAccounts: 1,
            rankingEligibleCount: 1,
            performanceIssueCount: 1,
            dataQualityIssueCount: 0,
            netFollowerGrowth: -10,
            topGainers: [],
            topDecliners: [
                {
                    accountId: "2",
                    accountName: "Kominfo",
                    handle: "kominfo",
                    category: "Komunikasi",
                    followerGrowthPct: -10,
                    followerGrowthValue: -10,
                    detailNote: null,
                },
            ],
        },
        {
            platform: "TWITTER",
            totalAccounts: 0,
            rankingEligibleCount: 0,
            performanceIssueCount: 0,
            dataQualityIssueCount: 0,
            netFollowerGrowth: 0,
            topGainers: [],
            topDecliners: [],
        },
    ],
};

describe("buildQuarterlyExportData", () => {
    it("builds combined quarterly export data with executive summary", () => {
        const result = buildQuarterlyExportData({
            preview,
            categoryLabel: "Semua Kategori",
            scope: "ALL",
        });

        expect(result.periodLabel).toBe("Q1 2026");
        expect(result.executiveSummary.headlineValue).toBe(20);
        expect(result.executiveSummary.quarterEndCoverageLabel).toBe("8/10");
        expect(result.executiveSummary.sourceMonths).toContainEqual({
            label: "Mar 2026",
            sourceLabel: "Manual reporting month",
        });
        expect(result.executiveSummary.baselineSourceLabel).toBe("Auto from completion month");
        expect(result.sections).toHaveLength(2);
        expect(result.sections[0]?.platform).toBe("Instagram");
    });

    it("builds per-platform quarterly export data", () => {
        const result = buildQuarterlyExportData({
            preview,
            categoryLabel: "Komunikasi",
            scope: "PLATFORM",
            selectedPlatform: "TIKTOK",
        });

        expect(result.scope).toBe("PLATFORM");
        expect(result.sections).toHaveLength(1);
        expect(result.sections[0]?.platform).toBe("TikTok");
        expect(result.executiveSummary.headlineValue).toBe(-10);
    });
});
