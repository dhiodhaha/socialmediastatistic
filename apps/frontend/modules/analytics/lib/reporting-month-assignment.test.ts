import { describe, expect, it } from "vitest";
import {
    describeReportingAssignment,
    getAssignableReportingPeriods,
    validateReportingMonthAssignment,
} from "./reporting-month-assignment";

describe("reporting month assignment helpers", () => {
    it("offers same-month and previous-month assignment options", () => {
        const periods = getAssignableReportingPeriods(new Date("2026-04-02T10:00:00.000Z"));

        expect(periods).toEqual([
            {
                year: 2026,
                month: 4,
                key: "2026-04",
                label: "April 2026",
            },
            {
                year: 2026,
                month: 3,
                key: "2026-03",
                label: "March 2026",
            },
        ]);
    });

    it("rejects assignments outside the allowed window", () => {
        const result = validateReportingMonthAssignment(
            {
                status: "COMPLETED",
                createdAt: new Date("2026-04-02T10:00:00.000Z"),
                completedAt: new Date("2026-04-02T10:00:00.000Z"),
            },
            2026,
            2,
            "Trying to backdate too far",
        );

        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.error).toContain("same month or the previous month");
        }
    });

    it("rejects incomplete jobs", () => {
        const result = validateReportingMonthAssignment(
            {
                status: "RUNNING",
                createdAt: new Date("2026-04-02T10:00:00.000Z"),
                completedAt: null,
            },
            2026,
            4,
            "Still in progress",
        );

        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.error).toContain("Only completed jobs");
        }
    });

    it("describes manual and inferred reporting sources", () => {
        expect(
            describeReportingAssignment({
                status: "COMPLETED",
                createdAt: new Date("2026-04-02T10:00:00.000Z"),
                completedAt: new Date("2026-04-02T10:00:00.000Z"),
                reportingYear: 2026,
                reportingMonth: 3,
            }),
        ).toEqual({
            label: "March 2026",
            source: "manual",
        });

        expect(
            describeReportingAssignment({
                status: "COMPLETED",
                createdAt: new Date("2026-04-02T10:00:00.000Z"),
                completedAt: new Date("2026-04-02T10:00:00.000Z"),
            }),
        ).toEqual({
            label: "April 2026",
            source: "inferred",
        });
    });
});
