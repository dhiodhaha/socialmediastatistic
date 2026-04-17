import { describe, expect, test } from "vitest";
import {
    computeInteractionGrowth,
    determineInteractionCoverage,
    normalizeQuarterInteractions,
} from "./public-interaction-growth";

describe("determineInteractionCoverage", () => {
    test("Twitter always returns limited platform coverage", () => {
        expect(determineInteractionCoverage("TWITTER", "complete-listing-coverage", false)).toBe(
            "limited-platform-coverage",
        );
    });

    test("Transforms standard listing coverage", () => {
        expect(determineInteractionCoverage("INSTAGRAM", "complete-listing-coverage", false)).toBe(
            "complete-public-coverage",
        );
        expect(determineInteractionCoverage("TIKTOK", "partial-listing-coverage", false)).toBe(
            "partial-public-coverage",
        );
        expect(determineInteractionCoverage("INSTAGRAM", "empty", false)).toBe("unavailable");
    });
});

describe("normalizeQuarterInteractions", () => {
    test("Normalizes missing quarterSummary correctly", () => {
        const result = normalizeQuarterInteractions({
            platform: "INSTAGRAM",
            coverage: { status: "empty" },
        });

        expect(result.publicInteractions).toBe(0);
        expect(result.publicReachInteractions).toBeNull();
        expect(result.coverageStatus).toBe("unavailable");
    });

    test("Normalizes full breakdown", () => {
        const result = normalizeQuarterInteractions({
            platform: "TIKTOK",
            coverage: { status: "complete-listing-coverage" },
            quarterSummary: {
                totalLikes: 10,
                totalComments: 5,
                totalViews: 100,
                totalShares: 2,
                totalSaves: 3,
                totalReposts: 0,
                totalQuotes: 0,
                totalBookmarks: 0,
                avgViews: 50,
            },
        });

        expect(result.publicInteractions).toBe(20); // 10+5+2+3
        expect(result.publicReachInteractions).toBe(120); // 20 + 100
        expect(result.coverageStatus).toBe("complete-public-coverage");
    });
});

describe("computeInteractionGrowth", () => {
    test("Computes Q-to-Q correctly", () => {
        const comparison = {
            platform: "INSTAGRAM",
            coverage: { status: "complete-listing-coverage" },
            quarterSummary: {
                totalLikes: 100,
                totalComments: 10,
                avgViews: null, // instagram may not have views on old posts
            },
        } as const;

        const current = {
            platform: "INSTAGRAM",
            coverage: { status: "complete-listing-coverage" },
            quarterSummary: {
                totalLikes: 150,
                totalComments: 15,
                avgViews: null,
            },
        } as const;

        const result = computeInteractionGrowth(current, comparison, "INSTAGRAM");

        expect(result.absoluteDelta).toBe(55); // 165 - 110
        expect(result.percentDelta).toBe(50); // 50% increase
        expect(result.reason).toBeNull();
        expect(result.reachAbsoluteDelta).toBeNull();
    });

    test("Handles zero baseline", () => {
        const comparison = {
            platform: "TIKTOK",
            coverage: { status: "partial-listing-coverage" },
            quarterSummary: {
                totalLikes: 0,
                avgViews: null,
            },
        } as const;

        const current = {
            platform: "TIKTOK",
            coverage: { status: "complete-listing-coverage" },
            quarterSummary: {
                totalLikes: 50,
                avgViews: null,
            },
        } as const;

        const result = computeInteractionGrowth(current, comparison, "TIKTOK");

        expect(result.percentDelta).toBeNull();
        expect(result.absoluteDelta).toBe(50);
        expect(result.reason).toBe(
            "Kuartal pembanding memiliki 0 interaksi, persentase pertumbuhan tidak dapat dihitung.",
        );
    });

    test("Handles missing comparison", () => {
        const current = {
            platform: "TIKTOK",
            quarterSummary: { totalLikes: 50 },
        } as const;

        const result = computeInteractionGrowth(current, null, "TIKTOK");
        expect(result.reason).toBeNull();
        expect(result.absoluteDelta).toBeNull();
    });
});
