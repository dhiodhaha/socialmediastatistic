import type { Platform } from "@repo/database";
import type { ManualQuarterSnapshotRequest } from "@/modules/individual-reports/lib/individual-report-types";
import {
    type QuarterSelection,
    quarterBounds,
} from "@/modules/individual-reports/lib/quarter-stat-comparison";

export function validateQuarterComparisonInput(input: {
    accountId: string;
    current: QuarterSelection;
    comparison: QuarterSelection;
    platforms: Platform[];
}) {
    if (!input.accountId) return "Account is required.";
    if (!isValidQuarter(input.current.quarter) || !isValidQuarter(input.comparison.quarter)) {
        return "Quarter must be between 1 and 4.";
    }
    if (!isValidYear(input.current.year) || !isValidYear(input.comparison.year)) {
        return "Year is outside the supported range.";
    }
    if (input.platforms.length === 0) return "Select at least one platform.";
    return null;
}

export function validateManualSnapshotInput(input: ManualQuarterSnapshotRequest) {
    const baseError = validateQuarterComparisonInput({
        accountId: input.accountId,
        current: { year: input.year, quarter: input.quarter },
        comparison: { year: input.year, quarter: input.quarter },
        platforms: [input.platform],
    });
    if (baseError) return baseError;
    if (!Number.isInteger(input.followers) || input.followers < 0) {
        return "Followers must be a non-negative whole number.";
    }
    if (input.posts != null && (!Number.isInteger(input.posts) || input.posts < 0)) {
        return "Posts must be a non-negative whole number.";
    }
    if (input.likes != null && (!Number.isInteger(input.likes) || input.likes < 0)) {
        return "Likes must be a non-negative whole number.";
    }
    if (input.engagement != null && (!Number.isFinite(input.engagement) || input.engagement < 0)) {
        return "Engagement must be a non-negative number.";
    }

    const scrapedAt = new Date(input.scrapedAt);
    if (Number.isNaN(scrapedAt.getTime())) return "Snapshot date is invalid.";
    const bounds = quarterBounds({ year: input.year, quarter: input.quarter });
    if (scrapedAt < bounds.start || scrapedAt > bounds.end) {
        return "Snapshot date must be inside the selected quarter.";
    }

    return null;
}

function isValidQuarter(quarter: number) {
    return Number.isInteger(quarter) && quarter >= 1 && quarter <= 4;
}

function isValidYear(year: number) {
    return Number.isInteger(year) && year >= 2020 && year <= 2100;
}
