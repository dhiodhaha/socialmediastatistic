import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetMocks } from "@/test/utils";
import { deriveQuarterlyOptions, getQuarterlyStatus } from "./report.actions";

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
});
