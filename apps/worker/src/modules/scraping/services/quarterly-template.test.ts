import assert from "node:assert/strict";
import test from "node:test";
import { generateQuarterlyReportHtml } from "./quarterly-template";

test("generateQuarterlyReportHtml renders executive summary and platform sections", () => {
    const html = generateQuarterlyReportHtml({
        periodLabel: "Q1 2026",
        baselineLabel: "Dec 2025",
        generatedAt: "15/04/2026 10:00",
        scope: "ALL",
        includeCover: true,
        customTitle: "Laporan Triwulanan",
        executiveSummary: {
            headlineLabel: "Cross-platform net follower growth",
            headlineValue: 120,
            quarterEndCoverageLabel: "8/10",
            fullQuarterCoverageLabel: "6/10",
            totalAccounts: 10,
            methodologyNote: "Category-filtered quarterly views use current category membership.",
            warnings: ["Missing supporting month snapshots: Feb 2026."],
            platformHighlights: [
                {
                    platform: "Instagram",
                    netFollowerGrowth: 120,
                    rankingEligibleCount: 8,
                    performanceIssueCount: 1,
                    dataQualityIssueCount: 2,
                    topGainers: [
                        {
                            accountName: "Kemdikbud",
                            handle: "kemdikbud",
                            followerGrowthPct: 12,
                            followerGrowthValue: 120,
                        },
                    ],
                    topDecliners: [],
                },
            ],
        },
        sections: [
            {
                platform: "Instagram",
                summary: {
                    netFollowerGrowth: 120,
                    rankingEligibleCount: 8,
                    totalAccounts: 10,
                    performanceIssueCount: 1,
                    dataQualityIssueCount: 2,
                },
                rows: [
                    {
                        accountName: "Kemdikbud",
                        handle: "@kemdikbud",
                        category: "Pendidikan",
                        sharedAccount: true,
                        isRanked: true,
                        performanceIssue: false,
                        dataQualityIssue: false,
                        detailNote: null,
                        oldFollowers: 1000,
                        newFollowers: 1120,
                        followersPct: 12,
                        oldPosts: 10,
                        newPosts: 14,
                        postsPct: 40,
                        oldLikes: null,
                        newLikes: null,
                        likesPct: null,
                    },
                ],
            },
        ],
    });

    assert.match(html, /Executive Summary/);
    assert.match(html, /Q1 2026/);
    assert.match(html, /Quarter-End Coverage/);
    assert.match(html, /current category membership/);
    assert.match(html, /Shared/);
    assert.match(html, /Instagram/);
    assert.match(html, /Kemdikbud/);
});
