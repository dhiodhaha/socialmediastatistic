import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetMocks } from "@/test/utils";
import { prepareIndividualQuarterlyReportDraft } from "./individual-report.actions";

vi.mock("@/shared/lib/auth", () => ({
    auth: vi.fn(async () => ({ user: { id: "user-1" } })),
}));

describe("individual report actions", () => {
    beforeEach(() => {
        resetMocks();
    });

    it("prepares an objective draft from stored monthly snapshots", async () => {
        prismaMock.account.findUnique.mockResolvedValue({
            id: "acc-1",
            username: "Kementerian Pendidikan",
            instagram: "kemdikbud",
            tiktok: null,
            twitter: null,
            snapshots: [
                {
                    followers: 130,
                    posts: 13,
                    likes: null,
                    scrapedAt: new Date("2026-03-31T10:00:00.000Z"),
                },
                {
                    followers: 100,
                    posts: 10,
                    likes: null,
                    scrapedAt: new Date("2026-01-31T10:00:00.000Z"),
                },
            ],
        } as never);

        const result = await prepareIndividualQuarterlyReportDraft({
            accountId: "acc-1",
            platform: "INSTAGRAM",
            year: 2026,
            quarter: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.creditEstimate.totalCredits).toBe(10);
            expect(result.data.report.sections[0]).toMatchObject({
                id: "official-snapshot-summary",
                status: "ready",
            });
            expect(result.data.contentLevelPlan.enrichment).toMatchObject({
                mode: "selected-subset",
                maxItems: 6,
            });
            expect(result.data.executionModel.liveScrapingEnabled).toBe(false);
        }
    });

    it("rejects accounts without the selected platform handle", async () => {
        prismaMock.account.findUnique.mockResolvedValue({
            id: "acc-1",
            username: "Kementerian Pendidikan",
            instagram: null,
            tiktok: null,
            twitter: null,
            snapshots: [],
        } as never);

        const result = await prepareIndividualQuarterlyReportDraft({
            accountId: "acc-1",
            platform: "INSTAGRAM",
            year: 2026,
            quarter: 1,
        });

        expect(result).toEqual({
            success: false,
            error: "Account does not have this platform handle.",
        });
    });
});
