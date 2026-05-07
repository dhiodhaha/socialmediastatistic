"use client";

import type { PortfolioPlatform as Platform } from "@repo/types";
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
    demoMode?: boolean;
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
    demoMode = false,
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
            toast.error(err instanceof Error ? err.message : "Ekspor gagal");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <section className="overflow-hidden rounded-3xl border border-zinc-950/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="p-6">
                    <div className="text-base/7 font-medium text-blue-600 sm:text-sm/6">
                        Perbandingan statistik
                    </div>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                        Cek perubahan antar kuartal
                    </h2>
                    <p className="mt-2 max-w-2xl text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                        Bandingkan statistik akun dari snapshot tersimpan. Jika baseline belum
                        tersedia, operator bisa menambahkan angka manual dengan catatan sumber.
                    </p>

                    <div className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <PeriodBadge label="Saat ini" value={`Q${quarter} ${year}`} />
                        <div className="hidden h-px bg-zinc-950/10 sm:block dark:bg-white/10" />
                        <PeriodBadge
                            label="Pembanding"
                            value={`Q${comparisonQuarter} ${comparisonYear}`}
                        />
                    </div>
                </div>

                <div className="border-t border-zinc-950/10 bg-zinc-50 p-6 lg:border-t-0 lg:border-l dark:border-white/10 dark:bg-zinc-950/40">
                    <div className="text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                        Atur pembanding
                    </div>
                    <div className="mt-4 grid gap-3">
                        <QuarterSelect
                            label="Tahun pembanding"
                            value={comparisonYear}
                            values={[currentYear, currentYear - 1, currentYear - 2]}
                            onChange={setComparisonYear}
                        />

                        <div className="space-y-2">
                            <div className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">
                                Kuartal pembanding
                            </div>
                            <Select value={comparisonQuarter} onValueChange={setComparisonQuarter}>
                                <SelectTrigger className="w-full bg-white dark:bg-zinc-900">
                                    <SelectValue placeholder="Pilih kuartal" />
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
                    </div>

                    <div className="mt-5 flex flex-col gap-2">
                        <Button type="button" onClick={handleLoadQuarterComparison}>
                            Cek Perbandingan
                        </Button>
                        {!demoMode && (
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
                                Ekspor PDF
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {!demoMode && (
                <div className="border-t border-zinc-950/10 p-6 dark:border-white/10">
                    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <div>
                            <div className="text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                                Baseline manual
                            </div>
                            <p className="mt-1 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                                Opsional. Isi hanya jika data snapshot belum tersedia dari scraping.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">
                                        Target baseline
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
                                        <SelectTrigger className="w-full bg-white dark:bg-zinc-900">
                                            <SelectValue placeholder="Pilih target" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="comparison">
                                                Pembanding Q{comparisonQuarter} {comparisonYear}
                                            </SelectItem>
                                            <SelectItem value="current">
                                                Saat ini Q{quarter} {year}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">
                                        Platform
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
                                        <SelectTrigger className="w-full bg-white dark:bg-zinc-900">
                                            <SelectValue placeholder="Pilih platform" />
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

                            <div className="grid gap-3 md:grid-cols-4">
                                <ManualNumberInput
                                    value={manualSnapshotForm.followers}
                                    placeholder="Pengikut (wajib)"
                                    onChange={(followers) =>
                                        setManualSnapshotForm((prev) => ({
                                            ...prev,
                                            followers,
                                        }))
                                    }
                                />
                                <ManualNumberInput
                                    value={manualSnapshotForm.posts}
                                    placeholder="Postingan (opsional)"
                                    onChange={(posts) =>
                                        setManualSnapshotForm((prev) => ({
                                            ...prev,
                                            posts,
                                        }))
                                    }
                                />
                                <ManualNumberInput
                                    value={manualSnapshotForm.likes}
                                    placeholder="Suka (opsional)"
                                    onChange={(likes) =>
                                        setManualSnapshotForm((prev) => ({
                                            ...prev,
                                            likes,
                                        }))
                                    }
                                />
                                <ManualNumberInput
                                    value={manualSnapshotForm.engagement}
                                    placeholder="Interaksi (opsional)"
                                    step="0.01"
                                    onChange={(engagement) =>
                                        setManualSnapshotForm((prev) => ({
                                            ...prev,
                                            engagement,
                                        }))
                                    }
                                />
                            </div>

                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
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
                                <Button
                                    type="button"
                                    onClick={handleSaveManualSnapshot}
                                    disabled={isPending || !manualSnapshotForm.followers}
                                >
                                    Simpan baseline
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {quarterComparison?.success && (
                <div className="grid gap-4 border-t border-zinc-950/10 p-6 lg:grid-cols-3 dark:border-white/10">
                    {quarterComparison.data.platforms.map((platform) => (
                        <QuarterComparisonCard key={platform.platform} comparison={platform} />
                    ))}
                </div>
            )}
            {quarterComparison && !quarterComparison.success && (
                <div className="border-t border-zinc-950/10 p-6 dark:border-white/10">
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                        {quarterComparison.error}
                    </div>
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
            <div className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">{label}</div>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full bg-white dark:bg-zinc-900">
                    <SelectValue placeholder="Pilih tahun" />
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

function PeriodBadge({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5 dark:bg-zinc-950 dark:ring-white/10">
            <div className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">{label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-zinc-950 dark:text-white">
                {value}
            </div>
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
                        Saat ini: {comparison.current.sourceLabel}
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
                        ? "Dapat dibandingkan"
                        : "Perlu data"}
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
                                    Saat ini {formatNullableNumber(metric.currentValue)} • Dasar{" "}
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
