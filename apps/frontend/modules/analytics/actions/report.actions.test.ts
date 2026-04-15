import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveQuarterlyOptions } from "@/modules/analytics/lib/quarterly-reporting";
import { prismaMock, resetMocks } from "@/test/utils";
import { getQuarterlyStatus, getScrapingJobsForReport } from "./report.actions";

vi.mock("@/shared/lib/auth", () => ({
    auth: vi.fn(async () => ({ user: { id: "user-1" } })),
}));

describe("quarterly reporting actions", () => {
    beforeEach(() => {
        resetMocks();
    });

    it("derives disabled quarter options when quarter-end is missing", () => {
        const options = deriveQuarterlyOptions([
            {
                id: "jan-job",
                createdAt: new Date("2026-01-31T10:00:00.000Z"),
                completedAt: new Date("2026-01-31T10:00:00.000Z"),
            },
            {
                id: "feb-job",
                createdAt: new Date("2026-02-28T10:00:00.000Z"),
                completedAt: new Date("2026-02-28T10:00:00.000Z"),
            },
        ]);

        const q1 = options.find((option) => option.id === "2026-Q1");
        expect(q1?.disabled).toBe(true);
        expect(q1?.desc).toContain("missing quarter-end snapshot");
    });

    it("derives quarter availability from manually assigned reporting months", () => {
        const options = deriveQuarterlyOptions([
            {
                id: "jan-job",
                createdAt: new Date("2026-01-31T10:00:00.000Z"),
                completedAt: new Date("2026-01-31T10:00:00.000Z"),
            },
            {
                id: "feb-job",
                createdAt: new Date("2026-02-28T10:00:00.000Z"),
                completedAt: new Date("2026-02-28T10:00:00.000Z"),
            },
            {
                id: "apr-job-assigned-mar",
                createdAt: new Date("2026-04-02T10:00:00.000Z"),
                completedAt: new Date("2026-04-02T10:00:00.000Z"),
                reportingYear: 2026,
                reportingMonth: 3,
            },
        ]);

        const q1 = options.find((option) => option.id === "2026-Q1");

        expect(q1?.disabled).toBe(false);
        expect(q1?.desc).toBe("Jan 2026 - Mar 2026");
    });

    it("returns warnings for missing internal months and missing baseline", async () => {
        prismaMock.scrapingJob.findMany.mockResolvedValue([
            {
                id: "mar-job",
                createdAt: new Date("2026-03-31T10:00:00.000Z"),
                completedAt: new Date("2026-03-31T10:00:00.000Z"),
            },
            {
                id: "jan-job",
                createdAt: new Date("2026-01-31T10:00:00.000Z"),
                completedAt: new Date("2026-01-31T10:00:00.000Z"),
            },
        ] as never);

        prismaMock.account.findMany.mockResolvedValue([
            {
                id: "acc-1",
                instagram: "kemdikbud",
                tiktok: null,
                twitter: null,
                snapshots: [
                    {
                        platform: "INSTAGRAM",
                        scrapedAt: new Date("2026-03-31T10:00:00.000Z"),
                    },
                    {
                        platform: "INSTAGRAM",
                        scrapedAt: new Date("2026-01-31T10:00:00.000Z"),
                    },
                ],
            },
        ] as never);

        const result = await getQuarterlyStatus(2026, 1);

        expect(result.availability.isAvailable).toBe(true);
        expect(result.coverage.quarterEndCaptured).toBe(1);
        expect(result.coverage.fullQuarterCaptured).toBe(0);
        expect(result.warnings).toEqual(
            expect.arrayContaining([
                expect.stringContaining("Missing supporting month snapshots: Feb 2026"),
                expect.stringContaining("Previous quarter baseline unavailable"),
            ]),
        );
    });

    it("marks a quarter unavailable when the quarter-end anchor is missing", async () => {
        prismaMock.scrapingJob.findMany.mockResolvedValue([
            {
                id: "jan-job",
                createdAt: new Date("2026-01-31T10:00:00.000Z"),
                completedAt: new Date("2026-01-31T10:00:00.000Z"),
            },
        ] as never);

        prismaMock.account.findMany.mockResolvedValue([] as never);

        const result = await getQuarterlyStatus(2026, 1);

        expect(result.availability.isAvailable).toBe(false);
        expect(result.availability.reason).toContain("missing quarter-end snapshot");
    });

    it("resolves monthly job options from assigned reporting months first", async () => {
        prismaMock.scrapingJob.findMany.mockResolvedValue([
            {
                id: "job-apr-auto",
                createdAt: new Date("2026-04-01T10:00:00.000Z"),
                completedAt: new Date("2026-04-01T10:00:00.000Z"),
                totalAccounts: 10,
                reportingYear: null,
                reportingMonth: null,
                status: "COMPLETED",
            },
            {
                id: "job-apr-manual-mar",
                createdAt: new Date("2026-04-02T10:00:00.000Z"),
                completedAt: new Date("2026-04-02T10:00:00.000Z"),
                totalAccounts: 10,
                reportingYear: 2026,
                reportingMonth: 3,
                status: "COMPLETED",
            },
            {
                id: "job-mar-auto",
                createdAt: new Date("2026-03-31T10:00:00.000Z"),
                completedAt: new Date("2026-03-31T10:00:00.000Z"),
                totalAccounts: 10,
                reportingYear: null,
                reportingMonth: null,
                status: "COMPLETED",
            },
        ] as never);

        const jobs = await getScrapingJobsForReport();

        expect(jobs).toEqual([
            expect.objectContaining({
                id: "job-apr-auto",
                label: "April 2026",
                source: "inferred",
            }),
            expect.objectContaining({
                id: "job-apr-manual-mar",
                label: "March 2026",
                source: "manual",
            }),
        ]);
    });
});
