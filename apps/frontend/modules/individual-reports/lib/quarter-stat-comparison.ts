import type { Platform } from "@repo/database";

export interface QuarterSelection {
    year: number;
    quarter: number;
}

export interface SnapshotStatPoint {
    platform: Platform;
    followers: number;
    posts: number | null;
    likes: number | null;
    engagement: number | null;
    scrapedAt: Date;
    source: "SCRAPED" | "MANUAL";
    sourceNote: string | null;
}

export interface QuarterMetricComparison {
    label: string;
    currentValue: number | null;
    comparisonValue: number | null;
    absoluteDelta: number | null;
    percentDelta: number | null;
    reason: string | null;
}

export interface PlatformQuarterComparison {
    platform: Platform;
    current: {
        snapshot: SnapshotStatPoint | null;
        sourceLabel: string;
    };
    comparison: {
        snapshot: SnapshotStatPoint | null;
        sourceLabel: string;
    };
    metrics: QuarterMetricComparison[];
}

export interface IndividualQuarterComparison {
    account: {
        id: string;
        username: string;
    };
    current: QuarterSelection;
    comparison: QuarterSelection;
    platforms: PlatformQuarterComparison[];
    notes: string[];
}

export function previousQuarter(year: number, quarter: number): QuarterSelection {
    if (quarter <= 1) return { year: year - 1, quarter: 4 };
    return { year, quarter: quarter - 1 };
}

export function quarterBounds({ year, quarter }: QuarterSelection) {
    const startMonthIndex = (quarter - 1) * 3;
    return {
        start: new Date(year, startMonthIndex, 1, 0, 0, 0, 0),
        end: new Date(year, startMonthIndex + 3, 0, 23, 59, 59, 999),
    };
}

export function buildIndividualQuarterComparison(input: {
    account: { id: string; username: string };
    current: QuarterSelection;
    comparison: QuarterSelection;
    platforms: Platform[];
    currentSnapshots: SnapshotStatPoint[];
    comparisonSnapshots: SnapshotStatPoint[];
}): IndividualQuarterComparison {
    return {
        account: input.account,
        current: input.current,
        comparison: input.comparison,
        platforms: input.platforms.map((platform) => {
            const current = selectPreferredSnapshot(input.currentSnapshots, platform);
            const comparison = selectPreferredSnapshot(input.comparisonSnapshots, platform);

            return {
                platform,
                current: {
                    snapshot: current,
                    sourceLabel: sourceLabel(current),
                },
                comparison: {
                    snapshot: comparison,
                    sourceLabel: sourceLabel(comparison),
                },
                metrics: [
                    compareMetric(
                        "Pengikut",
                        current?.followers ?? null,
                        comparison?.followers ?? null,
                    ),
                    compareMetric("Postingan", current?.posts ?? null, comparison?.posts ?? null, {
                        missingReason: "Metrik postingan tidak tersedia pada salah satu snapshot.",
                    }),
                    compareInteractionMetric(current, comparison),
                ],
            };
        }),
        notes: [
            "Perbandingan menggunakan snapshot terbaru yang tersedia di masing-masing kuartal.",
            "Jika snapshot hasil scraping dan manual sama-sama tersedia, data hasil scraping dipakai sebagai sumber utama.",
            "Input manual hanya dipakai untuk kuartal/platform yang belum memiliki snapshot hasil scraping.",
        ],
    };
}

function selectPreferredSnapshot(snapshots: SnapshotStatPoint[], platform: Platform) {
    const platformSnapshots = snapshots.filter((snapshot) => snapshot.platform === platform);
    const scraped = latestByDate(
        platformSnapshots.filter((snapshot) => snapshot.source === "SCRAPED"),
    );
    if (scraped) return scraped;
    return latestByDate(platformSnapshots.filter((snapshot) => snapshot.source === "MANUAL"));
}

function latestByDate(snapshots: SnapshotStatPoint[]) {
    return [...snapshots].sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime())[0] ?? null;
}

function compareInteractionMetric(
    current: SnapshotStatPoint | null,
    comparison: SnapshotStatPoint | null,
): QuarterMetricComparison {
    if (current?.likes != null || comparison?.likes != null) {
        return compareMetric("Suka", current?.likes ?? null, comparison?.likes ?? null, {
            missingReason: "Metrik suka tidak tersedia pada salah satu snapshot.",
        });
    }

    if (current?.engagement != null || comparison?.engagement != null) {
        return compareMetric(
            "Interaksi",
            current?.engagement ?? null,
            comparison?.engagement ?? null,
            {
                missingReason: "Metrik interaksi tidak tersedia pada salah satu snapshot.",
            },
        );
    }

    return {
        label: "Interaksi",
        currentValue: null,
        comparisonValue: null,
        absoluteDelta: null,
        percentDelta: null,
        reason: "Metrik interaksi belum tersimpan untuk platform ini.",
    };
}

function compareMetric(
    label: string,
    currentValue: number | null,
    comparisonValue: number | null,
    options?: { missingReason?: string },
): QuarterMetricComparison {
    if (currentValue == null && comparisonValue == null) {
        return {
            label,
            currentValue,
            comparisonValue,
            absoluteDelta: null,
            percentDelta: null,
            reason: options?.missingReason ?? "Data tidak tersedia pada kedua kuartal.",
        };
    }

    if (currentValue == null) {
        return {
            label,
            currentValue,
            comparisonValue,
            absoluteDelta: null,
            percentDelta: null,
            reason: "Data kuartal berjalan tidak tersedia.",
        };
    }

    if (comparisonValue == null) {
        return {
            label,
            currentValue,
            comparisonValue,
            absoluteDelta: null,
            percentDelta: null,
            reason: "Data pembanding tidak tersedia.",
        };
    }

    const absoluteDelta = currentValue - comparisonValue;
    return {
        label,
        currentValue,
        comparisonValue,
        absoluteDelta,
        percentDelta: comparisonValue === 0 ? null : (absoluteDelta / comparisonValue) * 100,
        reason: comparisonValue === 0 ? "Baseline 0, persentase tidak dihitung." : null,
    };
}

function sourceLabel(snapshot: SnapshotStatPoint | null) {
    if (!snapshot) return "Belum ada snapshot untuk kuartal ini.";
    const date = snapshot.scrapedAt.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    const source = snapshot.source === "MANUAL" ? "Input manual" : "Snapshot scraping";
    return snapshot.sourceNote ? `${source} ${date}: ${snapshot.sourceNote}` : `${source} ${date}`;
}
