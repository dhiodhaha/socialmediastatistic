import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/analytics/actions/report.actions", () => ({
    getComparisonData: vi.fn(),
    getQuarterlyOptions: vi.fn(),
    getQuarterlyStatus: vi.fn(),
    exportComparisonPdfV2: vi.fn(),
    exportLatestPdf: vi.fn(),
}));

import { ReportsClient } from "./reports-client";

describe("ReportsClient", () => {
    const initialJobs = [
        {
            id: "job-mar",
            createdAt: "2026-03-01T00:00:00.000Z",
        },
        {
            id: "job-feb",
            createdAt: "2026-02-01T00:00:00.000Z",
        },
    ];

    const initialCategories = [{ id: "cat-1", name: "Kementerian" }];
    const initialQuarterlyOptions = [
        {
            id: "2026-Q1",
            year: 2026,
            quarter: 1,
            label: "Q1 2026",
            desc: "Available with warnings: missing Feb 2026",
            disabled: false,
        },
        {
            id: "2026-Q2",
            year: 2026,
            quarter: 2,
            label: "Q2 2026",
            desc: "Unavailable: missing quarter-end snapshot (Jun 2026)",
            disabled: true,
        },
    ];

    it("shows monthly mode by default and switches to quarterly shell", () => {
        render(
            <ReportsClient
                initialJobs={initialJobs}
                initialQuarterlyOptions={initialQuarterlyOptions}
                initialCategories={initialCategories}
            />,
        );

        expect(screen.getByRole("heading", { name: "Laporan Bulanan" })).toBeTruthy();
        expect(screen.getByText("Compare month-end snapshots")).toBeTruthy();

        fireEvent.click(
            screen.getByRole("button", { name: /quarterlyprepare quarter-based reports/i }),
        );

        expect(screen.getByRole("heading", { name: "Laporan Triwulanan" })).toBeTruthy();
        expect(screen.getByText("Prepare quarter-based reports")).toBeTruthy();
    });

    it("can switch back to monthly mode without regressing the header", () => {
        render(
            <ReportsClient
                initialJobs={initialJobs}
                initialQuarterlyOptions={initialQuarterlyOptions}
                initialCategories={initialCategories}
            />,
        );

        fireEvent.click(
            screen.getByRole("button", { name: /quarterlyprepare quarter-based reports/i }),
        );
        fireEvent.click(
            screen.getByRole("button", { name: /monthlycompare month-end snapshots/i }),
        );

        expect(screen.getByRole("heading", { name: "Laporan Bulanan" })).toBeTruthy();
        expect(
            screen.getByText(
                "Monitoring performa akun resmi pemerintahan. Data diambil setiap akhir bulan.",
            ),
        ).toBeTruthy();
    });

    it("shows quarterly availability summary after reviewing a quarter", async () => {
        const { getQuarterlyStatus } = await import("@/modules/analytics/actions/report.actions");
        vi.mocked(getQuarterlyStatus).mockResolvedValue({
            selectedYear: 2026,
            selectedQuarter: 1,
            sourceMonths: [
                { key: "2026-01", label: "Jan 2026", hasAnchor: true, anchorJobId: "jan" },
                { key: "2026-02", label: "Feb 2026", hasAnchor: false, anchorJobId: null },
                { key: "2026-03", label: "Mar 2026", hasAnchor: true, anchorJobId: "mar" },
            ],
            quarterEnd: {
                key: "2026-03",
                label: "Mar 2026",
                hasAnchor: true,
                anchorJobId: "mar",
            },
            baseline: {
                key: "2025-12",
                label: "Dec 2025",
                hasAnchor: false,
                anchorJobId: null,
            },
            availability: {
                isAvailable: true,
                reason: "Quarter available for review",
            },
            coverage: {
                quarterEndCaptured: 9,
                fullQuarterCaptured: 6,
                totalAccounts: 10,
            },
            warnings: ["Missing supporting month snapshots: Feb 2026."],
        });

        render(
            <ReportsClient
                initialJobs={initialJobs}
                initialQuarterlyOptions={initialQuarterlyOptions}
                initialCategories={initialCategories}
            />,
        );

        fireEvent.click(
            screen.getByRole("button", { name: /quarterlyprepare quarter-based reports/i }),
        );
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "View Report" })).toBeTruthy();
            expect(
                screen.getByRole("button", { name: "View Report" }).hasAttribute("disabled"),
            ).toBe(false);
        });

        fireEvent.click(screen.getByRole("button", { name: "View Report" }));

        await waitFor(() => {
            expect(vi.mocked(getQuarterlyStatus)).toHaveBeenCalledWith(2026, 1, undefined);
        });

        expect(screen.getByText("Quarterly Review Status")).toBeTruthy();
        expect(screen.getByText("9/10")).toBeTruthy();
        expect(screen.getByText("6/10")).toBeTruthy();
        expect(screen.getByText("Dec 2025")).toBeTruthy();
    });
});
