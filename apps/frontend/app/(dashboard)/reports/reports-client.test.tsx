import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/analytics/actions/report.actions", () => ({
    getComparisonData: vi.fn(),
    exportComparisonPdfV2: vi.fn(),
    exportLatestPdf: vi.fn(),
}));

import { ReportsClient } from "./reports-client";

describe("ReportsClient", () => {
    const initialJobs = [
        {
            id: "job-apr",
            createdAt: "2026-04-01T00:00:00.000Z",
        },
        {
            id: "job-mar",
            createdAt: "2026-03-01T00:00:00.000Z",
        },
    ];

    const initialCategories = [{ id: "cat-1", name: "Kementerian" }];

    it("shows monthly mode by default and switches to quarterly shell", () => {
        render(<ReportsClient initialJobs={initialJobs} initialCategories={initialCategories} />);

        expect(screen.getByRole("heading", { name: "Laporan Bulanan" })).toBeTruthy();
        expect(screen.getByText("Compare month-end snapshots")).toBeTruthy();

        fireEvent.click(
            screen.getByRole("button", { name: /quarterlyprepare quarter-based reports/i }),
        );

        expect(screen.getByRole("heading", { name: "Laporan Triwulanan" })).toBeTruthy();
        expect(
            screen.getByText(
                "Quarterly shell active. Quarter derivation and export land in the next slices.",
            ),
        ).toBeTruthy();
        expect(screen.getByText("Prepare quarter-based reports")).toBeTruthy();
    });

    it("can switch back to monthly mode without regressing the header", () => {
        render(<ReportsClient initialJobs={initialJobs} initialCategories={initialCategories} />);

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
});
