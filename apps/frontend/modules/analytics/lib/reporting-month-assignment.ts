import { format } from "date-fns";

export interface ReportingMonthAssignmentJob {
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    createdAt: Date;
    completedAt: Date | null;
    reportingYear?: number | null;
    reportingMonth?: number | null;
}

export interface ReportingPeriod {
    year: number;
    month: number;
}

export interface ReportingPeriodOption extends ReportingPeriod {
    key: string;
    label: string;
}
export function reportingMonthKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatReportingPeriodLabel(year: number, month: number) {
    return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function inferReportingPeriod(referenceDate: Date): ReportingPeriod {
    return {
        year: referenceDate.getFullYear(),
        month: referenceDate.getMonth() + 1,
    };
}

export function getAssignableReportingPeriods(referenceDate: Date): ReportingPeriodOption[] {
    const current = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const previous = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);

    return [current, previous].map((date) => {
        const period = inferReportingPeriod(date);

        return {
            ...period,
            key: reportingMonthKey(period.year, period.month),
            label: formatReportingPeriodLabel(period.year, period.month),
        };
    });
}

export function resolveAssignmentReferenceDate(job: ReportingMonthAssignmentJob) {
    return job.completedAt || job.createdAt;
}

export function getAssignedReportingPeriod(
    job: ReportingMonthAssignmentJob,
): ReportingPeriod | null {
    if (!job.reportingYear || !job.reportingMonth) {
        return null;
    }

    return {
        year: job.reportingYear,
        month: job.reportingMonth,
    };
}

export function validateReportingMonthAssignment(
    job: ReportingMonthAssignmentJob,
    reportingYear: number,
    reportingMonth: number,
    reason: string,
) {
    if (job.status !== "COMPLETED" || !job.completedAt) {
        return {
            valid: false as const,
            error: "Only completed jobs can be assigned to a reporting month.",
        };
    }

    if (reportingMonth < 1 || reportingMonth > 12) {
        return {
            valid: false as const,
            error: "Reporting month must be between 1 and 12.",
        };
    }

    if (!reason.trim()) {
        return {
            valid: false as const,
            error: "A short reason is required for manual reporting month assignment.",
        };
    }

    const allowedPeriods = getAssignableReportingPeriods(resolveAssignmentReferenceDate(job));
    const matchesAllowedPeriod = allowedPeriods.some(
        (period) => period.year === reportingYear && period.month === reportingMonth,
    );

    if (!matchesAllowedPeriod) {
        return {
            valid: false as const,
            error: "Reporting month must be the same month or the previous month.",
        };
    }

    return { valid: true as const };
}

export function describeReportingAssignment(job: ReportingMonthAssignmentJob) {
    const assignedPeriod = getAssignedReportingPeriod(job);

    if (assignedPeriod) {
        return {
            label: formatReportingPeriodLabel(assignedPeriod.year, assignedPeriod.month),
            source: "manual" as const,
        };
    }

    const inferredPeriod = inferReportingPeriod(resolveAssignmentReferenceDate(job));

    return {
        label: formatReportingPeriodLabel(inferredPeriod.year, inferredPeriod.month),
        source: "inferred" as const,
    };
}
