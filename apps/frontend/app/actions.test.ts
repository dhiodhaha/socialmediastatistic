// triggerScrape is dynamically imported in tests below
import type { Account, ScrapingJob } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bulkCreateAccounts } from "@/modules/accounts/actions/account.actions";
import { getAllScrapingHistory } from "@/modules/analytics/actions/history.actions";
import { prismaMock, resetMocks } from "../test/utils";

// We need to mock "revalidatePath" since it's a Next.js server utility
// that doesn't run in the test environment (unless we mock next/cache).
vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

describe("Server Actions", () => {
    beforeEach(() => {
        resetMocks();
    });

    describe("bulkCreateAccounts", () => {
        it("should successfully create accounts and ignore duplicates", async () => {
            const inputAccounts = [
                { username: "validUser", instagram: "foo", isActive: true, categoryIds: [] },
                { username: "duplicateUser", tiktok: "bar", isActive: true, categoryIds: [] },
            ];

            // Mock findUnique to simulate 'duplicateUser' exists
            prismaMock.account.findUnique
                .mockResolvedValueOnce(null) // for validUser (not found)
                .mockResolvedValueOnce({
                    id: "existing-id",
                    username: "duplicateUser",
                } as unknown as Account); // for duplicateUser

            // Mock create for the valid user
            prismaMock.account.create.mockResolvedValue({
                id: "new-id",
                username: "validUser",
                instagram: "foo",
            } as unknown as Account);

            const result = await bulkCreateAccounts(inputAccounts);

            expect(result.success).toBe(true);
            expect(result.count).toBe(1); // Only 1 created
            expect(result.errors).toHaveLength(1); // 1 error for duplicate
            expect(result.errors?.[0]).toContain("Account with this name already exists");

            // Verify create was called only once
            expect(prismaMock.account.create).toHaveBeenCalledTimes(1);
            expect(prismaMock.account.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ username: "validUser" }),
                }),
            );
        });
    });

    describe("getAllScrapingHistory", () => {
        it("should fetch all history without filters", async () => {
            const mockJobs = [
                { id: "1", status: "COMPLETED" },
                { id: "2", status: "FAILED" },
            ];
            prismaMock.scrapingJob.findMany.mockResolvedValue(mockJobs as unknown as ScrapingJob[]);

            const result = await getAllScrapingHistory();

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(prismaMock.scrapingJob.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { createdAt: "desc" },
                }),
            );
        });

        it("should apply status filters", async () => {
            prismaMock.scrapingJob.findMany.mockResolvedValue([]);

            await getAllScrapingHistory({ status: "FAILED" });

            expect(prismaMock.scrapingJob.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: "FAILED" }),
                }),
            );
        });
    });

    describe("triggerScrape", () => {
        it("should call worker URL with correct headers", async () => {
            const { triggerScrape } = await import("@/modules/scraping/actions/scrape.actions"); // Dynamic import to ensure mocks are applied if needed, or just import at top

            // Mock fetch
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, jobId: "job-123" }),
            });
            global.fetch = mockFetch;

            // Set env vars
            process.env.WORKER_URL = "http://worker";
            process.env.WORKER_SECRET = "secret";

            const result = await triggerScrape();

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                "http://worker/scrape",
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: "Bearer secret",
                    }),
                }),
            );
        });

        it("should retry on server error", async () => {
            const { triggerScrape } = await import("@/modules/scraping/actions/scrape.actions");
            const mockFetch = vi
                .fn()
                .mockRejectedValueOnce(new Error("Network error"))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, jobId: "job-retry" }),
                });
            global.fetch = mockFetch;

            process.env.WORKER_URL = "http://worker";
            process.env.WORKER_SECRET = "secret";

            const result = await triggerScrape();

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });
});
