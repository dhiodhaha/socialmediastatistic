import assert from "node:assert/strict";
import test from "node:test";
import { generateIndividualQuarterlyReportHtml } from "./individual-quarterly-template";

test("generateIndividualQuarterlyReportHtml sorts selected content by public interactions", () => {
    const html = generateIndividualQuarterlyReportHtml({
        generatedAt: "17/04/2026 07:00",
        data: {
            account: { id: "account-1", username: "Kementerian Pendidikan" },
            request: {
                platforms: ["INSTAGRAM"],
                year: 2026,
                quarter: 1,
                listingPageLimit: 150,
                enrichedContentLimit: 6,
            },
            estimatedCredits: { totalCredits: 150 },
            actualCreditsUsed: 10,
            methodologyNotes: [],
            results: [
                {
                    platform: "INSTAGRAM",
                    handle: "kemdikdasmen",
                    success: true,
                    creditsUsed: 10,
                    rawItemsFetched: 2,
                    fetchedDateRange: { earliest: "2026-01-01", latest: "2026-03-31" },
                    diagnostics: [],
                    profileStats: {
                        followers: 1000,
                        following: null,
                        totalPosts: 20,
                        isVerified: true,
                        displayName: "Kementerian Pendidikan",
                    },
                    quarterSummary: {
                        quarterItemCount: 2,
                        totalLikes: 110,
                        totalComments: 20,
                        totalViews: 1000,
                        avgLikes: 55,
                        avgComments: 10,
                        avgViews: 500,
                        avgEngagementRate: null,
                        topPost: null,
                        contentTypeBreakdown: { photo: 2 },
                    },
                    coverage: {
                        status: "complete",
                        totalContentItems: 2,
                        listingPagesFetched: 1,
                        reachedQuarterStart: true,
                        months: [{ key: "2026-01", label: "Jan 2026", contentCount: 2 }],
                        note: "Complete coverage",
                    },
                    enrichedItems: [
                        {
                            id: "low",
                            publishedAt: "2026-01-01",
                            textExcerpt: "Low interaction content",
                            mediaType: "photo",
                            metrics: { likes: 10, comments: 5, views: 100 },
                        },
                        {
                            id: "high",
                            publishedAt: "2026-01-02",
                            textExcerpt: "High interaction content",
                            mediaType: "photo",
                            metrics: { likes: 100, comments: 15, views: 100 },
                        },
                    ],
                },
            ],
        },
    });

    assert.ok(html.indexOf("High interaction content") < html.indexOf("Low interaction content"));
});
