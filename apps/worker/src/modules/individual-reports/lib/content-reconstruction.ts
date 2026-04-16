export interface ReconstructedContentItem {
    id: string;
    url?: string | null;
    publishedAt: Date;
    textExcerpt?: string | null;
    thumbnailUrl?: string | null;
    mediaType?: "video" | "image" | "carousel" | "reel" | "tweet" | "unknown";
    metrics: {
        likes?: number | null;
        comments?: number | null;
        views?: number | null;
        shares?: number | null;
    };
}

export type ReconstructionCoverageStatus =
    | "complete-listing-coverage"
    | "partial-listing-coverage"
    | "empty";

export type EnrichmentSelectionReason = "month-representative" | "top-engagement";

export interface ReconstructionCoverageInput {
    year: number;
    quarter: number;
    listingPagesFetched: number;
    reachedQuarterStart: boolean;
    items: ReconstructedContentItem[];
}

export interface EnrichmentSelectionInput {
    items: ReconstructedContentItem[];
    maxItems: number;
    minimumPerMonth: number;
}

export interface ContentLevelPlanInput {
    listingPageLimit: number;
    detailedContentLimit: number;
}

export function filterQuarterContent(
    items: ReconstructedContentItem[],
    year: number,
    quarter: number,
) {
    const { start, end } = quarterBounds(year, quarter);

    return [...items]
        .filter((item) => item.publishedAt >= start && item.publishedAt <= end)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export function calculateReconstructionCoverage(input: ReconstructionCoverageInput) {
    const quarterItems = filterQuarterContent(input.items, input.year, input.quarter);
    const months = quarterMonths(input.year, input.quarter).map((monthStart) => {
        const key = monthKey(monthStart);
        const count = quarterItems.filter((item) => monthKey(item.publishedAt) === key).length;

        return {
            key,
            label: monthStart.toLocaleString("en-US", { month: "short", year: "numeric" }),
            contentCount: count,
        };
    });

    const status: ReconstructionCoverageStatus =
        quarterItems.length === 0
            ? "empty"
            : input.reachedQuarterStart
              ? "complete-listing-coverage"
              : "partial-listing-coverage";

    return {
        status,
        totalContentItems: quarterItems.length,
        listingPagesFetched: input.listingPagesFetched,
        reachedQuarterStart: input.reachedQuarterStart,
        months,
        note:
            status === "complete-listing-coverage"
                ? "Quarter reconstruction covers returned listing items through the quarter start."
                : "Quarter reconstruction is limited to returned listing items and may not cover the full quarter.",
    };
}

export function selectContentForEnrichment(input: EnrichmentSelectionInput) {
    if (input.maxItems <= 0 || input.items.length === 0) {
        return [];
    }

    const selected = new Map<
        string,
        ReconstructedContentItem & { selectionReason: EnrichmentSelectionReason }
    >();
    const monthGroups = groupByMonth(input.items);

    for (const group of monthGroups.values()) {
        const topForMonth = [...group]
            .sort((a, b) => engagementScore(b) - engagementScore(a))
            .slice(0, input.minimumPerMonth);

        for (const item of topForMonth) {
            if (selected.size >= input.maxItems) break;
            selected.set(item.id, { ...item, selectionReason: "month-representative" });
        }
    }

    const remainingByEngagement = [...input.items].sort(
        (a, b) => engagementScore(b) - engagementScore(a),
    );

    for (const item of remainingByEngagement) {
        if (selected.size >= input.maxItems) break;
        if (!selected.has(item.id)) {
            selected.set(item.id, { ...item, selectionReason: "top-engagement" });
        }
    }

    return Array.from(selected.values()).map((item) => ({
        ...item,
        engagementScore: engagementScore(item),
    }));
}

export function buildContentLevelPlan(input: ContentLevelPlanInput) {
    return {
        reconstruction: {
            mode: "listing-coverage",
            status: "requires-live-fetch",
            listingPageLimit: input.listingPageLimit,
            objective:
                "Fetch listing pages until the quarter start is reached or the operator-defined page limit is exhausted.",
        },
        enrichment: {
            mode: "selected-subset",
            status: "requires-live-fetch",
            maxItems: input.detailedContentLimit,
            selectionRule:
                "Top engagement with at least one representative item per covered month.",
            objective:
                "Use detail endpoints only for the selected subset, not every reconstructed content item by default.",
        },
        outputSections: [
            {
                id: "quarter-reconstruction-coverage",
                title: "Quarter Reconstruction Coverage",
                description:
                    "Shows how much of the quarter was reconstructed from listing endpoints before any detailed inspection.",
            },
            {
                id: "enriched-content-inspection",
                title: "Enriched Content Inspection",
                description:
                    "Shows the smaller automatically selected subset that received detail-level inspection.",
            },
        ],
        methodologyNotes: [
            "Reconstructed coverage and enriched inspection must be labeled separately in the exported PDF.",
            "Coverage is based on returned listing items, not platform-native analytics.",
            "Enrichment should stay selective by default to protect API credits.",
        ],
    };
}

export function buildContentLevelOutput({
    coverage,
    enrichedItems,
}: {
    coverage: ReturnType<typeof calculateReconstructionCoverage>;
    enrichedItems: ReturnType<typeof selectContentForEnrichment>;
}) {
    return {
        sections: [
            {
                id: "quarter-reconstruction-coverage",
                title: "Quarter Reconstruction Coverage",
                description:
                    "Lists the quarter content items returned by listing endpoints and the observed month coverage.",
                coverage,
            },
            {
                id: "enriched-content-inspection",
                title: "Enriched Content Inspection",
                description:
                    "Shows only the objectively selected subset chosen for deeper inspection, not every reconstructed item.",
                enrichedItems,
            },
        ],
        methodologyNotes: [
            "Listing endpoints are used for quarter coverage.",
            "Detail endpoints should be used only for the selected enriched subset by default.",
            "Selection is automatic: top engagement while preserving month representation.",
        ],
    };
}

export function engagementScore(item: ReconstructedContentItem) {
    return (
        (item.metrics.likes || 0) +
        (item.metrics.comments || 0) +
        (item.metrics.shares || 0) +
        (item.metrics.views || 0)
    );
}

function groupByMonth(items: ReconstructedContentItem[]) {
    const groups = new Map<string, ReconstructedContentItem[]>();

    for (const item of items) {
        const key = monthKey(item.publishedAt);
        const group = groups.get(key) || [];
        group.push(item);
        groups.set(key, group);
    }

    return new Map([...groups.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function quarterMonths(year: number, quarter: number) {
    const startMonth = (quarter - 1) * 3;
    return [0, 1, 2].map((offset) => new Date(year, startMonth + offset, 1));
}

function quarterBounds(year: number, quarter: number) {
    const startMonth = (quarter - 1) * 3;
    return {
        start: new Date(year, startMonth, 1, 0, 0, 0, 0),
        end: new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
    };
}

function monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
