import { describe, expect, it } from "vitest";
import { resolveMonthlyReportingAnchors } from "./monthly-reporting";

describe("monthly reporting anchors", () => {
    it("prefers a manual assignment over inferred jobs in the same reporting month", () => {
        const anchors = resolveMonthlyReportingAnchors([
            {
                id: "job-apr-auto",
                createdAt: new Date("2026-04-01T00:00:00.000Z"),
                completedAt: new Date("2026-04-01T00:00:00.000Z"),
                totalAccounts: 12,
            },
            {
                id: "job-apr-manual-mar",
                createdAt: new Date("2026-04-02T00:00:00.000Z"),
                completedAt: new Date("2026-04-02T00:00:00.000Z"),
                reportingYear: 2026,
                reportingMonth: 3,
                totalAccounts: 12,
            },
            {
                id: "job-mar-auto",
                createdAt: new Date("2026-03-29T00:00:00.000Z"),
                completedAt: new Date("2026-03-29T00:00:00.000Z"),
                totalAccounts: 12,
            },
        ]);

        expect(anchors.map((anchor) => anchor.id)).toEqual(["job-apr-auto", "job-apr-manual-mar"]);
        expect(anchors[1]).toMatchObject({
            label: "March 2026",
            source: "manual",
            sourceLabel: "Manual reporting month",
        });
    });

    it("keeps the latest inferred job when no manual assignment exists", () => {
        const anchors = resolveMonthlyReportingAnchors([
            {
                id: "job-mar-old",
                createdAt: new Date("2026-03-15T00:00:00.000Z"),
                completedAt: new Date("2026-03-15T00:00:00.000Z"),
            },
            {
                id: "job-mar-new",
                createdAt: new Date("2026-03-31T00:00:00.000Z"),
                completedAt: new Date("2026-03-31T00:00:00.000Z"),
            },
        ]);

        expect(anchors).toHaveLength(1);
        expect(anchors[0]).toMatchObject({
            id: "job-mar-new",
            label: "March 2026",
            source: "inferred",
        });
    });
});
