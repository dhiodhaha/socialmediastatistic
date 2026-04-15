import { describe, expect, it } from "vitest";
import { buildQuarterlyPlatformPreview } from "./quarterly-platform-preview";
import type { QuarterlyStatus } from "./quarterly-reporting";

const baseStatus: QuarterlyStatus = {
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
        key: "2026-01",
        label: "Jan 2026",
        hasAnchor: true,
        anchorJobId: "jan",
        source: "inferred",
        sourceLabel: "Auto from completion month",
    },
    availability: {
        isAvailable: true,
        reason: "Quarter available for review",
    },
    coverage: {
        quarterEndCaptured: 2,
        fullQuarterCaptured: 1,
        totalAccounts: 3,
    },
    warnings: [],
};

describe("buildQuarterlyPlatformPreview", () => {
    it("excludes accounts missing quarter-end data from rankings and flags them as data quality issues", () => {
        const preview = buildQuarterlyPlatformPreview({
            status: baseStatus,
            accounts: [
                {
                    id: "acc-1",
                    username: "Kemdikbud",
                    instagram: "kemdikbud",
                    tiktok: null,
                    twitter: null,
                    categoryNames: ["Pendidikan"],
                    snapshots: [
                        {
                            platform: "INSTAGRAM",
                            followers: 100,
                            posts: 10,
                            likes: null,
                            scrapedAt: new Date("2026-01-31T10:00:00.000Z"),
                        },
                        {
                            platform: "INSTAGRAM",
                            followers: 120,
                            posts: 12,
                            likes: null,
                            scrapedAt: new Date("2026-01-31T10:00:00.000Z"),
                        },
                    ],
                },
            ],
        });

        expect(preview.rows[0]?.rankingEligible).toBe(false);
        expect(preview.rows[0]?.sharedAccount).toBe(false);
        expect(preview.rows[0]?.dataQualityIssue).toBe(true);
        expect(preview.summaries[0]?.rankingEligibleCount).toBe(0);
    });

    it("marks negative within-quarter follower growth as a performance issue", () => {
        const preview = buildQuarterlyPlatformPreview({
            status: baseStatus,
            accounts: [
                {
                    id: "acc-2",
                    username: "Kominfo",
                    instagram: "kominfo",
                    tiktok: null,
                    twitter: null,
                    categoryNames: ["Komunikasi"],
                    snapshots: [
                        {
                            platform: "INSTAGRAM",
                            followers: 200,
                            posts: 20,
                            likes: null,
                            scrapedAt: new Date("2026-01-31T10:00:00.000Z"),
                        },
                        {
                            platform: "INSTAGRAM",
                            followers: 190,
                            posts: 24,
                            likes: null,
                            scrapedAt: new Date("2026-03-31T10:00:00.000Z"),
                        },
                    ],
                },
            ],
        });

        expect(preview.rows[0]?.rankingEligible).toBe(true);
        expect(preview.rows[0]?.performanceIssue).toBe(true);
        expect(preview.rows[0]?.delta.followersVal).toBe(-10);
        expect(preview.summaries[0]?.topDecliners[0]?.accountId).toBe("acc-2");
    });

    it("uses reporting anchor job ids when assigned snapshots were scraped in another calendar month", () => {
        const preview = buildQuarterlyPlatformPreview({
            status: baseStatus,
            accounts: [
                {
                    id: "acc-anchor",
                    username: "Kemenkes",
                    instagram: "kemenkes",
                    tiktok: null,
                    twitter: null,
                    categoryNames: ["Kesehatan"],
                    snapshots: [
                        {
                            platform: "INSTAGRAM",
                            followers: 100,
                            posts: 10,
                            likes: null,
                            scrapedAt: new Date("2026-01-02T10:00:00.000Z"),
                            jobId: "jan",
                        },
                        {
                            platform: "INSTAGRAM",
                            followers: 150,
                            posts: 17,
                            likes: null,
                            scrapedAt: new Date("2026-04-02T10:00:00.000Z"),
                            jobId: "mar",
                        },
                    ],
                },
            ],
        });

        expect(preview.rows[0]).toMatchObject({
            rankingEligible: true,
            hasQuarterEndData: true,
            oldStats: { followers: 100, posts: 10 },
            newStats: { followers: 150, posts: 17 },
            delta: {
                followersVal: 50,
                followersPct: 50,
                postsVal: 7,
                postsPct: 70,
            },
        });
        expect(preview.summaries[0]?.netFollowerGrowth).toBe(50);
    });

    it("keeps accounts with missing internal months eligible when anchor months exist and adds a note", () => {
        const preview = buildQuarterlyPlatformPreview({
            status: baseStatus,
            accounts: [
                {
                    id: "acc-3",
                    username: "Setneg",
                    instagram: "setneg",
                    tiktok: null,
                    twitter: null,
                    categoryNames: ["Sekretariat"],
                    snapshots: [
                        {
                            platform: "INSTAGRAM",
                            followers: 100,
                            posts: 10,
                            likes: null,
                            scrapedAt: new Date("2026-01-31T10:00:00.000Z"),
                        },
                        {
                            platform: "INSTAGRAM",
                            followers: 110,
                            posts: 11,
                            likes: null,
                            scrapedAt: new Date("2026-01-31T10:00:00.000Z"),
                        },
                        {
                            platform: "INSTAGRAM",
                            followers: 140,
                            posts: 16,
                            likes: null,
                            scrapedAt: new Date("2026-03-31T10:00:00.000Z"),
                        },
                    ],
                },
            ],
        });

        expect(preview.rows[0]?.rankingEligible).toBe(true);
        expect(preview.rows[0]?.dataQualityIssue).toBe(true);
        expect(preview.rows[0]?.detailNote).toContain(
            "Missing supporting month snapshots: Feb 2026.",
        );
        expect(preview.summaries[0]?.rankingEligibleCount).toBe(1);
        expect(preview.summaries[0]?.topGainers[0]?.accountId).toBe("acc-3");
    });

    it("marks shared accounts and emits a methodology note for category-filtered views", () => {
        const preview = buildQuarterlyPlatformPreview({
            status: baseStatus,
            categoryFilterLabel: "Komunikasi",
            accounts: [
                {
                    id: "acc-4",
                    username: "Kemlu",
                    instagram: "kemlu",
                    tiktok: null,
                    twitter: null,
                    categoryNames: ["Komunikasi", "Diplomasi"],
                    snapshots: [
                        {
                            platform: "INSTAGRAM",
                            followers: 100,
                            posts: 10,
                            likes: null,
                            scrapedAt: new Date("2026-01-31T10:00:00.000Z"),
                        },
                        {
                            platform: "INSTAGRAM",
                            followers: 130,
                            posts: 13,
                            likes: null,
                            scrapedAt: new Date("2026-03-31T10:00:00.000Z"),
                        },
                    ],
                },
            ],
        });

        expect(preview.rows[0]?.sharedAccount).toBe(true);
        expect(preview.rows[0]?.category).toContain("Diplomasi");
        expect(preview.methodologyNote).toContain("Komunikasi");
        expect(preview.summaries[0]?.totalAccounts).toBe(1);
    });
});
