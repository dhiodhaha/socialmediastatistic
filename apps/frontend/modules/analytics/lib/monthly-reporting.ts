import { format } from "date-fns";

export interface MonthlyReportingJobReference {
    id: string;
    createdAt: Date;
    completedAt: Date | null;
    reportingYear?: number | null;
    reportingMonth?: number | null;
    totalAccounts?: number;
}

export interface MonthlyReportingAnchor {
    id: string;
    label: string;
    sourceLabel: string;
    source: "manual" | "inferred";
    reportingYear: number;
    reportingMonth: number;
    createdAt: Date;
    completedAt: Date | null;
    totalAccounts?: number;
}

export function resolveMonthlyReportingAnchors(
    jobs: MonthlyReportingJobReference[],
): MonthlyReportingAnchor[] {
    const anchorsByMonth = new Map<string, MonthlyReportingAnchor>();

    for (const job of jobs) {
        const reportingSource =
            job.reportingYear && job.reportingMonth ? ("manual" as const) : ("inferred" as const);
        const referenceDate = job.completedAt || job.createdAt;
        const reportingDate = new Date(
            reportingSource === "manual" ? job.reportingYear! : referenceDate.getFullYear(),
            reportingSource === "manual" ? job.reportingMonth! - 1 : referenceDate.getMonth(),
            1,
        );

        const anchor: MonthlyReportingAnchor = {
            id: job.id,
            label: format(reportingDate, "MMMM yyyy"),
            sourceLabel:
                reportingSource === "manual"
                    ? "Manual reporting month"
                    : "Auto from completion month",
            source: reportingSource,
            reportingYear: reportingDate.getFullYear(),
            reportingMonth: reportingDate.getMonth() + 1,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
            totalAccounts: job.totalAccounts,
        };

        const existing = anchorsByMonth.get(anchor.label);
        if (!existing) {
            anchorsByMonth.set(anchor.label, anchor);
            continue;
        }

        if (existing.source === "inferred" && anchor.source === "manual") {
            anchorsByMonth.set(anchor.label, anchor);
            continue;
        }

        if (existing.source === anchor.source) {
            const existingReference = existing.completedAt || existing.createdAt;
            const currentReference = anchor.completedAt || anchor.createdAt;

            if (currentReference.getTime() > existingReference.getTime()) {
                anchorsByMonth.set(anchor.label, anchor);
            }
        }
    }

    return Array.from(anchorsByMonth.values()).sort((left, right) => {
        if (left.reportingYear !== right.reportingYear) {
            return right.reportingYear - left.reportingYear;
        }

        return right.reportingMonth - left.reportingMonth;
    });
}
