"use client";

import type { Platform } from "@repo/database";
import { Download, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
    createManualQuarterSnapshot,
    exportIndividualQuarterComparisonPdf,
    getIndividualQuarterComparison,
} from "@/modules/individual-reports/actions/individual-report.actions";
import { previousQuarter } from "@/modules/individual-reports/lib/quarter-stat-comparison";
import { Button } from "@/shared/components/catalyst/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import { buildReportPdfFilename } from "@/shared/lib/pdf-filename";

interface PlatformOption {
    id: Platform;
    label: string;
}

interface IndividualQuarterComparisonPanelProps {
    accountId: string;
    accountName: string | null;
    year: string;
    quarter: string;
    currentYear: number;
    availablePlatforms: PlatformOption[];
    selectedPlatforms: Set<Platform>;
}

type QuarterComparisonResult = Awaited<ReturnType<typeof getIndividualQuarterComparison>>;
type SuccessfulQuarterComparison = Extract<QuarterComparisonResult, { success: true }>;
type PlatformQuarterComparisonView = SuccessfulQuarterComparison["data"]["platforms"][number];

const QUARTER_OPTIONS = [1, 2, 3, 4];

const DEFAULT_MANUAL_SNAPSHOT_FORM = {
    target: "comparison" as "current" | "comparison",
    platform: "INSTAGRAM" as Platform,
    followers: "",
    posts: "",
    likes: "",
    engagement: "",
    sourceNote: "",
};

