import { describe, expect, it } from "vitest";
import {
    buildIndividualQuarterComparison,
    previousQuarter,
    quarterBounds,
} from "./quarter-stat-comparison";

describe("quarter stat comparison", () => {
    it("uses the previous quarter across year boundaries", () => {
        expect(previousQuarter(2026, 1)).toEqual({ year: 2025, quarter: 4 });
        expect(previousQuarter(2026, 3)).toEqual({ year: 2026, quarter: 2 });
    });

    it("selects scraped snapshots before manual snapshots for the same quarter", () => {
        const comparison = buildIndividualQuarterComparison({
            account: { id: "acc-1", username: "Kementerian Pendidikan" },
            current: { year: 2026, quarter: 1 },
            comparison: { year: 2025, quarter: 4 },
            platforms: ["INSTAGRAM"],
            currentSnapshots: [
                {
                    platform: "INSTAGRAM",
                    followers: 140,
                    posts: 20,
                    likes: 300,
                    engagement: null,
                    scrapedAt: new Date("2026-03-31T12:00:00.000Z"),
                    source: "MANUAL",
                    sourceNote: "Manual override draft",
                },
                {
                    platform: "INSTAGRAM",
                    followers: 130,
                    posts: 18,
                    likes: 250,
                    engagement: null,
                    scrapedAt: new Date("2026-03-20T12:00:00.000Z"),
                    source: "SCRAPED",
                    sourceNote: null,
                },
            ],
            comparisonSnapshots: [
                {
                    platform: "INSTAGRAM",
                    followers: 100,
                    posts: 10,
                    likes: 200,
                    engagement: null,
                    scrapedAt: new Date("2025-12-31T12:00:00.000Z"),
                    source: "MANUAL",
                    sourceNote: "Laporan internal",
                },
            ],
        });

        const instagram = comparison.platforms[0];
        expect(instagram.current.snapshot?.source).toBe("SCRAPED");
        expect(instagram.metrics[0]).toMatchObject({
            label: "Pengikut",
            currentValue: 130,
            comparisonValue: 100,
            absoluteDelta: 30,
            percentDelta: 30,
            reason: null,
        });
    });

    it("does not fake percentages when baseline is zero or missing", () => {
        const comparison = buildIndividualQuarterComparison({
            account: { id: "acc-1", username: "Kementerian Pendidikan" },
            current: { year: 2026, quarter: 1 },
            comparison: { year: 2025, quarter: 4 },
            platforms: ["TIKTOK"],
            currentSnapshots: [
                {
                    platform: "TIKTOK",
                    followers: 10,
                    posts: null,
                    likes: null,
                    engagement: null,
                    scrapedAt: new Date("2026-03-31T12:00:00.000Z"),
                    source: "SCRAPED",
                    sourceNote: null,
                },
            ],
            comparisonSnapshots: [
                {
                    platform: "TIKTOK",
                    followers: 0,
                    posts: null,
                    likes: null,
                    engagement: null,
                    scrapedAt: new Date("2025-12-31T12:00:00.000Z"),
                    source: "MANUAL",
                    sourceNote: null,
                },
            ],
        });

        const tiktok = comparison.platforms[0];
        expect(tiktok.metrics[0]).toMatchObject({
            absoluteDelta: 10,
            percentDelta: null,
            reason: "Baseline 0, persentase tidak dihitung.",
        });
        expect(tiktok.metrics[2]).toMatchObject({
            label: "Interaksi",
            reason: "Metrik interaksi belum tersimpan untuk platform ini.",
        });
    });

    it("builds inclusive quarter bounds", () => {
        const bounds = quarterBounds({ year: 2026, quarter: 1 });
        expect(bounds.start.getFullYear()).toBe(2026);
        expect(bounds.start.getMonth()).toBe(0);
        expect(bounds.start.getDate()).toBe(1);
        expect(bounds.end.getFullYear()).toBe(2026);
        expect(bounds.end.getMonth()).toBe(2);
        expect(bounds.end.getDate()).toBe(31);
        expect(bounds.end.getHours()).toBe(23);
    });
});
