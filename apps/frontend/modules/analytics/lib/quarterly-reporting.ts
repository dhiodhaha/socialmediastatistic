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

export interface QuarterlyCoverageAccount {
    instagram: string | null;
    tiktok: string | null;
    twitter: string | null;
    snapshots: Array<{
        platform: "INSTAGRAM" | "TIKTOK" | "TWITTER";
        scrapedAt: Date;
    }>;
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

export function buildQuarterlyStatus({
    year,
    quarter,
    jobs,
    accounts,
}: {
    year: number;
    quarter: number;
    jobs: QuarterlyJobReference[];
    accounts: QuarterlyCoverageAccount[];
}): QuarterlyStatus {
    const jobsByMonth = latestCompletedJobByMonth(jobs);
    const quarterMonths = quarterMonthStarts(year, quarter);
    const quarterEndMonth = quarterMonths[2];
    const baselineMonth = new Date(year, (quarter - 1) * 3 - 3, 1);

    const sourceMonths = quarterMonths.map((month) => {
        const key = monthKey(month);
        const job = jobsByMonth.get(key) || null;

        return {
            key,
            label: monthLabel(month),
            hasAnchor: !!job,
            anchorJobId: job?.id || null,
        };
    });

    const quarterEndKey = monthKey(quarterEndMonth);
    const quarterEndJob = jobsByMonth.get(quarterEndKey) || null;
    const baselineKey = monthKey(baselineMonth);
    const baselineJob = jobsByMonth.get(baselineKey) || null;

    let quarterEndCaptured = 0;
    let fullQuarterCaptured = 0;

    for (const account of accounts) {
        const accountPlatforms = [
            account.instagram ? "INSTAGRAM" : null,
            account.tiktok ? "TIKTOK" : null,
            account.twitter ? "TWITTER" : null,
        ].filter(Boolean);

        const hasQuarterEnd = account.snapshots.some(
            (snapshot) =>
                snapshot.scrapedAt >= quarterEndMonth &&
                monthKey(snapshot.scrapedAt) === quarterEndKey &&
                accountPlatforms.includes(snapshot.platform),
        );

        if (hasQuarterEnd) {
            quarterEndCaptured++;
        }

        const monthsCovered = new Set(
            account.snapshots
                .filter((snapshot) => accountPlatforms.includes(snapshot.platform))
                .map((snapshot) => monthKey(snapshot.scrapedAt)),
        );

        if (quarterMonths.every((month) => monthsCovered.has(monthKey(month)))) {
            fullQuarterCaptured++;
        }
    }

    const missingMonths = sourceMonths.filter((month) => !month.hasAnchor);
    const warnings: string[] = [];

    if (missingMonths.length > 0) {
        warnings.push(
            `Missing supporting month snapshots: ${missingMonths
                .map((month) => month.label)
                .join(", ")}.`,
        );
    }

    if (!baselineJob) {
        warnings.push(
            `Previous quarter baseline unavailable for ${monthLabel(baselineMonth)}. Quarter-over-quarter comparison will degrade gracefully.`,
        );
    }

    return {
        selectedYear: year,
        selectedQuarter: quarter,
        sourceMonths,
        quarterEnd: {
            key: quarterEndKey,
            label: monthLabel(quarterEndMonth),
            hasAnchor: !!quarterEndJob,
            anchorJobId: quarterEndJob?.id || null,
        },
        baseline: {
            key: baselineKey,
            label: monthLabel(baselineMonth),
            hasAnchor: !!baselineJob,
            anchorJobId: baselineJob?.id || null,
        },
        availability: quarterEndJob
            ? {
                  isAvailable: true,
                  reason: "Quarter available for review",
              }
            : {
                  isAvailable: false,
                  reason: `Quarter unavailable: missing quarter-end snapshot for ${monthLabel(
                      quarterEndMonth,
                  )}.`,
              },
        coverage: {
            quarterEndCaptured,
            fullQuarterCaptured,
            totalAccounts: accounts.length,
        },
        warnings,
    };
}