export function IndividualQuarterComparisonPanel({
    accountId,
    accountName,
    year,
    quarter,
    currentYear,
    availablePlatforms,
    selectedPlatforms,
}: IndividualQuarterComparisonPanelProps) {
    const initialComparison = previousQuarter(currentYear, 1);
    const [comparisonYear, setComparisonYear] = useState(String(initialComparison.year));
    const [comparisonQuarter, setComparisonQuarter] = useState(String(initialComparison.quarter));
    const [quarterComparison, setQuarterComparison] = useState<QuarterComparisonResult | null>(
        null,
    );
    const [manualSnapshotForm, setManualSnapshotForm] = useState(DEFAULT_MANUAL_SNAPSHOT_FORM);
    const [isExporting, setIsExporting] = useState(false);
    const [isPending, startTransition] = useTransition();

    const comparisonPlatforms =
        selectedPlatforms.size > 0
            ? Array.from(selectedPlatforms)
            : availablePlatforms.map((platform) => platform.id);

    useEffect(() => {
        const previous = previousQuarter(Number(year), Number(quarter));
        setComparisonYear(String(previous.year));
        setComparisonQuarter(String(previous.quarter));
        setQuarterComparison(null);
    }, [year, quarter]);

    useEffect(() => {
        if (availablePlatforms.length === 0) return;
        if (availablePlatforms.some((platform) => platform.id === manualSnapshotForm.platform)) {
            return;
        }
        setManualSnapshotForm((prev) => ({
            ...prev,
            platform: availablePlatforms[0].id,
        }));
    }, [availablePlatforms, manualSnapshotForm.platform]);

    const refreshQuarterComparison = async () => {
        const platforms = comparisonPlatforms;
        if (platforms.length === 0) {
            toast.error("Pilih minimal satu platform.");
            return null;
        }
        const result = await getIndividualQuarterComparison({
            accountId,
            current: { year: Number(year), quarter: Number(quarter) },
            comparison: { year: Number(comparisonYear), quarter: Number(comparisonQuarter) },
            platforms,
        });
        setQuarterComparison(result);
        return result;
    };

    const handleLoadQuarterComparison = () => {
        startTransition(async () => {
            const result = await refreshQuarterComparison();
            if (!result) return;
            if (result.success) toast.success("Perbandingan kuartal dimuat");
            else toast.error(result.error);
        });
    };

    const handleSaveManualSnapshot = () => {
        startTransition(async () => {
            const manualYear =
                manualSnapshotForm.target === "current" ? Number(year) : Number(comparisonYear);
            const manualQuarter =
                manualSnapshotForm.target === "current"
                    ? Number(quarter)
                    : Number(comparisonQuarter);
            const result = await createManualQuarterSnapshot({
                accountId,
                platform: manualSnapshotForm.platform,
                year: manualYear,
                quarter: manualQuarter,
                scrapedAt: quarterEndDate(manualYear, manualQuarter),
                followers: Number(manualSnapshotForm.followers),
                posts: optionalNumber(manualSnapshotForm.posts),
                likes: optionalNumber(manualSnapshotForm.likes),
                engagement: optionalNumber(manualSnapshotForm.engagement),
                sourceNote: manualSnapshotForm.sourceNote,
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            toast.success("Snapshot manual disimpan");
            setManualSnapshotForm(DEFAULT_MANUAL_SNAPSHOT_FORM);
            await refreshQuarterComparison();
        });
    };

    const handleExportQuarterComparison = async () => {
        const platforms = comparisonPlatforms;
        if (platforms.length === 0) {
            toast.error("Pilih minimal satu platform.");
            return;
        }

        setIsExporting(true);
        try {
            const result = await exportIndividualQuarterComparisonPdf({
                accountId,
                current: { year: Number(year), quarter: Number(quarter) },
                comparison: { year: Number(comparisonYear), quarter: Number(comparisonQuarter) },
                platforms,
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            triggerDownload(
                result.data,
                buildReportPdfFilename({
                    reportType: "Laporan Perbandingan Individu",
                    subject: accountName,
                    period: `Q${quarter} ${year}`,
                    comparisonPeriod: `Q${comparisonQuarter} ${comparisonYear}`,
                }),
            );
            toast.success("PDF perbandingan diekspor");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Export failed");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Statistik Quarter-to-Quarter
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-zinc-950 dark:text-white">
                        Q{quarter} {year} dibandingkan dengan Q{comparisonQuarter} {comparisonYear}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Menggunakan snapshot tersimpan. Jika data scraping belum ada, tambahkan
                        snapshot manual dengan label sumber.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" outline onClick={handleLoadQuarterComparison}>
                        Load Stats
                    </Button>
                    <Button
                        type="button"
                        outline
                        onClick={handleExportQuarterComparison}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                        ) : (
                            <Download className="h-4 w-4" data-slot="icon" />
                        )}
                        Export Q-to-Q PDF
                    </Button>
                </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
                <QuarterSelect
                    label="Pembanding Tahun"
                    value={comparisonYear}
                    values={[currentYear, currentYear - 1, currentYear - 2]}
                    onChange={setComparisonYear}
                />

                <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Pembanding Kuartal
                    </div>
                    <Select value={comparisonQuarter} onValueChange={setComparisonQuarter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose quarter" />
                        </SelectTrigger>
                        <SelectContent>
                            {QUARTER_OPTIONS.map((value) => (
                                <SelectItem key={value} value={String(value)}>
                                    Q{value}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Manual Target
                    </div>
                    <Select
                        value={manualSnapshotForm.target}
                        onValueChange={(value) =>
                            setManualSnapshotForm((prev) => ({
                                ...prev,
                                target: value as "current" | "comparison",
                            }))
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose target" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="comparison">
                                Pembanding Q{comparisonQuarter} {comparisonYear}
                            </SelectItem>
                            <SelectItem value="current">
                                Current Q{quarter} {year}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Manual Platform
                    </div>
                    <Select
                        value={manualSnapshotForm.platform}
                        onValueChange={(value) =>
                            setManualSnapshotForm((prev) => ({
                                ...prev,
                                platform: value as Platform,
                            }))
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose platform" />
                        </SelectTrigger>
                        <SelectContent>
                            {availablePlatforms.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-4">
                <ManualNumberInput
                    value={manualSnapshotForm.followers}
                    placeholder="Followers (required)"
                    onChange={(followers) =>
                        setManualSnapshotForm((prev) => ({
                            ...prev,
                            followers,
                        }))
                    }
                />
                <ManualNumberInput
                    value={manualSnapshotForm.posts}
                    placeholder="Posts (optional)"
                    onChange={(posts) =>
                        setManualSnapshotForm((prev) => ({
                            ...prev,
                            posts,
                        }))
                    }
                />
                <ManualNumberInput
                    value={manualSnapshotForm.likes}
                    placeholder="Likes (optional)"
                    onChange={(likes) =>
                        setManualSnapshotForm((prev) => ({
                            ...prev,
                            likes,
                        }))
                    }
                />
                <Button
                    type="button"
                    onClick={handleSaveManualSnapshot}
                    disabled={isPending || !manualSnapshotForm.followers}
                >
                    Simpan Snapshot Manual
                </Button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
                <ManualNumberInput
                    value={manualSnapshotForm.engagement}
                    placeholder="Engagement (optional)"
                    step="0.01"
                    onChange={(engagement) =>
                        setManualSnapshotForm((prev) => ({
                            ...prev,
                            engagement,
                        }))
                    }
                />
                <input
                    type="text"
                    value={manualSnapshotForm.sourceNote}
                    onChange={(event) =>
                        setManualSnapshotForm((prev) => ({
                            ...prev,
                            sourceNote: event.target.value,
                        }))
                    }
                    className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    placeholder="Catatan sumber manual, contoh: angka dari laporan internal Des 2025"
                />
            </div>

            {quarterComparison?.success && (
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {quarterComparison.data.platforms.map((platform) => (
                        <QuarterComparisonCard key={platform.platform} comparison={platform} />
                    ))}
                </div>
            )}
            {quarterComparison && !quarterComparison.success && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                    {quarterComparison.error}
                </div>
            )}
        </section>
    );
}

function QuarterSelect({
    label,
    value,
    values,
    onChange,
}: {
    label: string;
    value: string;
    values: number[];
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {label}
            </div>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose year" />
                </SelectTrigger>
                <SelectContent>
                    {values.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function ManualNumberInput({
    value,
    placeholder,
    step,
    onChange,
}: {
    value: string;
    placeholder: string;
    step?: string;
    onChange: (value: string) => void;
}) {
    return (
        <input
            type="number"
            min="0"
            step={step}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            placeholder={placeholder}
        />
    );
}

function QuarterComparisonCard({ comparison }: { comparison: PlatformQuarterComparisonView }) {
    return (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="font-semibold text-zinc-950 dark:text-white">
                        {platformDisplayName(comparison.platform)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                        Current: {comparison.current.sourceLabel}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                        Pembanding: {comparison.comparison.sourceLabel}
                    </div>
                </div>
                <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                        comparison.current.snapshot && comparison.comparison.snapshot
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                >
                    {comparison.current.snapshot && comparison.comparison.snapshot
                        ? "Comparable"
                        : "Need data"}
                </span>
            </div>

            <div className="mt-4 space-y-3">
                {comparison.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    {metric.label}
                                </div>
                                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Current {formatNullableNumber(metric.currentValue)} • Base{" "}
                                    {formatNullableNumber(metric.comparisonValue)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-zinc-950 dark:text-white">
                                    {formatDelta(metric.absoluteDelta)}
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {formatPercent(metric.percentDelta)}
                                </div>
                            </div>
                        </div>
                        {metric.reason && (
                            <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                {metric.reason}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function platformDisplayName(platform: Platform): string {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    return "Twitter / X";
}

function optionalNumber(value: string) {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function quarterEndDate(year: number, quarter: number) {
    const date = new Date(year, quarter * 3, 0, 12, 0, 0, 0);
    return date.toISOString();
}

function triggerDownload(base64: string, filename: string) {
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatNullableNumber(value: number | null) {
    if (value == null) return "Tidak tersedia";
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

function formatDelta(value: number | null) {
    if (value == null) return "Belum dapat dihitung";
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${formatNullableNumber(value)}`;
}

function formatPercent(value: number | null) {
    if (value == null) return "Persentase tidak dihitung";
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toLocaleString("id-ID", {
        maximumFractionDigits: 2,
    })}%`;
}
