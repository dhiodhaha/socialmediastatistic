import { describe, expect, it } from "vitest";
import {
    buildContentLevelOutput,
    buildContentLevelPlan,
    calculateReconstructionCoverage,
    filterQuarterContent,
    type ReconstructedContentItem,
    selectContentForEnrichment,
} from "./content-reconstruction";

const items: ReconstructedContentItem[] = [
    {
        id: "jan-high",
        publishedAt: new Date("2026-01-10T10:00:00.000Z"),
        metrics: { likes: 100, comments: 10, views: 1000 },
    },
    {
        id: "jan-low",
        publishedAt: new Date("2026-01-11T10:00:00.000Z"),
        metrics: { likes: 5, comments: 1, views: 20 },
    },
    {
        id: "feb-high",
        publishedAt: new Date("2026-02-10T10:00:00.000Z"),
        metrics: { likes: 90, comments: 10, views: 900 },
    },
    {
        id: "mar-high",
        publishedAt: new Date("2026-03-10T10:00:00.000Z"),
        metrics: { likes: 80, comments: 10, views: 800 },
    },
    {
        id: "outside-quarter",
        publishedAt: new Date("2026-04-01T10:00:00.000Z"),
        metrics: { likes: 1000, comments: 100, views: 10_000 },
    },
];

describe("content reconstruction", () => {
    it("filters content to the selected quarter only", () => {
        expect(filterQuarterContent(items, 2026, 1).map((item) => item.id)).not.toContain(
            "outside-quarter",
        );
    });

    it("calculates quarter reconstruction coverage from listing items", () => {
        const coverage = calculateReconstructionCoverage({
            year: 2026,
            quarter: 1,
            listingPagesFetched: 2,
            reachedQuarterStart: true,
            items,
        });

        expect(coverage.status).toBe("complete-listing-coverage");
        expect(coverage.totalContentItems).toBe(4);
        expect(coverage.months.map((month) => month.contentCount)).toEqual([2, 1, 1]);
    });

    it("selects enriched content by top engagement with month representation", () => {
        const selected = selectContentForEnrichment({
            items: filterQuarterContent(items, 2026, 1),
            maxItems: 3,
            minimumPerMonth: 1,
        });

        expect(selected.map((item) => item.id)).toEqual(["jan-high", "feb-high", "mar-high"]);
        expect(selected.map((item) => item.selectionReason)).toEqual([
            "month-representative",
            "month-representative",
            "month-representative",
        ]);
    });

    it("fills remaining enrichment slots by objective engagement score", () => {
        const selected = selectContentForEnrichment({
            items: filterQuarterContent(items, 2026, 1),
            maxItems: 4,
            minimumPerMonth: 1,
        });

        expect(selected.map((item) => item.id)).toEqual([
            "jan-high",
            "feb-high",
            "mar-high",
            "jan-low",
        ]);
        expect(selected.at(-1)?.selectionReason).toBe("top-engagement");
    });

    it("shapes final content output with reconstruction separated from enrichment", () => {
        const coverage = calculateReconstructionCoverage({
            year: 2026,
            quarter: 1,
            listingPagesFetched: 2,
            reachedQuarterStart: false,
            items,
        });
        const enrichedItems = selectContentForEnrichment({
            items: filterQuarterContent(items, 2026, 1),
            maxItems: 2,
            minimumPerMonth: 1,
        });

        const output = buildContentLevelOutput({ coverage, enrichedItems });

        expect(output.sections[0]?.id).toBe("quarter-reconstruction-coverage");
        expect(output.sections[1]?.id).toBe("enriched-content-inspection");
        expect(output.methodologyNotes).toContainEqual(
            expect.stringContaining("Detail endpoints should be used only"),
        );
    });

    it("builds a future content-level plan that separates coverage from enrichment", () => {
        const plan = buildContentLevelPlan({
            listingPageLimit: 3,
            detailedContentLimit: 6,
        });

        expect(plan.reconstruction).toMatchObject({
            mode: "listing-coverage",
            listingPageLimit: 3,
        });
        expect(plan.enrichment).toMatchObject({
            mode: "selected-subset",
            maxItems: 6,
        });
        expect(plan.outputSections.map((section) => section.id)).toEqual([
            "quarter-reconstruction-coverage",
            "enriched-content-inspection",
        ]);
    });
});
