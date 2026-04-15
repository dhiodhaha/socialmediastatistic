import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetMocks } from "@/test/utils";
import { assignReportingMonth } from "./history.actions";

const { revalidatePathMock } = vi.hoisted(() => ({
    revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: revalidatePathMock,
}));

vi.mock("@/shared/lib/auth", () => ({
    auth: vi.fn(async () => ({ user: { id: "user-1" } })),
}));

describe("history actions", () => {
    beforeEach(() => {
        resetMocks();
        revalidatePathMock.mockReset();
        prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    });

    it("assigns a reporting month and clears an existing conflicting anchor", async () => {
        prismaMock.scrapingJob.findUnique.mockResolvedValue({
            id: "job-apr",
            status: "COMPLETED",
            createdAt: new Date("2026-04-02T10:00:00.000Z"),
            completedAt: new Date("2026-04-02T10:00:00.000Z"),
            reportingYear: null,
            reportingMonth: null,
        } as never);

        const result = await assignReportingMonth({
            jobId: "job-apr",
            reportingYear: 2026,
            reportingMonth: 3,
            reason: "Month-end scrape completed on April 2",
        });

        expect(result).toEqual({ success: true });
        expect(prismaMock.scrapingJob.updateMany).toHaveBeenCalledWith({
            where: {
                id: { not: "job-apr" },
                reportingYear: 2026,
                reportingMonth: 3,
            },
            data: {
                reportingYear: null,
                reportingMonth: null,
                reportingReason: null,
                reportingAssignedAt: null,
            },
        });
        expect(prismaMock.scrapingJob.update).toHaveBeenCalledWith({
            where: { id: "job-apr" },
            data: {
                reportingYear: 2026,
                reportingMonth: 3,
                reportingReason: "Month-end scrape completed on April 2",
                reportingAssignedAt: expect.any(Date),
            },
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/history");
        expect(revalidatePathMock).toHaveBeenCalledWith("/reports");
    });

    it("rejects assignments for incomplete jobs", async () => {
        prismaMock.scrapingJob.findUnique.mockResolvedValue({
            id: "job-running",
            status: "RUNNING",
            createdAt: new Date("2026-04-02T10:00:00.000Z"),
            completedAt: null,
            reportingYear: null,
            reportingMonth: null,
        } as never);

        const result = await assignReportingMonth({
            jobId: "job-running",
            reportingYear: 2026,
            reportingMonth: 4,
            reason: "Still running",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Only completed jobs");
        expect(prismaMock.scrapingJob.update).not.toHaveBeenCalled();
    });

    it("rejects assignments outside the allowed window", async () => {
        prismaMock.scrapingJob.findUnique.mockResolvedValue({
            id: "job-apr",
            status: "COMPLETED",
            createdAt: new Date("2026-04-02T10:00:00.000Z"),
            completedAt: new Date("2026-04-02T10:00:00.000Z"),
            reportingYear: null,
            reportingMonth: null,
        } as never);

        const result = await assignReportingMonth({
            jobId: "job-apr",
            reportingYear: 2026,
            reportingMonth: 2,
            reason: "Too far back",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("same month or the previous month");
        expect(prismaMock.scrapingJob.update).not.toHaveBeenCalled();
    });
});
