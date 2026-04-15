import { describe, expect, it } from "vitest";
import {
    baselineMonthKey,
    buildIndividualQuarterlySnapshotSummary,
    estimateIndividualReportCredits,
    quarterEndMonthKey,
    validateIndividualReportRequest,
} from "./individual-quarterly-report";

describe("individual quarterly report foundation", () => {
    it("enforces one valid account, platform, year, and quarter request", () => {
        expect(
            validateIndividualReportRequest({
                accountId: "acc-1",
                platform: "INSTAGRAM",
                year: 2026,
                quarter: 1,
            }),
        ).toEqual({ valid: true });

        expect(
            validateIndividualReportRequest({
                accountId: "",
                platform: "INSTAGRAM",
                year: 2026,
                quarter: 1,
            }),
        ).toMatchObject({ valid: false });

        expect(
            validateIndividualReportRequest({
                accountId: "acc-1",
                platform: "INSTAGRAM",
                year: 2026,
                quarter: 5,
            }),
        ).toMatchObject({ valid: false });
    });

    it("estimates ScrapeCreators request credits before execution", () => {
        expect(
            estimateIndividualReportCredits({
                listingPageLimit: 4,
                detailedContentLimit: 10,
            }),
        ).toEqual({
            totalCredits: 15,
            breakdown: {
                profileCredits: 1,
                listingCredits: 4,
                detailCredits: 10,
            },
            note: expect.stringContaining("one ScrapeCreators credit per request"),
        });
    });

    it("builds the objective report skeleton from official snapshot anchors first", () => {
        const summary = buildIndividualQuarterlySnapshotSummary({
            accountName: "Kementerian Pendidikan",
            handle: "kemdikbud",
            platform: "INSTAGRAM",
            year: 2026,
            quarter: 1,
            baselineSnapshot: {
                followers: 100,
                posts: 10,
                likes: null,
                scrapedAt: new Date("2025-12-31T10:00:00.000Z"),
            },
            quarterEndSnapshot: {
                followers: 130,
                posts: 13,
                likes: null,
                scrapedAt: new Date("2026-03-31T10:00:00.000Z"),
            },
        });

        expect(summary.sections[0]).toMatchObject({
            id: "official-snapshot-summary",
            status: "ready",
        });
        expect(summary.sections[1]).toMatchObject({
            id: "content-reconstruction",
            status: "future-live-fetch",
        });
        expect(summary.officialSummary.followerGrowth).toMatchObject({
            followersVal: 30,
            followersPct: 30,
        });
        expect(summary.methodologyNotes).toContainEqual(
            expect.stringContaining("No live ScrapeCreators request"),
        );
    });

    it("derives quarter-end and baseline month keys", () => {
        expect(quarterEndMonthKey(2026, 1)).toBe("2026-03");
        expect(baselineMonthKey(2026, 1)).toBe("2025-12");
    });
});
