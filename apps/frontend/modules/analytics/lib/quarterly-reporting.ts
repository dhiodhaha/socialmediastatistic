import { format } from "date-fns";

export interface QuarterlyJobReference {
    id: string;
    createdAt: Date;
    completedAt: Date | null;
}

export interface QuarterlyOption {
    id: string;
    year: number;
    quarter: number;
    label: string;
    desc: string;
    disabled: boolean;
}

export interface QuarterlyStatus {
    selectedYear: number;
    selectedQuarter: number;
    sourceMonths: Array<{
        key: string;
        label: string;
        hasAnchor: boolean;
        anchorJobId: string | null;
    }>;
    quarterEnd: {
        key: string;
        label: string;
        hasAnchor: boolean;
        anchorJobId: string | null;
    };
    baseline: {
        key: string;
        label: string;
        hasAnchor: boolean;
        anchorJobId: string | null;
    };
    availability: {
        isAvailable: boolean;
        reason: string;
    };
    coverage: {
        quarterEndCaptured: number;
        fullQuarterCaptured: number;
        totalAccounts: number;
    };
    warnings: string[];
}

export function monthKey(date: Date) {
    return format(date, "yyyy-MM");
}

export function monthLabel(date: Date) {
    return format(date, "MMM yyyy");
}

export function quarterMonthStarts(year: number, quarter: number) {
    const startMonthIndex = (quarter - 1) * 3;
    return [0, 1, 2].map((offset) => new Date(year, startMonthIndex + offset, 1));
}

export function latestCompletedJobByMonth(jobs: QuarterlyJobReference[]) {
    const map = new Map<string, QuarterlyJobReference>();

    for (const job of jobs) {
        const referenceDate = job.completedAt || job.createdAt;
        const key = monthKey(referenceDate);
        const existing = map.get(key);

        if (
            !existing ||
            referenceDate.getTime() >
                ((existing.completedAt || existing.createdAt) as Date).getTime()
        ) {
            map.set(key, job);
        }
    }

    return map;
}

function buildQuarterOption(
    year: number,
    quarter: number,
    jobsByMonth: Map<string, QuarterlyJobReference>,
) {
    const quarterMonths = quarterMonthStarts(year, quarter);
    const quarterEndMonth = quarterMonths[2];
    const quarterEndKey = monthKey(quarterEndMonth);
    const hasQuarterEnd = jobsByMonth.has(quarterEndKey);
    const missingMonths = quarterMonths.filter((month) => !jobsByMonth.has(monthKey(month)));

    let desc = `${monthLabel(quarterMonths[0])} - ${monthLabel(quarterMonths[2])}`;
    if (!hasQuarterEnd) {
        desc = `Unavailable: missing quarter-end snapshot (${monthLabel(quarterEndMonth)})`;
    } else if (missingMonths.length > 0) {
        desc = `Available with warnings: missing ${missingMonths
            .map((month) => monthLabel(month))
            .join(", ")}`;
    }

    return {
        id: `${year}-Q${quarter}`,
        year,
        quarter,
        label: `Q${quarter} ${year}`,
        desc,
        disabled: !hasQuarterEnd,
    } satisfies QuarterlyOption;
}

export function deriveQuarterlyOptions(jobs: QuarterlyJobReference[]): QuarterlyOption[] {
    const jobsByMonth = latestCompletedJobByMonth(jobs);
    const years = Array.from(
        new Set(jobs.map((job) => (job.completedAt || job.createdAt).getFullYear())),
    ).sort((a, b) => b - a);

    return years.flatMap((year) =>
        [1, 2, 3, 4].map((quarter) => buildQuarterOption(year, quarter, jobsByMonth)),
    );
}
