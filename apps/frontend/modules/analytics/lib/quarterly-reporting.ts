import { format } from "date-fns";
import { resolveMonthlyReportingAnchors } from "@/modules/analytics/lib/monthly-reporting";

export interface QuarterlyJobReference {
    id: string;
    createdAt: Date;
    completedAt: Date | null;
    reportingYear?: number | null;
    reportingMonth?: number | null;
}

interface QuarterlyResolvedAnchor extends QuarterlyJobReference {
    reportingYear: number;
    reportingMonth: number;
    source: "manual" | "inferred";
    sourceLabel: string;
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
        source: "manual" | "inferred" | null;
        sourceLabel: string | null;
    }>;
    quarterEnd: {
        key: string;
        label: string;
        hasAnchor: boolean;
        anchorJobId: string | null;
        source: "manual" | "inferred" | null;
        sourceLabel: string | null;
    };
    baseline: {
        key: string;
        label: string;
        hasAnchor: boolean;
        anchorJobId: string | null;
        source: "manual" | "inferred" | null;
        sourceLabel: string | null;
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
        jobId?: string | null;
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
    const map = new Map<string, QuarterlyResolvedAnchor>();

    for (const anchor of resolveMonthlyReportingAnchors(jobs)) {
        map.set(reportingPeriodKey(anchor.reportingYear, anchor.reportingMonth), {
            id: anchor.id,
            createdAt: anchor.createdAt,
            completedAt: anchor.completedAt,
            reportingYear: anchor.reportingYear,
            reportingMonth: anchor.reportingMonth,
            source: anchor.source,
            sourceLabel: anchor.sourceLabel,
        });
    }

    return map;
}

function reportingPeriodKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, "0")}`;
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
        new Set(Array.from(jobsByMonth.values()).map((job) => job.reportingYear)),
    ).sort((a, b) => b - a);

    return years.flatMap((year) =>
        [1, 2, 3, 4].map((quarter) => buildQuarterOption(year, quarter, jobsByMonth)),
    );
}

export function getQuarterlyAnchorJobIds({
    year,
    quarter,
    jobs,
}: {
    year: number;
    quarter: number;
    jobs: QuarterlyJobReference[];
}) {
    const jobsByMonth = latestCompletedJobByMonth(jobs);

    return quarterMonthStarts(year, quarter)
        .map((month) => jobsByMonth.get(monthKey(month))?.id || null)
        .filter((jobId): jobId is string => !!jobId);
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
    const baselineMonth = quarterMonths[0];
    const quarterEndMonth = quarterMonths[2];

    const sourceMonths = quarterMonths.map((month) => {
        const key = monthKey(month);
        const job = jobsByMonth.get(key) || null;

        return {
            key,
            label: monthLabel(month),
            hasAnchor: !!job,
            anchorJobId: job?.id || null,
            source: job?.source || null,
            sourceLabel: job?.sourceLabel || null,
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
        ].filter((platform): platform is "INSTAGRAM" | "TIKTOK" | "TWITTER" => !!platform);

        const hasQuarterEnd = account.snapshots.some((snapshot) =>
            snapshotMatchesAnchor(snapshot, {
                key: quarterEndKey,
                anchorJobId: quarterEndJob?.id || null,
                accountPlatforms,
            }),
        );

        if (hasQuarterEnd) {
            quarterEndCaptured++;
        }

        const monthsCovered = new Set<string>();
        for (const month of sourceMonths) {
            const hasMonthSnapshot = account.snapshots.some((snapshot) =>
                snapshotMatchesAnchor(snapshot, {
                    key: month.key,
                    anchorJobId: month.anchorJobId,
                    accountPlatforms,
                }),
            );

            if (hasMonthSnapshot) {
                monthsCovered.add(month.key);
            }
        }

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
            `Quarter-start baseline unavailable for ${monthLabel(baselineMonth)}. Within-quarter growth comparison will degrade gracefully.`,
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
            source: quarterEndJob?.source || null,
            sourceLabel: quarterEndJob?.sourceLabel || null,
        },
        baseline: {
            key: baselineKey,
            label: monthLabel(baselineMonth),
            hasAnchor: !!baselineJob,
            anchorJobId: baselineJob?.id || null,
            source: baselineJob?.source || null,
            sourceLabel: baselineJob?.sourceLabel || null,
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

function snapshotMatchesAnchor(
    snapshot: QuarterlyCoverageAccount["snapshots"][number],
    {
        key,
        anchorJobId,
        accountPlatforms,
    }: {
        key: string;
        anchorJobId: string | null;
        accountPlatforms: Array<"INSTAGRAM" | "TIKTOK" | "TWITTER">;
    },
) {
    if (!accountPlatforms.includes(snapshot.platform)) {
        return false;
    }

    if (anchorJobId && snapshot.jobId === anchorJobId) {
        return true;
    }

    return monthKey(snapshot.scrapedAt) === key;
}
